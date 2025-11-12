import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import pick from 'lodash/pick';
import {
	Node,
	NodeConnectionTypes,
	NodeOperationError,
	assertParamIsBoolean,
	validateNodeParameters,
	assertParamIsString,
} from 'n8n-workflow';
import type {
	IDataObject,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeTypeDescription,
	MultiPartFormData,
	INodeExecutionData,
	IBinaryData,
	INodeProperties,
} from 'n8n-workflow';

import { cssVariables } from './constants';
import { validateAuth } from './GenericFunctions';
import { createPage } from './templates';
import { assertValidLoadPreviousSessionOption } from './types';

const CHAT_TRIGGER_PATH_IDENTIFIER = 'chat';
const allowFileUploadsOption: INodeProperties = {
	displayName: '允许文件上传',
	name: 'allowFileUploads',
	type: 'boolean',
	default: false,
	description: '是否允许在聊天中上传文件',
};
const allowedFileMimeTypeOption: INodeProperties = {
	displayName: '允许的文件 MIME 类型',
	name: 'allowedFilesMimeTypes',
	type: 'string',
	default: '*',
	placeholder: '例如 image/*, text/*, application/pdf',
	description:
		'允许上传的文件类型。逗号分隔的 <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types" target="_blank">MIME 类型</a>列表。',
};

const respondToWebhookResponseMode = {
	name: '使用「响应 Webhook」节点',
	value: 'responseNode',
	description: '在该节点中定义响应',
};

const lastNodeResponseMode = {
	name: '最后一个节点完成时',
	value: 'lastNode',
	description: '返回最后执行的节点的数据',
};

const streamingResponseMode = {
	name: '流式传输',
	value: 'streaming',
	description: '从指定节点（例如代理）流式传输响应',
};

const respondNodesResponseMode = {
	name: '使用响应节点',
	value: 'responseNodes',
	description: '使用「响应聊天」或「响应 Webhook」节点向聊天发送响应',
};

const commonOptionsFields: INodeProperties[] = [
	// CORS parameters are only valid for when chat is used in hosted or webhook mode
	{
		displayName: '允许的来源（CORS）',
		name: 'allowedOrigins',
		type: 'string',
		default: '*',
		description: '允许跨域非预检请求的 URL 列表（逗号分隔）。使用 *（默认）允许所有来源。',
		displayOptions: {
			show: {
				'/mode': ['hostedChat', 'webhook'],
			},
		},
	},
	{
		...allowFileUploadsOption,
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
	},
	{
		...allowedFileMimeTypeOption,
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
	},
	{
		displayName: '输入占位符',
		name: 'inputPlaceholder',
		type: 'string',
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
		default: '输入您的问题..',
		placeholder: '例如 在此输入您的消息',
		description: '在聊天输入框中显示的占位符文本',
	},
	{
		displayName: '加载之前的会话',
		name: 'loadPreviousSession',
		type: 'options',
		options: [
			{
				name: '关闭',
				value: 'notSupported',
				description: '关闭加载之前会话的消息',
			},
			{
				name: '从记忆加载',
				value: 'memory',
				description: '从记忆中加载会话消息',
			},
			{
				name: '手动加载',
				value: 'manually',
				description: '手动返回会话消息',
			},
		],
		default: 'notSupported',
		description: '是否启用加载之前会话的消息',
	},
	{
		displayName: '需要点击按钮开始聊天',
		name: 'showWelcomeScreen',
		type: 'boolean',
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
		default: false,
		description: '是否在聊天开始时显示欢迎屏幕',
	},
	{
		displayName: '开始对话按钮文本',
		name: 'getStarted',
		type: 'string',
		displayOptions: {
			show: {
				showWelcomeScreen: [true],
				'/mode': ['hostedChat'],
			},
		},
		default: '新对话',
		placeholder: '例如 新对话',
		description: '作为欢迎屏幕的一部分显示在聊天窗口中间',
	},
	{
		displayName: '副标题',
		name: 'subtitle',
		type: 'string',
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
		default: '开始聊天。我们随时为您提供帮助。',
		placeholder: '例如 我们随时为您服务',
		description: '显示在聊天顶部，标题下方',
	},
	{
		displayName: '标题',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
		default: '您好！👋',
		placeholder: '例如 欢迎',
		description: '显示在聊天顶部',
	},
	{
		displayName: '自定义聊天样式',
		name: 'customCss',
		type: 'string',
		typeOptions: {
			rows: 10,
			editor: 'cssEditor',
		},
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
		default: `
${cssVariables}

/* 您也可以覆盖任何类样式。在聊天界面中右键检查以查找要覆盖的类。 */
.chat-message {
	max-width: 50%;
}
`.trim(),
		description: '使用 CSS 覆盖公共聊天界面的默认样式',
	},
];

