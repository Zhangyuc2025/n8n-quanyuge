import type { INodeProperties } from 'n8n-workflow';

export const senderOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sender'],
			},
		},
		options: [
			{
				name: '创建',
				value: 'create',
				action: '创建发件人',
			},
			{
				name: '删除',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v3/senders/{{$parameter.id}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
				action: '删除发件人',
			},
			{
				name: '获取多个',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/v3/senders',
					},
					send: {
						paginate: false,
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'senders',
								},
							},
						],
					},
				},
				action: '获取多个发件人',
			},
		],
		default: 'create',
	},
];

const senderCreateOperation: INodeProperties[] = [
	{
		displayName: '名称',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['sender'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				method: 'POST',
				url: '/v3/senders',
			},
			send: {
				property: 'name',
				type: 'body',
			},
		},
		required: true,
		description: '发件人的名称',
	},
	{
		displayName: '电子邮件',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: {
			show: {
				resource: ['sender'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				property: 'email',
				type: 'body',
			},
		},
		required: true,
		description: '发件人的电子邮件',
	},
];

const senderDeleteOperation: INodeProperties[] = [
	{
		displayName: '发件人ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['sender'],
				operation: ['delete'],
			},
		},
		description: '要删除的发件人的ID',
	},
];

const senderGetAllOperation: INodeProperties[] = [
	{
		displayName: '返回全部',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['sender'],
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
				resource: ['sender'],
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
		default: 10,
		description: '返回结果的最大数量',
	},
];

export const senderFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                sender:create                               */
	/* -------------------------------------------------------------------------- */
	...senderCreateOperation,

	/* -------------------------------------------------------------------------- */
	/*                                sender:delete                               */
	/* -------------------------------------------------------------------------- */
	...senderDeleteOperation,

	/* -------------------------------------------------------------------------- */
	/*                                sender:getAll                               */
	/* -------------------------------------------------------------------------- */
	...senderGetAllOperation,
];
