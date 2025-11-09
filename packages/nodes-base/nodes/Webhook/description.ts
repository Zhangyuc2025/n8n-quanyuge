import type { INodeProperties, INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';

import { getResponseCode, getResponseData } from './utils';

export const defaultWebhookDescription: IWebhookDescription = {
	name: 'default',
	httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
	isFullPath: true,
	responseCode: `={{(${getResponseCode})($parameter)}}`,
	responseMode: '={{$parameter["responseMode"]}}',
	responseData: `={{(${getResponseData})($parameter)}}`,
	responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
	responseContentType: '={{$parameter["options"]["responseContentType"]}}',
	responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
	responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
	path: '={{$parameter["path"]}}',
};

export const credentialsProperty = (
	propertyName = 'authentication',
): INodeTypeDescription['credentials'] => [
	{
		name: 'httpBasicAuth',
		required: true,
		displayOptions: {
			show: {
				[propertyName]: ['basicAuth'],
			},
		},
	},
	{
		name: 'httpHeaderAuth',
		required: true,
		displayOptions: {
			show: {
				[propertyName]: ['headerAuth'],
			},
		},
	},
	{
		name: 'jwtAuth',
		required: true,
		displayOptions: {
			show: {
				[propertyName]: ['jwtAuth'],
			},
		},
	},
];

export const authenticationProperty = (propertyName = 'authentication'): INodeProperties => ({
	displayName: '身份验证',
	name: propertyName,
	type: 'options',
	options: [
		{
			name: '基本认证',
			value: 'basicAuth',
		},
		{
			name: 'Header 认证',
			value: 'headerAuth',
		},
		{
			name: 'JWT 认证',
			value: 'jwtAuth',
		},
		{
			name: '无',
			value: 'none',
		},
	],
	default: 'none',
	description: '身份验证方式',
});

export const httpMethodsProperty: INodeProperties = {
	displayName: 'HTTP 方法',
	name: 'httpMethod',
	type: 'options',
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
	default: 'GET',
	description: '要监听的 HTTP 方法',
};

export const responseCodeProperty: INodeProperties = {
	displayName: '响应代码',
	name: 'responseCode',
	type: 'number',
	displayOptions: {
		hide: {
			responseMode: ['responseNode'],
		},
	},
	typeOptions: {
		minValue: 100,
		maxValue: 599,
	},
	default: 200,
	description: '要返回的 HTTP 响应代码',
};

const responseModeOptions = [
	{
		name: '立即响应',
		value: 'onReceived',
		description: '此节点执行后立即响应',
	},
	{
		name: '最后一个节点完成时',
		value: 'lastNode',
		description: '返回最后执行的节点的数据',
	},
	{
		name: '使用"响应 Webhook"节点',
		value: 'responseNode',
		description: '在该节点中定义的响应',
	},
];

export const responseModeProperty: INodeProperties = {
	displayName: '响应方式',
	name: 'responseMode',
	type: 'options',
	options: responseModeOptions,
	default: 'onReceived',
	description: '何时以及如何响应 webhook',
	displayOptions: {
		show: {
			'@version': [1, 1.1, 2],
		},
	},
};

export const responseModePropertyStreaming: INodeProperties = {
	displayName: '响应方式',
	name: 'responseMode',
	type: 'options',
	options: [
		...responseModeOptions,
		{
			name: '流式传输',
			value: 'streaming',
			description: '从启用流式传输的节点实时返回数据',
		},
	],
	default: 'onReceived',
	description: '何时以及如何响应 webhook',
	displayOptions: {
		hide: {
			'@version': [1, 1.1, 2],
		},
	},
};

export const responseDataProperty: INodeProperties = {
	displayName: '响应数据',
	name: 'responseData',
	type: 'options',
	displayOptions: {
		show: {
			responseMode: ['lastNode'],
		},
	},
	options: [
		{
			name: '所有条目',
			value: 'allEntries',
			description: '返回最后一个节点的所有条目。始终返回数组',
		},
		{
			name: '第一个条目的 JSON',
			value: 'firstEntryJson',
			description: '返回最后一个节点第一个条目的 JSON 数据。始终返回 JSON 对象',
		},
		{
			name: '第一个条目的二进制',
			value: 'firstEntryBinary',
			description: '返回最后一个节点第一个条目的二进制数据。始终返回二进制文件',
		},
		{
			name: '无响应主体',
			value: 'noData',
			description: '返回时不带主体',
		},
	],
	default: 'firstEntryJson',
	description: '应返回什么数据。是应将所有项作为数组返回，还是仅将第一项作为对象返回',
};

export const responseBinaryPropertyNameProperty: INodeProperties = {
	displayName: '属性名称',
	name: 'responseBinaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	displayOptions: {
		show: {
			responseData: ['firstEntryBinary'],
		},
	},
	description: '要返回的二进制属性名称',
};