export class ChatTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: '聊天触发器',
		name: 'chatTrigger',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
		defaultVersion: 1.4,
		description: '当收到 n8n 生成的网络聊天消息时运行工作流',
		defaults: {
			name: '收到聊天消息时',
		},
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/',
					},
				],
			},
		},
		maxNodes: 1,
		inputs: `={{ (() => {
			if (!['hostedChat', 'webhook'].includes($parameter.mode)) {
				return [];
			}
			if ($parameter.options?.loadPreviousSession !== 'memory') {
				return [];
			}

			return [
				{
					displayName: '记忆',
					maxConnections: 1,
					type: '${NodeConnectionTypes.AiMemory}',
					required: true,
				}
			];
		 })() }}`,
		outputs: [NodeConnectionTypes.Main],
		// Note: credentials system has been removed
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter.options?.["responseMode"] || "lastNode" }}',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
				ndvHideMethod: true,
				ndvHideUrl: '={{ !$parameter.public }}',
			},
		],
		eventTriggerDescription: '等待您提交聊天消息',
		activationMessage: '您现在可以调用生产聊天 URL。',
		triggerPanel: false,
		properties: [
			/**
			 * @note If we change this property, also update it in ChatEmbedModal.vue
			 */
			{
				displayName: '公开聊天',
				name: 'public',
				type: 'boolean',
				default: false,
				description: '聊天是否应公开可用，或仅可通过手动聊天界面访问',
			},
			{
				displayName: '模式',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: '托管聊天',
						value: 'hostedChat',
						description: '在 n8n 提供的页面上聊天',
					},
					{
						name: '嵌入式聊天',
						value: 'webhook',
						description: '通过嵌入在其他页面中的小部件聊天，或通过调用 webhook',
					},
				],
				default: 'hostedChat',
				displayOptions: {
					show: {
						public: [true],
					},
				},
			},
			{
				displayName: '激活此工作流后，聊天将在上述 URL 上线。实时执行将显示在「执行」选项卡中',
				name: 'hostedChatNotice',
				type: 'notice',
				displayOptions: {
					show: {
						mode: ['hostedChat'],
						public: [true],
					},
				},
				default: '',
			},
			{
				displayName:
					'请按照<a href="https://www.npmjs.com/package/@n8n/chat" target="_blank">这里</a>的说明将聊天嵌入网页（或直接调用本节顶部的 webhook URL）。激活此工作流后，聊天将上线',
				name: 'embeddedChatNotice',
				type: 'notice',
				displayOptions: {
					show: {
						mode: ['webhook'],
						public: [true],
					},
				},
				default: '',
			},
			{
				displayName: '身份验证',
				name: 'authentication',
				type: 'options',
				displayOptions: {
					show: {
						public: [true],
					},
				},
				options: [
					{
						name: '基本身份验证',
						value: 'basicAuth',
						description: '简单的用户名和密码（所有用户使用相同的凭据）',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'n8n 用户认证',
						value: 'n8nUserAuth',
						description: '要求用户使用其 n8n 帐户登录',
					},
					{
						name: '无',
						value: 'none',
					},
				],
				default: 'none',
				description: '身份验证方式',
			},
			{
				displayName: '初始消息',
				name: 'initialMessages',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['hostedChat'],
						public: [true],
					},
				},
				typeOptions: {
					rows: 3,
				},
				default: '您好！👋\n我是 Nathan。今天我能为您提供什么帮助？',
				description: '在聊天开始时显示的默认消息，每行一条',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: '在 n8n Chat 中可用',
				name: 'availableInChat',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: '是否使代理在 n8n Chat 中可用',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.4 } }],
					},
				},
			},
			{
				displayName: '代理名称',
				name: 'agentName',
				type: 'string',
				default: '',
				noDataExpression: true,
				description: 'n8n Chat 上的代理名称',
				displayOptions: {
					show: {
						availableInChat: [true],
					},
				},
			},
			{
				displayName: '代理描述',
				name: 'agentDescription',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				noDataExpression: true,
				description: 'n8n Chat 上的代理描述',
				displayOptions: {
					show: {
						availableInChat: [true],
					},
				},
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						public: [false],
						'@version': [1, 1.1],
					},
				},
				placeholder: '添加字段',
				default: {},
				options: [allowFileUploadsOption, allowedFileMimeTypeOption],
			},
			// Options for versions 1.0 and 1.1 (without streaming)
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
						public: [true],
						'@version': [1, 1.1],
					},
				},
				placeholder: '添加字段',
				default: {},
				options: [
					...commonOptionsFields,
					{
						displayName: '响应模式',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, respondToWebhookResponseMode],
						default: 'lastNode',
						description: '何时以及如何响应 webhook',
					},
				],
			},
			// Options for version 1.2 (with streaming)
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
						public: [true],
						'@version': [1.2],
					},
				},
				placeholder: '添加字段',
				default: {},
				options: [
					...commonOptionsFields,
					{
						displayName: '响应模式',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, respondToWebhookResponseMode, streamingResponseMode],
						default: 'lastNode',
						description: '何时以及如何响应 webhook',
					},
				],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						public: [false],
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
				placeholder: '添加字段',
				default: {},
				options: [
					allowFileUploadsOption,
					allowedFileMimeTypeOption,
					{
						displayName: '响应模式',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, respondNodesResponseMode],
						default: 'lastNode',
						description: '何时以及如何响应聊天',
					},
				],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
						public: [true],
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
				placeholder: '添加字段',
				default: {},
				options: [
					...commonOptionsFields,
					{
						displayName: '响应模式',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, streamingResponseMode, respondToWebhookResponseMode],
						default: 'lastNode',
						description: '何时以及如何响应聊天',
						displayOptions: { show: { '/mode': ['webhook'] } },
					},
					{
						displayName: '响应模式',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, streamingResponseMode, respondNodesResponseMode],
						default: 'lastNode',
						description: '何时以及如何响应 webhook',
						displayOptions: { show: { '/mode': ['hostedChat'] } },
					},
				],
			},
		],
	};

	private async handleFormData(context: IWebhookFunctions) {
		const req = context.getRequestObject() as MultiPartFormData.Request;
		const options = context.getNodeParameter('options', {}) as IDataObject;
		const { data, files } = req.body;

		const returnItem: INodeExecutionData = {
			json: data,
		};

		if (files && Object.keys(files).length) {
			returnItem.json.files = [] as Array<Omit<IBinaryData, 'data'>>;
			returnItem.binary = {};

			const count = 0;
			for (const fileKey of Object.keys(files)) {
				const processedFiles: MultiPartFormData.File[] = [];
				if (Array.isArray(files[fileKey])) {
					processedFiles.push(...files[fileKey]);
				} else {
					processedFiles.push(files[fileKey]);
				}

				let fileIndex = 0;
				for (const file of processedFiles) {
					let binaryPropertyName = 'data';

					// Remove the '[]' suffix from the binaryPropertyName if it exists
					if (binaryPropertyName.endsWith('[]')) {
						binaryPropertyName = binaryPropertyName.slice(0, -2);
					}
					if (options.binaryPropertyName) {
						binaryPropertyName = `${options.binaryPropertyName.toString()}${count}`;
					}

					const binaryFile = await context.nodeHelpers.copyBinaryFile(
						file.filepath,
						file.originalFilename ?? file.newFilename,
						file.mimetype,
					);

					const binaryKey = `${binaryPropertyName}${fileIndex}`;

					const binaryInfo = {
						...pick(binaryFile, ['fileName', 'fileSize', 'fileType', 'mimeType', 'fileExtension']),
						binaryKey,
					};

					returnItem.binary = Object.assign(returnItem.binary ?? {}, {
						[`${binaryKey}`]: binaryFile,
					});
					returnItem.json.files = [
						...(returnItem.json.files as Array<Omit<IBinaryData, 'data'>>),
						binaryInfo,
					];
					fileIndex += 1;
				}
			}
		}

		return returnItem;
	}

	async webhook(ctx: IWebhookFunctions): Promise<IWebhookResponseData> {
		const res = ctx.getResponseObject();

		const isPublic = ctx.getNodeParameter('public', false);
		assertParamIsBoolean('public', isPublic, ctx.getNode());

		const nodeMode = ctx.getNodeParameter('mode', 'hostedChat');
		assertParamIsString('mode', nodeMode, ctx.getNode());

		if (!isPublic) {
			res.status(404).end();
			return {
				noWebhookResponse: true,
			};
		}

		const options = ctx.getNodeParameter('options', {});
		validateNodeParameters(
			options,
			{
				getStarted: { type: 'string' },
				inputPlaceholder: { type: 'string' },
				loadPreviousSession: { type: 'string' },
				showWelcomeScreen: { type: 'boolean' },
				subtitle: { type: 'string' },
				title: { type: 'string' },
				allowFileUploads: { type: 'boolean' },
				allowedFilesMimeTypes: { type: 'string' },
				customCss: { type: 'string' },
				responseMode: { type: 'string' },
			},
			ctx.getNode(),
		);

		const loadPreviousSession = options.loadPreviousSession;
		assertValidLoadPreviousSessionOption(loadPreviousSession, ctx.getNode());

		const enableStreaming = options.responseMode === 'streaming';

		const req = ctx.getRequestObject();
		const webhookName = ctx.getWebhookName();
		const mode = ctx.getMode() === 'manual' ? 'test' : 'production';
		const bodyData = ctx.getBodyData() ?? {};

		try {
			await validateAuth(ctx);
		} catch (error) {
			if (error) {
				res.writeHead((error as IDataObject).responseCode as number, {
					'www-authenticate': 'Basic realm="Webhook"',
				});
				res.end((error as IDataObject).message as string);
				return { noWebhookResponse: true };
			}
			throw error;
		}
		if (nodeMode === 'hostedChat') {
			// Show the chat on GET request
			if (webhookName === 'setup') {
				const webhookUrlRaw = ctx.getNodeWebhookUrl('default');
				if (!webhookUrlRaw) {
					throw new NodeOperationError(ctx.getNode(), '未设置默认 webhook URL');
				}

				const webhookUrl =
					mode === 'test' ? webhookUrlRaw.replace('/webhook', '/webhook-test') : webhookUrlRaw;
				const authentication = ctx.getNodeParameter('authentication') as
					| 'none'
					| 'basicAuth'
					| 'n8nUserAuth';
				const initialMessagesRaw = ctx.getNodeParameter('initialMessages', '');
				assertParamIsString('initialMessage', initialMessagesRaw, ctx.getNode());
				const instanceId = ctx.getInstanceId();

				const i18nConfig: Record<string, string> = {};
				const keys = ['getStarted', 'inputPlaceholder', 'subtitle', 'title'] as const;
				for (const key of keys) {
					if (options[key] !== undefined) {
						i18nConfig[key] = options[key];
					}
				}

				const page = createPage({
					i18n: {
						en: i18nConfig,
					},
					showWelcomeScreen: options.showWelcomeScreen,
					loadPreviousSession,
					initialMessages: initialMessagesRaw,
					webhookUrl,
					mode,
					instanceId,
					authentication,
					allowFileUploads: options.allowFileUploads,
					allowedFilesMimeTypes: options.allowedFilesMimeTypes,
					customCss: options.customCss,
					enableStreaming,
				});

				res.status(200).send(page).end();
				return {
					noWebhookResponse: true,
				};
			}
		}

		if (bodyData.action === 'loadPreviousSession') {
			if (options?.loadPreviousSession === 'memory') {
				const memory = (await ctx.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
					| BaseChatMemory
					| undefined;
				const messages = ((await memory?.chatHistory.getMessages()) ?? [])
					.filter((message) => !message?.additional_kwargs?.hideFromUI)
					.map((message) => message?.toJSON());
				return {
					webhookResponse: { data: messages },
				};
			} else if (!options?.loadPreviousSession || options?.loadPreviousSession === 'notSupported') {
				// If messages of a previous session should not be loaded, simply return an empty array
				return {
					webhookResponse: { data: [] },
				};
			}
		}

		let returnData: INodeExecutionData[];
		const webhookResponse: IDataObject = { status: 200 };

		// Handle streaming responses
		if (enableStreaming) {
			// Set up streaming response headers
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});

			// Flush headers immediately
			res.flushHeaders();

			if (req.contentType === 'multipart/form-data') {
				returnData = [await this.handleFormData(ctx)];
			} else {
				returnData = [{ json: bodyData }];
			}

			return {
				workflowData: [ctx.helpers.returnJsonArray(returnData)],
				noWebhookResponse: true,
			};
		}

		if (req.contentType === 'multipart/form-data') {
			returnData = [await this.handleFormData(ctx)];
			return {
				webhookResponse,
				workflowData: [returnData],
			};
		} else {
			returnData = [{ json: bodyData }];
		}

		return {
			webhookResponse,
			workflowData: [ctx.helpers.returnJsonArray(returnData)],
		};
	}
}
