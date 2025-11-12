import type { INodeProperties } from 'n8n-workflow';

import { BrevoNode } from './GenericFunctions';

export const emailOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['email'],
			},
		},
		options: [
			{
				name: '发送',
				value: 'send',
				action: '发送事务性电子邮件',
			},
			{
				name: '发送模板',
				value: 'sendTemplate',
				action: '使用现有模板发送电子邮件',
			},
		],
		routing: {
			request: {
				method: 'POST',
				url: '/v3/smtp/email',
			},
		},
		default: 'send',
	},
];

const sendHtmlEmailFields: INodeProperties[] = [
	{
		displayName: '发送HTML',
		name: 'sendHTML',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: false,
	},
	{
		displayName: '主题',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		routing: {
			send: {
				property: 'subject',
				type: 'body',
			},
		},
		default: '',
		description: '电子邮件的主题',
	},
	{
		displayName: '文本内容',
		name: 'textContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				sendHTML: [false],
			},
		},
		routing: {
			send: {
				property: 'textContent',
				type: 'body',
			},
		},
		default: '',
		description: '邮件的文本内容',
	},
	{
		displayName: 'HTML内容',
		name: 'htmlContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				sendHTML: [true],
			},
		},
		routing: {
			send: {
				property: 'htmlContent',
				type: 'body',
			},
		},
		default: '',
		description: '邮件的HTML内容',
	},
	{
		displayName: '发件人',
		name: 'sender',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [BrevoNode.Validators.validateAndCompileSenderEmail],
			},
		},
	},
	{
		displayName: '收件人',
		name: 'receipients',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [BrevoNode.Validators.validateAndCompileReceipientEmails],
			},
		},
	},
	{
		displayName: '附加字段',
		name: 'additionalFields',
		placeholder: '添加字段',
		description: '要添加的附加字段',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: '附件',
				name: 'emailAttachments',
				placeholder: '添加附件',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'attachment',
						displayName: '附件数据',
						values: [
							{
								displayName: '输入数据字段名称',
								default: '',
								name: 'binaryPropertyName',
								type: 'string',
								description: '包含要处理的二进制文件数据的传入字段的名称',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileAttachmentsData],
					},
				},
			},
			{
				displayName: '密送收件人',
				name: 'receipientsBCC',
				placeholder: '添加密送',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'receipientBcc',
						displayName: '收件人',
						values: [
							{
								displayName: '收件人',
								name: 'bcc',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileBCCEmails],
					},
				},
			},
			{
				displayName: '抄送收件人',
				name: 'receipientsCC',
				placeholder: '添加抄送',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'receipientCc',
						displayName: '收件人',
						values: [
							{
								displayName: '收件人',
								name: 'cc',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileCCEmails],
					},
				},
			},
			{
				displayName: '电子邮件标签',
				name: 'emailTags',
				default: {},
				description: '向电子邮件添加标签以便更容易找到它们',
				placeholder: '添加电子邮件标签',
				type: 'fixedCollection',
				options: [
					{
						displayName: '标签',
						name: 'tags',
						values: [
							{
								displayName: '标签',
								default: '',
								name: 'tag',
								type: 'string',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileTags],
					},
				},
			},
		],
	},
];

const sendHtmlTemplateEmailFields: INodeProperties[] = [
	{
		displayName: '模板ID',
		name: 'templateId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/v3/smtp/templates',
						qs: {
							templateStatus: true,
							limit: 1000,
							offset: 0,
							sort: 'desc',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'templates',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'templateId',
			},
		},
	},
	{
		displayName: '收件人',
		name: 'receipients',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [BrevoNode.Validators.validateAndCompileReceipientEmails],
			},
		},
	},
	{
		displayName: '附加字段',
		name: 'additionalFields',
		type: 'collection',
		description: '要添加的附加字段',
		placeholder: '添加字段',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: '附件',
				name: 'emailAttachments',
				placeholder: '添加附件',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: '附件数据',
						name: 'attachment',
						values: [
							{
								displayName: '输入数据字段名称',
								name: 'binaryPropertyName',
								default: '',
								type: 'string',
								description: '包含要处理的二进制文件数据的传入字段的名称',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileAttachmentsData],
					},
				},
			},
			{
				displayName: '电子邮件标签',
				name: 'emailTags',
				default: {},
				description: '向电子邮件添加标签以便更容易找到它们',
				placeholder: '添加电子邮件标签',
				type: 'fixedCollection',
				options: [
					{
						displayName: '标签',
						name: 'tags',
						values: [
							{
								displayName: '标签',
								default: '',
								name: 'tag',
								type: 'string',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileTags],
					},
				},
			},
			{
				displayName: '模板参数',
				name: 'templateParameters',
				default: {},
				description: '传递一组属性来自定义模板',
				placeholder: '添加参数',
				type: 'fixedCollection',
				options: [
					{
						name: 'parameterValues',
						displayName: '参数',
						values: [
							{
								displayName: '参数',
								name: 'parameters',
								type: 'string',
								default: '',
								placeholder: 'key=value',
								description: '逗号分隔的 key=value 对',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileTemplateParameters],
					},
				},
			},
		],
	},
];

export const emailFields: INodeProperties[] = [
	...sendHtmlEmailFields,
	...sendHtmlTemplateEmailFields,
];
