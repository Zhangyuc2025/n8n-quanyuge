import type {
	GenericValue,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: '创建',
				value: 'create',
				action: '创建联系人',
				routing: {
					request: {
						method: 'POST',
						url: '/v3/contacts',
					},
				},
			},
			{
				name: '创建或更新',
				value: 'upsert',
				action: '创建或更新联系人',
				routing: {
					request: {
						method: 'POST',
						url: '=/v3/contacts',
					},
				},
			},
			{
				name: '删除',
				value: 'delete',
				action: '删除联系人',
			},
			{
				name: '获取',
				value: 'get',
				action: '获取联系人',
			},
			{
				name: '获取多个',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/v3/contacts',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contacts',
								},
							},
						],
					},
					operations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'limit',
								offsetParameter: 'offset',
								pageSize: 1000,
								type: 'query',
							},
						},
					},
				},
				action: '获取多个联系人',
			},
			{
				name: '更新',
				value: 'update',
				routing: {
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
				action: '更新联系人',
			},
		],
		default: 'create',
	},
];

const createOperations: INodeProperties[] = [
	{
		displayName: '电子邮件',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'email',
			},
		},
	},
	{
		displayName: '联系人属性',
		name: 'createContactAttributes',
		default: {},
		description: '要添加的属性数组',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'attributesValues',
				displayName: '属性',
				values: [
					{
						displayName: '字段名',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptions: {
								routing: {
									request: {
										method: 'GET',
										url: '/v3/contacts/attributes',
									},
									output: {
										postReceive: [
											{
												type: 'rootProperty',
												properties: {
													property: 'attributes',
												},
											},
											{
												type: 'setKeyValue',
												properties: {
													name: '={{$responseItem.name}} - ({{$responseItem.category}})',
													value: '={{$responseItem.name}}',
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
						default: '',
					},
					{
						displayName: '字段值',
						name: 'fieldValue',
						type: 'string',
						default: '',
						routing: {
							send: {
								value: '={{$value}}',
								property: '=attributes.{{$parent.fieldName}}',
								type: 'body',
							},
						},
					},
				],
			},
		],
		placeholder: '添加属性',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
	},
];

const getAllOperations: INodeProperties[] = [
	{
		displayName: '返回全部',
		name: 'returnAll',
		type: 'boolean',
		routing: {
			send: {
				paginate: '={{$value}}',
			},
		},
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: '返回结果的最大数量',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: '排序',
				name: 'sort',
				type: 'options',
				options: [
					{ name: '降序', value: 'desc' },
					{ name: '升序', value: 'asc' },
				],
				routing: {
					send: {
						type: 'query',
						property: 'sort',
						value: '={{$value}}',
					},
				},
				default: 'desc',
				description: '按记录创建的升序/降序排列结果',
			},
		],
	},
	{
		displayName: '过滤器',
		name: 'filters',
		type: 'collection',
		placeholder: '添加过滤器',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: '修改时间之后',
				name: 'modifiedSince',
				type: 'dateTime',
				routing: {
					send: {
						type: 'query',
						property: 'modifiedSince',
					},
				},
				default: '',
				description: '过滤（URL编码）在给定UTC日期时间之后修改的联系人 (YYYY-MM-DDTHH:mm:ss.SSSZ)',
			},
		],
	},
];

const getOperations: INodeProperties[] = [
	{
		displayName: '联系人标识符',
		name: 'identifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		routing: {
			request: {
				method: 'GET',
				url: '=/v3/contacts/{{encodeURIComponent($value)}}',
			},
		},
		required: true,
		default: '',
		description: '电子邮件（URL编码）或联系人ID或其SMS属性值',
	},
];

const deleteOperations: INodeProperties[] = [
	{
		displayName: '联系人标识符',
		name: 'identifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '=/v3/contacts/{{encodeURIComponent($parameter.identifier)}}',
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
		default: '',
		description: '电子邮件（URL编码）或联系人ID或其SMS属性值',
	},
];

const updateOperations: INodeProperties[] = [
	{
		displayName: '联系人标识符',
		name: 'identifier',
		default: '',
		description: '电子邮件（URL编码）或联系人ID或其SMS属性值',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		type: 'string',
		required: true,
	},
	{
		displayName: '属性',
		name: 'updateAttributes',
		default: {},
		description: '要更新的属性数组',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: '属性',
				name: 'updateAttributesValues',
				values: [
					{
						displayName: '字段名',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptions: {
								routing: {
									request: {
										method: 'GET',
										url: '/v3/contacts/attributes',
									},
									output: {
										postReceive: [
											{
												type: 'rootProperty',
												properties: {
													property: 'attributes',
												},
											},
											{
												type: 'setKeyValue',
												properties: {
													name: '={{$responseItem.name}} - ({{$responseItem.category}})',
													value: '={{$responseItem.name}}',
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
						default: '',
					},
					{
						displayName: '字段值',
						name: 'fieldValue',
						type: 'string',
						default: '',
						routing: {
							send: {
								value: '={{$value}}',
								property: '=attributes.{{$parent.fieldName}}',
								type: 'body',
							},
						},
					},
				],
			},
		],
		placeholder: '添加属性',
		routing: {
			request: {
				method: 'PUT',
				url: '=/v3/contacts/{{encodeURIComponent($parameter.identifier)}}',
			},
		},
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
	},
];

const upsertOperations: INodeProperties[] = [
	{
		displayName: '电子邮件',
		name: 'email',
		default: '',
		description: '联系人的电子邮件',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		routing: {
			send: {
				value: '={{$value}}',
				property: 'email',
				type: 'body',
			},
		},
	},
	{
		displayName: '联系人属性',
		name: 'upsertAttributes',
		default: {},
		description: '要更新的属性数组',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'upsertAttributesValues',
				displayName: '属性',
				values: [
					{
						displayName: '字段名',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptions: {
								routing: {
									request: {
										method: 'GET',
										url: '/v3/contacts/attributes',
									},
									output: {
										postReceive: [
											{
												type: 'rootProperty',
												properties: {
													property: 'attributes',
												},
											},
											{
												type: 'setKeyValue',
												properties: {
													name: '={{$responseItem.name}} - ({{$responseItem.category}})',
													value: '={{$responseItem.name}}',
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
						default: '',
					},
					{
						displayName: '字段值',
						name: 'fieldValue',
						type: 'string',
						default: '',
						routing: {
							send: {
								value: '={{$value}}',
								property: '=attributes.{{$parent.fieldName}}',
								type: 'body',
							},
						},
					},
				],
			},
		],
		placeholder: '添加属性',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const { body } = requestOptions as GenericValue as JsonObject;
						Object.assign(body!, { updateEnabled: true });
						return requestOptions;
					},
				],
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
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:create                              */
	/* -------------------------------------------------------------------------- */
	...createOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                              */
	/* -------------------------------------------------------------------------- */
	...getAllOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:get                                 */
	/* -------------------------------------------------------------------------- */
	...getOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:delete                              */
	/* -------------------------------------------------------------------------- */
	...deleteOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                              */
	/* -------------------------------------------------------------------------- */
	...updateOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                              */
	/* -------------------------------------------------------------------------- */
	...upsertOperations,
];
