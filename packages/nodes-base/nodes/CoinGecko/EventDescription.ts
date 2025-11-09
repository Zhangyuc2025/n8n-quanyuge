import type { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: '获取多个',
				value: 'getAll',
				description: '获取多个事件',
				action: '获取多个事件',
			},
		],
		default: 'getAll',
	},
];

export const eventFields: INodeProperties[] = [
	{
		displayName: '返回全部',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['event'],
			},
		},
		default: false,
		description: '是否返回所有结果或仅返回到给定限制为止的结果',
	},
	{
		displayName: '限制',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['event'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: '返回结果的最大数量',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['event'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: '国家代码',
				name: 'country_code',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEventCountryCodes',
				},
				default: '',
				description:
					'事件的国家代码。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
			},
			{
				displayName: '起始日期',
				name: 'from_date',
				type: 'dateTime',
				default: '',
				description: '列出该日期之后的事件',
			},
			{
				displayName: '截止日期',
				name: 'to_date',
				type: 'dateTime',
				default: '',
				description: '列出该日期之前的事件',
			},
			{
				displayName: '类型名称或 ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEventTypes',
				},
				default: '',
				description:
					'事件类型。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
			},
			{
				displayName: '仅限即将发生的事件',
				name: 'upcoming_events_only',
				type: 'boolean',
				default: true,
				description: '是否仅列出即将发生的事件',
			},
		],
	},
];
