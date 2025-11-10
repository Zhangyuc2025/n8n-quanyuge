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
			displayName: '二进制文件',
			name: 'binaryData',
			type: 'boolean',
			displayOptions: {
				show: {
					'/httpMethod': ['PATCH', 'PUT', 'POST'],
					'@version': [1],
				},
			},
			default: false,
			description: 'webhook 是否将接收二进制数据',
		},
		{
			displayName: '将输出文件放入字段',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				show: {
					binaryData: [true],
					'@version': [1],
				},
			},
			hint: '放置文件的输出二进制字段名称',
			description: '如果通过"表单数据多部分"接收数据，它将是前缀，并且将附加从 0 开始的数字',
		},
		{
			displayName: '二进制数据的字段名称',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				hide: {
					'@version': [1],
				},
			},
			description: '用于放置任何二进制文件数据的输出字段名称。仅在接收二进制数据时相关。',
		},
		{
			displayName: '忽略机器人',
			name: 'ignoreBots',
			type: 'boolean',
			default: false,
			description: '是否忽略来自链接预览器和网络爬虫等机器人的请求',
		},
		{
			displayName: 'IP 白名单',
			name: 'ipWhitelist',
			type: 'string',
			placeholder: 'e.g. 127.0.0.1',
			default: '',
			description: '允许的 IP 地址逗号分隔列表。留空则允许所有 IP。',
		},
		{
			displayName: '无响应正文',
			name: 'noResponseBody',
			type: 'boolean',
			default: false,
			description: '是否在响应中发送任何正文',
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
			displayName: '原始正文',
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
			description: '原始正文（二进制）',
		},
		{
			displayName: '原始正文',
			name: 'rawBody',
			type: 'boolean',
			displayOptions: {
				hide: {
					noResponseBody: [true],
					'@version': [1],
				},
			},
			default: false,
			description: '是否返回原始正文',
		},
		{
			displayName: '响应数据',
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
			description: '要发送的自定义响应数据',
		},
		{
			displayName: '响应内容类型',
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
			description: '如果应返回除"application/json"之外的内容类型，则设置要返回的自定义内容类型',
		},
		{
			displayName: '响应头',
			name: 'responseHeaders',
			placeholder: '添加响应头',
			description: '向 webhook 响应添加头部',
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
							description: '头部名称',
						},
						{
							displayName: '值',
							name: 'value',
							type: 'string',
							default: '',
							description: '头部值',
						},
					],
				},
			],
		},
		{
			displayName: '属性名称',
			name: 'responsePropertyName',
			type: 'string',
			displayOptions: {
				show: {
					'/responseData': ['firstEntryJson'],
					'/responseMode': ['lastNode'],
				},
			},
			default: 'data',
			description: '要返回其数据的属性名称，而不是整个 JSON',
		},
	],
};

export const responseCodeSelector: INodeProperties = {
	displayName: '响应代码',
	name: 'responseCode',
	type: 'options',
	options: [
		{ name: '200', value: 200, description: 'OK - 请求已成功' },
		{ name: '201', value: 201, description: 'Created - 请求已完成' },
		{ name: '204', value: 204, description: 'No Content - 请求已处理，未返回内容' },
		{
			name: '301',
			value: 301,
			description: 'Moved Permanently - 请求的资源已永久移动',
		},
		{ name: '302', value: 302, description: 'Found - 请求的资源已临时移动' },
		{ name: '304', value: 304, description: 'Not Modified - 资源未修改' },
		{ name: '400', value: 400, description: 'Bad Request - 请求无法理解' },
		{ name: '401', value: 401, description: 'Unauthorized - 请求需要用户身份验证' },
		{
			name: '403',
			value: 403,
			description: 'Forbidden - 服务器理解但拒绝执行',
		},
		{ name: '404', value: 404, description: 'Not Found - 服务器未找到匹配项' },
		{
			name: '自定义代码',
			value: 'customCode',
			description: '编写任何 HTTP 代码',
		},
	],
	default: 200,
	description: '要返回的 HTTP 响应代码',
};

export const responseCodeOption: INodeProperties = {
	displayName: '响应代码',
	name: 'responseCode',
	placeholder: '添加响应代码',
	type: 'fixedCollection',
	default: {
		values: {
			responseCode: 200,
		},
	},
	options: [
		{
			name: 'values',
			displayName: '值',
			values: [
				responseCodeSelector,
				{
					displayName: '代码',
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
