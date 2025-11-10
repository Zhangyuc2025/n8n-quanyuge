import type { INodeProperties } from 'n8n-workflow';

export const specifyBySelector: INodeProperties = {
	displayName: '指定方式',
	name: 'specifyBy',
	type: 'options',
	options: [
		{
			name: '使用下面的字段',
			value: 'keypair',
		},
		{
			name: '使用下面的 JSON',
			value: 'json',
		},
		{
			name: '让模型指定整个请求体',
			value: 'model',
		},
	],
	default: 'keypair',
};

export const parametersCollection: INodeProperties = {
	displayName: '参数',
	name: 'parameters',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: '添加参数',
	default: {
		values: [
			{
				name: '',
			},
		],
	},
	options: [
		{
			name: 'values',
			displayName: '值',
			values: [
				{
					displayName: '名称',
					name: 'name',
					type: 'string',
					default: '',
				},
				{
					displayName: '值提供方式',
					name: 'valueProvider',
					type: 'options',
					options: [
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
							name: '由模型提供(必填)',
							value: 'modelRequired',
						},
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
							name: '由模型提供(可选)',
							value: 'modelOptional',
						},
						{
							name: '使用下面的字段',
							value: 'fieldValue',
						},
					],
					default: 'modelRequired',
				},
				{
					displayName: '值',
					name: 'value',
					type: 'string',
					default: '',
					hint: '使用 {占位符} 表示要由模型填充的任何数据',
					displayOptions: {
						show: {
							valueProvider: ['fieldValue'],
						},
					},
				},
			],
		},
	],
};
export const placeholderDefinitionsCollection: INodeProperties = {
	displayName: '占位符定义',
	name: 'placeholderDefinitions',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: '添加定义',
	default: [],
	options: [
		{
			name: 'values',
			displayName: '值',
			values: [
				{
					displayName: '占位符名称',
					name: 'name',
					type: 'string',
					default: '',
				},
				{
					displayName: '描述',
					name: 'description',
					type: 'string',
					default: '',
				},
				{
					displayName: '类型',
					name: 'type',
					type: 'options',
					// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
					options: [
						{
							name: '未指定(默认)',
							value: 'not specified',
						},
						{
							name: '字符串',
							value: 'string',
						},
						{
							name: '数字',
							value: 'number',
						},
						{
							name: '布尔值',
							value: 'boolean',
						},
						{
							name: 'JSON',
							value: 'json',
						},
					],
					default: 'not specified',
				},
			],
		},
	],
};

export const jsonInput: INodeProperties = {
	displayName: 'JSON',
	name: 'json',
	type: 'string',
	typeOptions: {
		rows: 5,
	},
	hint: '使用 {占位符} 表示要由模型填充的任何数据',
	default: '',
};

export const authenticationProperties: INodeProperties[] = [
	{
		displayName: '身份验证',
		name: 'authentication',
		description: '如果需要,选择要使用的身份验证类型,身份验证将由 n8n 完成,您的凭据不会与 LLM 共享',
		noDataExpression: true,
		type: 'options',
		options: [
			{
				name: '无',
				value: 'none',
			},
			{
				name: '预定义凭据类型',
				value: 'predefinedCredentialType',
				description: '我们已经为许多服务实现了身份验证,因此您无需手动设置',
			},
			{
				name: '通用凭据类型',
				value: 'genericCredentialType',
				description: '完全可自定义。在基本身份验证、标头、OAuth2 等之间选择。',
			},
		],
		default: 'none',
	},
	{
		displayName: '凭据类型',
		name: 'nodeCredentialType',
		type: 'credentialsSelect',
		noDataExpression: true,
		required: true,
		default: '',
		credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
		displayOptions: {
			show: {
				authentication: ['predefinedCredentialType'],
			},
		},
	},
	{
		displayName: '确保您已在凭据中为服务帐户指定了范围',
		name: 'googleApiWarning',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				nodeCredentialType: ['googleApi'],
			},
		},
	},
	{
		displayName: '通用身份验证类型',
		name: 'genericAuthType',
		type: 'credentialsSelect',
		required: true,
		default: '',
		credentialTypes: ['has:genericAuth'],
		displayOptions: {
			show: {
				authentication: ['genericCredentialType'],
			},
		},
	},
];

export const optimizeResponseProperties: INodeProperties[] = [
	{
		displayName: '优化响应',
		name: 'optimizeResponse',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: '是否优化工具响应以减少传递给 LLM 的数据量,这可能会带来更好的结果并降低成本',
	},
	{
		displayName: '预期响应类型',
		name: 'responseType',
		type: 'options',
		displayOptions: {
			show: {
				optimizeResponse: [true],
			},
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: '文本',
				value: 'text',
			},
		],
		default: 'json',
	},
	{
		displayName: '包含数据的字段',
		name: 'dataField',
		type: 'string',
		default: '',
		placeholder: '例如：records',
		description: '指定响应中包含数据的字段名称',
		hint: '留空以使用完整响应',
		requiresDataPath: 'single',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
	},
	{
		displayName: '包含字段',
		name: 'fieldsToInclude',
		type: 'options',
		description: '响应对象应包含哪些字段',
		default: 'all',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
		options: [
			{
				name: '全部',
				value: 'all',
				description: '包含所有字段',
			},
			{
				name: '选定的',
				value: 'selected',
				description: '仅包含下面指定的字段',
			},
			{
				name: '除外',
				value: 'except',
				description: '排除下面指定的字段',
			},
		],
	},
	{
		displayName: '字段',
		name: 'fields',
		type: 'string',
		default: '',
		placeholder: '例如：field1,field2',
		description: '字段名称的逗号分隔列表。支持点表示法。您可以从输入面板拖动选定的字段。',
		requiresDataPath: 'multiple',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
			hide: {
				fieldsToInclude: ['all'],
			},
		},
	},
	{
		displayName: '选择器 (CSS)',
		name: 'cssSelector',
		type: 'string',
		description: '在响应 HTML 中选择特定元素(例如 body)或所选类型的多个元素(例如 div)。',
		placeholder: '例如：body',
		default: 'body',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: '仅返回内容',
		name: 'onlyContent',
		type: 'boolean',
		default: false,
		description: '是否仅返回 HTML 元素的内容,去除 HTML 标签和属性',
		hint: '使用更少的令牌,模型可能更容易理解',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: '要省略的元素',
		name: 'elementsToOmit',
		type: 'string',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
				onlyContent: [true],
			},
		},
		default: '',
		placeholder: '例如：img, .className, #ItemId',
		description: '提取内容时将排除的选择器的逗号分隔列表',
	},
	{
		displayName: '截断响应',
		name: 'truncateResponse',
		type: 'boolean',
		default: false,
		hint: '有助于节省令牌',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
			},
		},
	},
	{
		displayName: '最大响应字符数',
		name: 'maxLength',
		type: 'number',
		default: 1000,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
				truncateResponse: [true],
			},
		},
	},
];
