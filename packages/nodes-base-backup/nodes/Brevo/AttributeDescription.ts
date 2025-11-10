import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';

import { BrevoNode } from './GenericFunctions';

export const attributeOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['attribute'],
			},
		},
		options: [
			{
				name: '创建',
				value: 'create',
				routing: {
					request: {
						method: 'POST',
						url: '=/v3/contacts/attributes/{{$parameter.attributeCategory}}/{{encodeURI($parameter.attributeName)}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}', // Also possible to use the original response data
								},
							},
						],
					},
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const selectedCategory = this.getNodeParameter('attributeCategory') as string;
								const override = BrevoNode.INTERCEPTORS.get(selectedCategory);
								if (override) {
									override.call(this, requestOptions.body! as JsonObject);
								}

								return requestOptions;
							},
						],
					},
				},
				action: '创建属性',
			},
			{
				name: '更新',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v3/contacts/attributes/{{$parameter.updateAttributeCategory}}/{{encodeURI($parameter.updateAttributeName)}}',
					},
				},
				action: '更新属性',
			},
			{
				name: '删除',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v3/contacts/attributes/{{$parameter.deleteAttributeCategory}}/{{encodeURI($parameter.deleteAttributeName)}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}', // Also possible to use the original response data
								},
							},
						],
					},
				},
				action: '删除属性',
			},
			{
				name: '获取多个',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: 'v3/contacts/attributes',
					},
					send: {
						paginate: false,
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'attributes',
								},
							},
						],
					},
				},
				action: '获取多个属性',
			},
		],
		default: 'create',
	},
];

const createAttributeOperations: INodeProperties[] = [
	{
		displayName: '分类',
		name: 'attributeCategory',
		default: 'normal',
		description: '属性的分类',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: '已计算',
				value: 'calculated',
			},
			{
				name: '分类',
				value: 'category',
			},
			{
				name: '全局',
				value: 'global',
			},
			{
				name: '常规',
				value: 'normal',
			},
			{
				name: '事务',
				value: 'transactional',
			},
		],
		type: 'options',
		required: true,
	},
	{
		displayName: '名称',
		name: 'attributeName',
		default: '',
		description: '属性的名称',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
			},
		},
		required: true,
		type: 'string',
	},
	{
		displayName: '类型',
		name: 'attributeType',
		default: '',
		description: '属性类型',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
				attributeCategory: ['normal'],
			},
		},
		options: [
			{
				name: '布尔值',
				value: 'boolean',
			},
			{
				name: '日期',
				value: 'date',
			},
			{
				name: '浮点数',
				value: 'float',
			},
			{
				name: '文本',
				value: 'text',
			},
		],
		required: true,
		type: 'options',
		routing: {
			send: {
				type: 'body',
				property: 'type',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: '值',
		name: 'attributeValue',
		default: '',
		description: '属性的值',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
				attributeCategory: ['global', 'calculated'],
			},
		},
		type: 'string',
		placeholder: '',
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'value',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: '联系人属性列表',
		name: 'attributeCategoryList',
		type: 'collection',
		placeholder: '添加属性',
		default: {},
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
				attributeCategory: ['category'],
			},
		},
		options: [
			{
				displayName: '联系人属性',
				name: 'categoryEnumeration',
				placeholder: '添加属性',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attributesValues',
						displayName: '属性',
						values: [
							{
								displayName: '值ID',
								name: 'attributeCategoryValue',
								type: 'number',
								default: 1,
								description: '值的ID，必须为数字',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].value',
										type: 'body',
									},
								},
							},
							{
								displayName: '标签',
								name: 'attributeCategoryLabel',
								type: 'string',
								default: '',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].label',
										type: 'body',
									},
								},
								description: '值的标签',
							},
						],
					},
				],
				default: {},
				description: '属性可以取值的值和标签列表',
			},
		],
	},
];

const updateAttributeOperations: INodeProperties[] = [
	{
		displayName: '分类',
		name: 'updateAttributeCategory',
		default: 'calculated',
		description: '属性的分类',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: '已计算',
				value: 'calculated',
			},
			{
				name: '分类',
				value: 'category',
			},
			{
				name: '全局',
				value: 'global',
			},
		],
		type: 'options',
	},
	{
		displayName: '名称',
		name: 'updateAttributeName',
		default: '',
		description: '现有属性的名称',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
			},
		},
		type: 'string',
	},
	{
		displayName: '值',
		name: 'updateAttributeValue',
		default: '',
		description: '要更新的属性值',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
			},
			hide: {
				updateAttributeCategory: ['category'],
			},
		},
		type: 'string',
		placeholder: '',
		routing: {
			send: {
				type: 'body',
				property: 'value',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: '更新字段',
		name: 'updateAttributeCategoryList',
		default: {},
		description: '属性可以取值的值和标签列表',
		type: 'collection',
		placeholder: '添加字段',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
				updateAttributeCategory: ['category'],
			},
		},
		options: [
			{
				displayName: '联系人属性',
				name: 'updateCategoryEnumeration',
				placeholder: '添加属性',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'updateAttributesValues',
						displayName: '属性',
						values: [
							{
								displayName: '值',
								name: 'attributeCategoryValue',
								type: 'number',
								default: 1,
								description: '值的ID，必须为数字',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].value',
										type: 'body',
									},
								},
							},
							{
								displayName: '标签',
								name: 'attributeCategoryLabel',
								type: 'string',
								default: '',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].label',
										type: 'body',
									},
								},
								description: '值的标签',
							},
						],
					},
				],
				default: {},
				description: '属性可以取值的值和标签列表',
			},
		],
	},
];

const deleteAttribueOperations: INodeProperties[] = [
	{
		displayName: '分类',
		name: 'deleteAttributeCategory',
		default: 'normal',
		description: '属性的分类',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['delete'],
			},
		},
		options: [
			{
				name: '已计算',
				value: 'calculated',
			},
			{
				name: '分类',
				value: 'category',
			},
			{
				name: '全局',
				value: 'global',
			},
			{
				name: '常规',
				value: 'normal',
			},
			{
				name: '事务',
				value: 'transactional',
			},
		],
		type: 'options',
	},
	{
		displayName: '名称',
		name: 'deleteAttributeName',
		default: '',
		description: '属性的名称',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['delete'],
			},
		},
		type: 'string',
	},
];

const getAllAttributeOperations: INodeProperties[] = [
	{
		displayName: '返回全部',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: '是否返回所有结果或仅返回至给定限制',
	},
	{
		displayName: '限制',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'limit',
						properties: {
							maxResults: '={{$value}}',
						},
					},
				],
			},
		},
		default: 50,
		description: '返回结果的最大数量',
	},
];

export const attributeFields: INodeProperties[] = [
	...createAttributeOperations,
	...updateAttributeOperations,
	...deleteAttribueOperations,
	...getAllAttributeOperations,
];