export const optionsProperty: INodeProperties = {
	displayName: '选项',
	name: 'options',
	type: 'collection',
	placeholder: '添加选项',
	default: {},
	options: [
		{
			displayName: 'Binary File',
			name: 'binaryData',
			type: 'boolean',
			displayOptions: {
				show: {
					'/httpMethod': ['PATCH', 'PUT', 'POST'],
					'@version': [1],
				},
			},
			default: false,
			description: 'Whether the webhook will receive binary data',
		},
		{
			displayName: 'Put Output File in Field',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				show: {
					binaryData: [true],
					'@version': [1],
				},
			},
			hint: 'The name of the output binary field to put the file in',
			description:
				'If the data gets received via "Form-Data Multipart" it will be the prefix and a number starting with 0 will be attached to it',
		},
		{
			displayName: 'Field Name for Binary Data',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				hide: {
					'@version': [1],
				},
			},
			description:
				'The name of the output field to put any binary file data in. Only relevant if binary data is received.',
		},
		{
			displayName: 'Ignore Bots',
			name: 'ignoreBots',
			type: 'boolean',
			default: false,
			description: 'Whether to ignore requests from bots like link previewers and web crawlers',
		},
		{
			displayName: 'IP(s) Whitelist',
			name: 'ipWhitelist',
			type: 'string',
			placeholder: 'e.g. 127.0.0.1',
			default: '',
			description: 'Comma-separated list of allowed IP addresses. Leave empty to allow all IPs.',
		},
		{
			displayName: 'No Response Body',
			name: 'noResponseBody',
			type: 'boolean',
			default: false,
			description: 'Whether to send any body in the response',
			displayOptions: {
				hide: {
					rawBody: [true],
				},
				show: {
					'/responseMode': ['onReceived'],
				},
			},
		},
		{
			displayName: 'Raw Body',
			name: 'rawBody',
			type: 'boolean',
			displayOptions: {
				show: {
					'@version': [1],
				},
				hide: {
					binaryData: [true],
					noResponseBody: [true],
				},
			},
			default: false,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description: 'Raw body (binary)',
		},
		{
			displayName: 'Raw Body',
			name: 'rawBody',
			type: 'boolean',
			displayOptions: {
				hide: {
					noResponseBody: [true],
					'@version': [1],
				},
			},
			default: false,
			description: 'Whether to return the raw body',
		},
		{
			displayName: 'Response Data',
			name: 'responseData',
			type: 'string',
			displayOptions: {
				show: {
					'/responseMode': ['onReceived'],
				},
				hide: {
					noResponseBody: [true],
				},
			},
			default: '',
			placeholder: 'success',
			description: 'Custom response data to send',
		},
		{
			displayName: 'Response Content-Type',
			name: 'responseContentType',
			type: 'string',
			displayOptions: {
				show: {
					'/responseData': ['firstEntryJson'],
					'/responseMode': ['lastNode'],
				},
			},
			default: '',
			placeholder: 'application/xml',
			// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
			description:
				'Set a custom content-type to return if another one as the "application/json" should be returned',
		},
		{
			displayName: 'Response Headers',
			name: 'responseHeaders',
			placeholder: 'Add Response Header',
			description: 'Add headers to the webhook response',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'entries',
					displayName: 'Entries',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							description: 'Name of the header',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value of the header',
						},
					],
				},
			],
		},
		{
			displayName: 'Property Name',
			name: 'responsePropertyName',
			type: 'string',
			displayOptions: {
				show: {
					'/responseData': ['firstEntryJson'],
					'/responseMode': ['lastNode'],
				},
			},
			default: 'data',
			description: 'Name of the property to return the data of instead of the whole JSON',
		},
	],
};

export const responseCodeSelector: INodeProperties = {
	displayName: 'Response Code',
	name: 'responseCode',
	type: 'options',
	options: [
		{ name: '200', value: 200, description: 'OK - Request has succeeded' },
		{ name: '201', value: 201, description: 'Created - Request has been fulfilled' },
		{ name: '204', value: 204, description: 'No Content - Request processed, no content returned' },
		{
			name: '301',
			value: 301,
			description: 'Moved Permanently - Requested resource moved permanently',
		},
		{ name: '302', value: 302, description: 'Found - Requested resource moved temporarily' },
		{ name: '304', value: 304, description: 'Not Modified - Resource has not been modified' },
		{ name: '400', value: 400, description: 'Bad Request - Request could not be understood' },
		{ name: '401', value: 401, description: 'Unauthorized - Request requires user authentication' },
		{
			name: '403',
			value: 403,
			description: 'Forbidden - Server understood, but refuses to fulfill',
		},
		{ name: '404', value: 404, description: 'Not Found - Server has not found a match' },
		{
			name: 'Custom Code',
			value: 'customCode',
			description: 'Write any HTTP code',
		},
	],
	default: 200,
	description: 'The HTTP response code to return',
};

export const responseCodeOption: INodeProperties = {
	displayName: 'Response Code',
	name: 'responseCode',
	placeholder: 'Add Response Code',
	type: 'fixedCollection',
	default: {
		values: {
			responseCode: 200,
		},
	},
	options: [
		{
			name: 'values',
			displayName: 'Values',
			values: [
				responseCodeSelector,
				{
					displayName: 'Code',
					name: 'customCode',
					type: 'number',
					default: 200,
					placeholder: 'e.g. 400',
					typeOptions: {
						minValue: 100,
					},
					displayOptions: {
						show: {
							responseCode: ['customCode'],
						},
					},
				},
			],
		},
	],
	displayOptions: {
		show: {
			'@version': [{ _cnd: { gte: 2 } }],
		},
		hide: {
			'/responseMode': ['responseNode'],
		},
	},
};
