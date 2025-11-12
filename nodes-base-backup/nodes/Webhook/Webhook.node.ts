/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
import { createWriteStream } from 'fs';
import { rm, stat } from 'fs/promises';
import isbot from 'isbot';
import type {
	IWebhookFunctions,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookResponseData,
	MultiPartFormData,
	INodeProperties,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError, Node } from 'n8n-workflow';
import { pipeline } from 'stream/promises';
import { file as tmpFile } from 'tmp-promise';
import { v4 as uuid } from 'uuid';

import {
	authenticationProperty,
	credentialsProperty,
	defaultWebhookDescription,
	httpMethodsProperty,
	optionsProperty,
	responseBinaryPropertyNameProperty,
	responseCodeOption,
	responseCodeProperty,
	responseDataProperty,
	responseModeProperty,
	responseModePropertyStreaming,
} from './description';
import { WebhookAuthorizationError } from './error';
import {
	checkResponseModeConfiguration,
	configuredOutputs,
	isIpWhitelisted,
	setupOutputConnection,
	validateWebhookAuthentication,
} from './utils';

export class Webhook extends Node {
	authPropertyName = 'authentication';

	description: INodeTypeDescription = {
		displayName: 'Webhook',
		icon: { light: 'file:webhook.svg', dark: 'file:webhook.dark.svg' },
		name: 'webhook',
		group: ['trigger'],
		version: [1, 1.1, 2, 2.1],
		defaultVersion: 2.1,
		description: '当调用 webhook 时启动工作流',
		eventTriggerDescription: '等待您调用测试 URL',
		activationMessage: '现在您可以调用生产环境的 webhook URL',
		defaults: {
			name: 'Webhook',
		},
		supportsCORS: true,
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Webhook 有两种模式：测试和生产。<br /> <br /> <b>在构建工作流时使用测试模式</b>。点击"监听"按钮，然后向测试 URL 发送请求。执行将显示在编辑器中。<br /> <br /> <b>使用生产模式自动运行工作流</b>。<a data-key="activate">激活</a>工作流，然后向生产 URL 发送请求。这些执行将显示在执行列表中，但不会显示在编辑器中。',
				active:
					'Webhook 有两种模式：测试和生产。<br /> <br /> <b>在构建工作流时使用测试模式</b>。点击"监听"按钮，然后向测试 URL 发送请求。执行将显示在编辑器中。<br /> <br /> <b>使用生产模式自动运行工作流</b>。由于工作流已激活，您可以向生产 URL 发送请求。这些执行将显示在<a data-key="executions">执行列表</a>中，但不会显示在编辑器中。',
			},
			activationHint: '完成工作流构建后，使用生产 webhook URL 即可运行它，无需点击此按钮',
		},

		inputs: [],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		credentials: credentialsProperty(this.authPropertyName),
		webhooks: [defaultWebhookDescription],
		properties: [
			{
				displayName: '允许多种 HTTP 方法',
				name: 'multipleMethods',
				type: 'boolean',
				default: false,
				isNodeSetting: true,
				description: '是否允许 webhook 监听多种 HTTP 方法',
			},
			{
				...httpMethodsProperty,
				displayOptions: {
					show: {
						multipleMethods: [false],
					},
				},
			},
			{
				displayName: 'HTTP 方法',
				name: 'httpMethod',
				type: 'multiOptions',
				options: [
					{
						name: 'DELETE',
						value: 'DELETE',
					},
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'HEAD',
						value: 'HEAD',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
				],
				default: ['GET', 'POST'],
				description: '要监听的 HTTP 方法',
				displayOptions: {
					show: {
						multipleMethods: [true],
					},
				},
			},
			{
				displayName: '路径',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				description:
					"要监听的路径，可以使用 ':' 指定动态值，例如 'your-path/:dynamic-value'。如果设置了动态值，'webhookId' 将作为路径前缀",
			},
			authenticationProperty(this.authPropertyName),
			responseModeProperty,
			responseModePropertyStreaming,
			{
				displayName:
					'插入"响应 Webhook"节点以控制何时以及如何响应。<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">更多详情</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseMode: ['responseNode'],
					},
				},
				default: '',
			},
			{
				displayName:
					'插入支持流式传输的节点（例如"AI 智能体"）并启用流式传输，在工作流执行时直接流式传输到响应。<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">更多详情</a>',
				name: 'webhookStreamingNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseMode: ['streaming'],
					},
				},
				default: '',
			},
			{
				...responseCodeProperty,
				displayOptions: {
					show: {
						'@version': [1, 1.1],
					},
					hide: {
						responseMode: ['responseNode'],
					},
				},
			},
			responseDataProperty,
			responseBinaryPropertyNameProperty,
			{
				displayName: '如果您要发送响应，请添加具有适当值的"Content-Type"响应头以避免意外行为',
				name: 'contentTypeNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						responseMode: ['onReceived'],
					},
				},
			},

			{
				...optionsProperty,
				options: [...(optionsProperty.options as INodeProperties[]), responseCodeOption].sort(
					(a, b) => {
						const nameA = a.displayName.toUpperCase();
						const nameB = b.displayName.toUpperCase();
						if (nameA < nameB) return -1;
						if (nameA > nameB) return 1;
						return 0;
					},
				),
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const { typeVersion: nodeVersion, type: nodeType } = context.getNode();
		const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;

		if (nodeVersion >= 2 && nodeType === 'n8n-nodes-base.webhook') {
			checkResponseModeConfiguration(context);
		}

		const options = context.getNodeParameter('options', {}) as {
			binaryData: boolean;
			ignoreBots: boolean;
			rawBody: boolean;
			responseData?: string;
			ipWhitelist?: string;
		};
		const req = context.getRequestObject();
		const resp = context.getResponseObject();
		const requestMethod = context.getRequestObject().method;

		if (!isIpWhitelisted(options.ipWhitelist, req.ips, req.ip)) {
			resp.writeHead(403);
			resp.end('IP is not whitelisted to access the webhook!');
			return { noWebhookResponse: true };
		}

		let validationData: IDataObject | undefined;
		try {
			if (options.ignoreBots && isbot(req.headers['user-agent']))
				throw new WebhookAuthorizationError(403);
			validationData = await this.validateAuth(context);
		} catch (error) {
			if (error instanceof WebhookAuthorizationError) {
				resp.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm="Webhook"' });
				resp.end(error.message);
				return { noWebhookResponse: true };
			}
			throw error;
		}

		const prepareOutput = setupOutputConnection(context, requestMethod, {
			jwtPayload: validationData,
		});

		if (options.binaryData) {
			return await this.handleBinaryData(context, prepareOutput);
		}

		if (req.contentType === 'multipart/form-data') {
			return await this.handleFormData(context, prepareOutput);
		}

		if (nodeVersion > 1 && !req.body && !options.rawBody) {
			try {
				return await this.handleBinaryData(context, prepareOutput);
			} catch (error) {}
		}

		if (options.rawBody && !req.rawBody) {
			await req.readRawBody();
		}

		const response: INodeExecutionData = {
			json: {
				headers: req.headers,
				params: req.params,
				query: req.query,
				body: req.body,
			},
			binary: options.rawBody
				? {
						data: {
							data: (req.rawBody ?? '').toString(BINARY_ENCODING),
							mimeType: req.contentType ?? 'application/json',
						},
					}
				: undefined,
		};

		if (responseMode === 'streaming') {
			const res = context.getResponseObject();

			// Set up streaming response headers
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});

			// Flush headers immediately
			res.flushHeaders();

			return {
				noWebhookResponse: true,
				workflowData: prepareOutput(response),
			};
		}

		return {
			webhookResponse: options.responseData,
			workflowData: prepareOutput(response),
		};
	}

	private async validateAuth(context: IWebhookFunctions) {
		return await validateWebhookAuthentication(context, this.authPropertyName);
	}

	private async handleFormData(
		context: IWebhookFunctions,
		prepareOutput: (data: INodeExecutionData) => INodeExecutionData[][],
	) {
		const req = context.getRequestObject() as MultiPartFormData.Request;
		const options = context.getNodeParameter('options', {}) as IDataObject;
		const { data, files } = req.body;

		const returnItem: INodeExecutionData = {
			json: {
				headers: req.headers,
				params: req.params,
				query: req.query,
				body: data,
			},
		};

		if (files && Object.keys(files).length) {
			returnItem.binary = {};
		}

		let count = 0;

		for (const key of Object.keys(files)) {
			const processFiles: MultiPartFormData.File[] = [];
			let multiFile = false;
			if (Array.isArray(files[key])) {
				processFiles.push(...files[key]);
				multiFile = true;
			} else {
				processFiles.push(files[key]);
			}

			let fileCount = 0;
			for (const file of processFiles) {
				let binaryPropertyName = key;
				if (binaryPropertyName.endsWith('[]')) {
					binaryPropertyName = binaryPropertyName.slice(0, -2);
				}
				if (multiFile) {
					binaryPropertyName += fileCount++;
				}
				if (options.binaryPropertyName) {
					binaryPropertyName = `${options.binaryPropertyName}${count}`;
				}

				returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
					file.filepath,
					file.originalFilename ?? file.newFilename,
					file.mimetype,
				);

				// Delete original file to prevent tmp directory from growing too large
				await rm(file.filepath, { force: true });

				count += 1;
			}
		}

		return { workflowData: prepareOutput(returnItem) };
	}

	private async handleBinaryData(
		context: IWebhookFunctions,
		prepareOutput: (data: INodeExecutionData) => INodeExecutionData[][],
	): Promise<IWebhookResponseData> {
		const req = context.getRequestObject();
		const options = context.getNodeParameter('options', {}) as IDataObject;

		// TODO: create empty binaryData placeholder, stream into that path, and then finalize the binaryData
		const binaryFile = await tmpFile({ prefix: 'n8n-webhook-' });

		try {
			await pipeline(req, createWriteStream(binaryFile.path));

			const returnItem: INodeExecutionData = {
				json: {
					headers: req.headers,
					params: req.params,
					query: req.query,
					body: {},
				},
			};

			const stats = await stat(binaryFile.path);
			if (stats.size) {
				const binaryPropertyName = (options.binaryPropertyName ?? 'data') as string;
				const fileName = req.contentDisposition?.filename ?? uuid();
				const binaryData = await context.nodeHelpers.copyBinaryFile(
					binaryFile.path,
					fileName,
					req.contentType ?? 'application/octet-stream',
				);
				returnItem.binary = { [binaryPropertyName]: binaryData };
			}

			return { workflowData: prepareOutput(returnItem) };
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error as Error);
		} finally {
			await binaryFile.cleanup();
		}
	}
}
