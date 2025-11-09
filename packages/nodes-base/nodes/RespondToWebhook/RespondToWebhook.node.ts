import jwt from 'jsonwebtoken';
import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	jsonParse,
	NodeOperationError,
	NodeConnectionTypes,
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	WAIT_NODE_TYPE,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import type { Readable } from 'stream';

import { getBinaryResponse } from './utils/binary';
import { configuredOutputs } from './utils/outputs';
import { formatPrivateKey, generatePairedItemData } from '../../utils/utilities';

const respondWithProperty: INodeProperties = {
	displayName: '响应内容',
	name: 'respondWith',
	type: 'options',
	options: [
		{
			name: '所有输入项',
			value: 'allIncomingItems',
			description: '响应所有输入的 JSON 数据项',
		},
		{
			name: '二进制文件',
			value: 'binary',
			description: '响应输入的二进制文件数据',
		},
		{
			name: '第一个输入项',
			value: 'firstIncomingItem',
			description: '响应第一个输入的 JSON 数据项',
		},
		{
			name: 'JSON',
			value: 'json',
			description: '响应自定义 JSON 数据',
		},
		{
			name: 'JWT 令牌',
			value: 'jwt',
			description: '响应 JWT 令牌',
		},
		{
			name: '无数据',
			value: 'noData',
			description: '响应空内容',
		},
		{
			name: '重定向',
			value: 'redirect',
			description: '重定向到指定 URL',
		},
		{
			name: '文本',
			value: 'text',
			description: '响应简单的文本消息',
		},
	],
	default: 'firstIncomingItem',
	description: '应该返回的数据类型',
};

export class RespondToWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: '响应 Webhook',
		icon: { light: 'file:webhook.svg', dark: 'file:webhook.dark.svg' },
		name: 'respondToWebhook',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
		// Keep the default version at 1.4 until streaming is fully supported
		defaultVersion: 1.4,
		description: '向 Webhook 返回数据',
		defaults: {
			name: '响应 Webhook',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${configuredOutputs})($nodeVersion, $parameter)}}`,
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/',
					},
				],
				tutorialLinks: {
					documentation:
						'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/',
				},
			},
		},
		credentials: [
			{
				name: 'jwtAuth',
				required: true,
				displayOptions: {
					show: {
						respondWith: ['jwt'],
					},
				},
			},
		],
		properties: [
			{
				displayName: '启用响应输出分支',
				name: 'enableResponseOutput',
				type: 'boolean',
				default: false,
				description: '是否提供额外的输出分支，包含发送到 Webhook 的响应数据',
				isNodeSetting: true,
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.4 } }] } },
			},
			{
				displayName:
					'请确保 "Webhook" 节点的 "响应方式" 参数设置为 "使用响应 Webhook 节点"。<a href="{{documentation}}" target="_blank">了解更多',
				name: 'generalNotice',
				type: 'notice',
				default: '',
			},
			{
				...respondWithProperty,
				displayOptions: { show: { '@version': [1, 1.1] } },
			},
			{
				...respondWithProperty,
				noDataExpression: true,
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } },
			},
			{
				displayName: '凭据',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: {
					show: {
						respondWith: ['jwt'],
					},
				},
			},
			{
				displayName: '使用表达式时，请注意此节点仅对输入数据中的第一项运行',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						respondWith: ['json', 'text', 'jwt'],
					},
				},
				default: '',
			},
			{
				displayName: '重定向 URL',
				name: 'redirectURL',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						respondWith: ['redirect'],
					},
				},
				default: '',
				placeholder: '例如：http://www.n8n.io',
				description: '要重定向到的 URL 地址',
				validateType: 'url',
			},
			{
				displayName: '响应主体',
				name: 'responseBody',
				type: 'json',
				displayOptions: {
					show: {
						respondWith: ['json'],
					},
				},
				default: '{\n  "myField": "value"\n}',
				typeOptions: {
					rows: 4,
				},
				description: 'HTTP 响应的 JSON 数据',
			},
			{
				displayName: '载荷数据',
				name: 'payload',
				type: 'json',
				displayOptions: {
					show: {
						respondWith: ['jwt'],
					},
				},
				default: '{\n  "myField": "value"\n}',
				typeOptions: {
					rows: 4,
				},
				validateType: 'object',
				description: '要包含在 JWT 令牌中的数据载荷',
			},
			{
				displayName: '响应主体',
				name: 'responseBody',
				type: 'string',
				displayOptions: {
					show: {
						respondWith: ['text'],
					},
				},
				typeOptions: {
					rows: 2,
				},
				default: '',
				placeholder: '例如：工作流已完成',
				description: 'HTTP 响应的文本数据',
			},
			{
				displayName: '响应数据源',
				name: 'responseDataSource',
				type: 'options',
				displayOptions: {
					show: {
						respondWith: ['binary'],
					},
				},
				options: [
					{
						name: '从输入自动选择',
						value: 'automatically',
						description: '如果输入数据包含单个二进制数据时使用',
					},
					{
						name: '手动指定',
						value: 'set',
						description: '输入包含二进制数据的输入字段名称',
					},
				],
				default: 'automatically',
			},
			{
				displayName: '输入字段名称',
				name: 'inputFieldName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						respondWith: ['binary'],
						responseDataSource: ['set'],
					},
				},
				description: '包含二进制数据的节点输入字段名称',
			},
			{
				displayName: '为避免意外行为，请添加具有适当值的 "Content-Type" 响应头',
				name: 'contentTypeNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						respondWith: ['text'],
					},
				},
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '响应状态码',
						name: 'responseCode',
						type: 'number',
						typeOptions: {
							minValue: 100,
							maxValue: 599,
						},
						default: 200,
						description: '要返回的 HTTP 响应状态码。默认为 200。',
					},
					{
						displayName: '响应头',
						name: 'responseHeaders',
						placeholder: '添加响应头',
						description: '向 Webhook 响应添加 HTTP 头',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'entries',
								displayName: '条目',
								values: [
									{
										displayName: '名称',
										name: 'name',
										type: 'string',
										default: '',
										description: 'HTTP 头的名称',
									},
									{
										displayName: '值',
										name: 'value',
										type: 'string',
										default: '',
										description: 'HTTP 头的值',
									},
								],
							},
						],
					},
					{
						displayName: '将响应放入字段',
						name: 'responseKey',
						type: 'string',
						displayOptions: {
							show: {
								['/respondWith']: ['allIncomingItems', 'firstIncomingItem'],
							},
						},
						default: '',
						description: '要将所有项放入的响应字段名称',
						placeholder: '例如：data',
					},
					{
						displayName: '启用流式传输',
						name: 'enableStreaming',
						type: 'boolean',
						default: true,
						description: '是否启用流式传输响应',
						displayOptions: {
							show: {
								['/respondWith']: ['allIncomingItems', 'firstIncomingItem', 'text', 'json', 'jwt'],
								'@version': [{ _cnd: { gte: 1.5 } }],
							},
						},
					},
				],
			},
		],
	};

	async onMessage(
		context: IExecuteFunctions,
		_data: INodeExecutionData,
	): Promise<INodeExecutionData[][]> {
		const inputData = context.getInputData();
		return [inputData];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const nodeVersion = this.getNode().typeVersion;

		const WEBHOOK_NODE_TYPES = [
			WEBHOOK_NODE_TYPE,
			FORM_TRIGGER_NODE_TYPE,
			CHAT_TRIGGER_NODE_TYPE,
			WAIT_NODE_TYPE,
		];

		let response: IN8nHttpFullResponse;

		const connectedNodes = this.getParentNodes(this.getNode().name, {
			includeNodeParameters: true,
		});

		const options = this.getNodeParameter('options', 0, {});

		const shouldStream =
			nodeVersion >= 1.5 && this.isStreaming() && options.enableStreaming !== false;

		try {
			if (nodeVersion >= 1.1) {
				if (!connectedNodes.some(({ type }) => WEBHOOK_NODE_TYPES.includes(type))) {
					throw new NodeOperationError(this.getNode(), new Error('工作流中未找到 Webhook 节点'), {
						description:
							'请在工作流中插入 Webhook 节点，并将"响应方式"参数设置为"使用响应 Webhook 节点"',
					});
				}
			}

			const respondWith = this.getNodeParameter('respondWith', 0) as string;

			const headers = {} as IDataObject;
			if (options.responseHeaders) {
				for (const header of (options.responseHeaders as IDataObject).entries as IDataObject[]) {
					if (typeof header.name !== 'string') {
						header.name = header.name?.toString();
					}
					headers[header.name?.toLowerCase() as string] = header.value?.toString();
				}
			}

			let statusCode = (options.responseCode as number) || 200;
			let responseBody: IN8nHttpResponse | Readable;
			if (respondWith === 'json') {
				const responseBodyParameter = this.getNodeParameter('responseBody', 0) as string;
				if (responseBodyParameter) {
					if (typeof responseBodyParameter === 'object') {
						responseBody = responseBodyParameter;
					} else {
						try {
							responseBody = jsonParse(responseBodyParameter);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error as Error, {
								message: '"响应主体"字段中的 JSON 无效',
								description: '请检查"响应主体"参数中的 JSON 语法是否正确',
							});
						}
					}
				}

				if (shouldStream) {
					this.sendChunk('begin', 0);
					this.sendChunk('item', 0, responseBody as IDataObject);
					this.sendChunk('end', 0);
				}
			} else if (respondWith === 'jwt') {
				try {
					const { keyType, secret, algorithm, privateKey } = await this.getCredentials<{
						keyType: 'passphrase' | 'pemKey';
						privateKey: string;
						secret: string;
						algorithm: jwt.Algorithm;
					}>('jwtAuth');

					let secretOrPrivateKey;

					if (keyType === 'passphrase') {
						secretOrPrivateKey = secret;
					} else {
						secretOrPrivateKey = formatPrivateKey(privateKey);
					}
					const payload = this.getNodeParameter('payload', 0, {}) as IDataObject;
					const token = jwt.sign(payload, secretOrPrivateKey, { algorithm });
					responseBody = { token };

					if (shouldStream) {
						this.sendChunk('begin', 0);
						this.sendChunk('item', 0, responseBody as IDataObject);
						this.sendChunk('end', 0);
					}
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error as Error, {
						message: '签署 JWT 令牌时出错',
					});
				}
			} else if (respondWith === 'allIncomingItems') {
				const respondItems = items.map((item, index) => {
					this.sendChunk('begin', index);
					this.sendChunk('item', index, item.json);
					this.sendChunk('end', index);
					return item.json;
				});
				responseBody = options.responseKey
					? set({}, options.responseKey as string, respondItems)
					: respondItems;
			} else if (respondWith === 'firstIncomingItem') {
				responseBody = options.responseKey
					? set({}, options.responseKey as string, items[0].json)
					: items[0].json;
				if (shouldStream) {
					this.sendChunk('begin', 0);
					this.sendChunk('item', 0, items[0].json);
					this.sendChunk('end', 0);
				}
			} else if (respondWith === 'text') {
				const rawBody = this.getNodeParameter('responseBody', 0) as string;
				responseBody = rawBody;

				// Send the raw body to the stream
				if (shouldStream) {
					this.sendChunk('begin', 0);
					this.sendChunk('item', 0, rawBody);
					this.sendChunk('end', 0);
				}
			} else if (respondWith === 'binary') {
				const item = items[0];

				if (item.binary === undefined) {
					throw new NodeOperationError(this.getNode(), '第一个数据项中不存在二进制数据！');
				}

				let responseBinaryPropertyName: string;

				const responseDataSource = this.getNodeParameter('responseDataSource', 0) as string;

				if (responseDataSource === 'set') {
					responseBinaryPropertyName = this.getNodeParameter('inputFieldName', 0) as string;
				} else {
					const binaryKeys = Object.keys(item.binary);
					if (binaryKeys.length === 0) {
						throw new NodeOperationError(this.getNode(), '第一个数据项中不存在二进制数据！');
					}
					responseBinaryPropertyName = binaryKeys[0];
				}

				const binaryData = this.helpers.assertBinaryData(0, responseBinaryPropertyName);

				responseBody = getBinaryResponse(binaryData, headers);
			} else if (respondWith === 'redirect') {
				headers.location = this.getNodeParameter('redirectURL', 0) as string;
				statusCode = (options.responseCode as number) ?? 307;
			} else if (respondWith !== 'noData') {
				throw new NodeOperationError(this.getNode(), `不支持的响应数据选项 "${respondWith}"`);
			}

			const chatTrigger = connectedNodes.find(
				(node) => node.type === CHAT_TRIGGER_NODE_TYPE && !node.disabled,
			);

			const parameters = chatTrigger?.parameters as {
				options: { responseMode: string };
			};

			// if workflow is started from chat trigger and responseMode is set to "responseNodes"
			// response to chat will be send by ChatService
			if (
				chatTrigger &&
				!chatTrigger.disabled &&
				parameters.options.responseMode === 'responseNodes'
			) {
				let message = '';

				if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)) {
					message =
						(((responseBody as IDataObject).output ??
							(responseBody as IDataObject).text ??
							(responseBody as IDataObject).message) as string) ?? '';

					if (message === '' && Object.keys(responseBody).length > 0) {
						try {
							message = JSON.stringify(responseBody, null, 2);
						} catch (e) {}
					}
				}

				await this.putExecutionToWait(WAIT_INDEFINITELY);
				return [[{ json: {}, sendMessage: message }]];
			}

			response = {
				body: responseBody,
				headers,
				statusCode,
			};

			if (!shouldStream || respondWith === 'binary') {
				this.sendResponse(response);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				const itemData = generatePairedItemData(items.length);
				const returnData = this.helpers.constructExecutionMetaData(
					[{ json: { error: error.message } }],
					{ itemData },
				);
				return [returnData];
			}

			throw error;
		}

		if (nodeVersion === 1.3) {
			return [items, [{ json: { response } }]];
		} else if (nodeVersion >= 1.4 && this.getNodeParameter('enableResponseOutput', 0, false)) {
			return [items, [{ json: { response } }]];
		}

		return [items];
	}
}
