import type { INodeProperties } from 'n8n-workflow';
const operationOptions = [
	{
		name: '删除当前输入中的重复项',
		value: 'removeDuplicateInputItems',
		description: '从传入项中删除重复项',
		action: '删除当前输入中的重复项',
	},
	{
		name: '删除之前执行中处理过的项',
		value: 'removeItemsSeenInPreviousExecutions',
		description: '对在之前执行中已见过的项进行去重',
		action: '删除之前执行中处理过的项',
	},
	{
		name: '清除去重历史',
		value: 'clearDeduplicationHistory',
		description: '清除之前项的存储',
		action: '清除去重历史',
	},
];
const compareOptions = [
	{
		name: '所有字段',
		value: 'allFields',
	},
	{
		name: '排除指定字段',
		value: 'allFieldsExcept',
	},
	{
		name: '选定字段',
		value: 'selectedFields',
	},
];
const logicOptions = [
	{
		name: '值是新的',
		value: 'removeItemsWithAlreadySeenKeyValues',
		description: '删除与已处理项匹配的所有输入项',
	},
	{
		name: '值高于之前的任何值',
		value: 'removeItemsUpToStoredIncrementalKey',
		description: '适用于递增值，删除所有值不大于存储值的输入项',
	},
	{
		name: '值是比之前任何日期都晚的日期',
		value: 'removeItemsUpToStoredDate',
		description: '适用于日期值，删除所有日期不晚于存储日期的输入项',
	},
];
const manageDatabaseModeOptions = [
	{
		name: '清理数据库',
		value: 'cleanDatabase',
		description: '清除数据库中为键存储的所有值',
	},
];

export const removeDuplicatesNodeFields: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: operationOptions,
		default: 'removeDuplicateInputItems',
	},
	{
		displayName: '比较方式',
		name: 'compare',
		type: 'options',
		options: compareOptions,
		default: 'allFields',
		description: '用于比较输入项的字段，以确定它们是否相同',
		displayOptions: {
			show: {
				operation: ['removeDuplicateInputItems'],
			},
		},
	},
	{
		displayName: '要排除的字段',
		name: 'fieldsToExclude',
		type: 'string',
		placeholder: '例如：email, name',
		requiresDataPath: 'multiple',
		description: '从比较中排除的输入字段',
		default: '',
		displayOptions: {
			show: {
				compare: ['allFieldsExcept'],
			},
		},
	},
	{
		displayName: '要比较的字段',
		name: 'fieldsToCompare',
		type: 'string',
		placeholder: '例如：email, name',
		requiresDataPath: 'multiple',
		description: '添加到比较中的输入字段',
		default: '',
		displayOptions: {
			show: {
				compare: ['selectedFields'],
			},
		},
	},

	// ----------------------------------
	{
		displayName: '保留项的条件',
		name: 'logic',
		type: 'options',
		noDataExpression: true,
		options: logicOptions,
		default: 'removeItemsWithAlreadySeenKeyValues',
		description: '通过与之前处理的键值进行比较来选择要删除的输入项的方式',
		displayOptions: {
			show: {
				operation: ['removeItemsSeenInPreviousExecutions'],
			},
		},
	},
	{
		displayName: '去重值',
		name: 'dedupeValue',
		type: 'string',
		default: '',
		description: '使用具有唯一 ID 值的输入字段（或字段组合）',
		hint: '用于在项之间进行比较的输入字段值',
		placeholder: '例如：ID',
		required: true,
		displayOptions: {
			show: {
				logic: ['removeItemsWithAlreadySeenKeyValues'],
				'/operation': ['removeItemsSeenInPreviousExecutions'],
			},
		},
	},
	{
		displayName: '去重值',
		name: 'incrementalDedupeValue',
		type: 'number',
		default: '',
		description: '使用具有递增值的输入字段（或字段组合）',
		hint: '用于在项之间进行比较的输入字段值，需要递增值',
		placeholder: '例如：ID',
		displayOptions: {
			show: {
				logic: ['removeItemsUpToStoredIncrementalKey'],
				'/operation': ['removeItemsSeenInPreviousExecutions'],
			},
		},
	},
	{
		displayName: '去重值',
		name: 'dateDedupeValue',
		type: 'dateTime',
		default: '',
		description: '使用具有 ISO 格式日期值的输入字段',
		hint: '用于在项之间进行比较的输入字段值，需要日期值',
		placeholder: '例如：2024-08-09T13:44:16Z',
		displayOptions: {
			show: {
				logic: ['removeItemsUpToStoredDate'],
				'/operation': ['removeItemsSeenInPreviousExecutions'],
			},
		},
	},
	{
		displayName: '模式',
		name: 'mode',
		type: 'options',
		default: 'cleanDatabase',
		description: '您希望如何修改数据库中存储的键值。这些模式都不会删除输入项',
		displayOptions: {
			show: {
				operation: ['clearDeduplicationHistory'],
			},
		},
		options: manageDatabaseModeOptions,
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加字段',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'removeDuplicateInputItems',
					'removeItemsSeenInPreviousExecutions',
					'clearDeduplicationHistory',
				],
			},
		},
		options: [
			{
				displayName: '禁用点符号',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'/operation': ['removeDuplicateInputItems'],
					},
					hide: {
						'/compare': ['allFields'],
					},
				},
				description: '是否禁止使用 `parent.child` 格式引用子字段',
			},
			{
				displayName: '删除其他字段',
				name: 'removeOtherFields',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'/operation': ['removeDuplicateInputItems'],
					},
					hide: {
						'/compare': ['allFields'],
					},
				},
				description: '是否删除未参与比较的字段。如果禁用，将保留重复项中第一项的字段值',
			},
			{
				displayName: '作用域',
				name: 'scope',
				type: 'options',
				default: 'node',
				displayOptions: {
					show: {
						'/operation': ['clearDeduplicationHistory', 'removeItemsSeenInPreviousExecutions'],
					},
				},
				description:
					'如果设置为"工作流"，键值将在工作流中的所有节点之间共享。如果设置为"节点"，键值将特定于此节点',
				options: [
					{
						name: '工作流',
						value: 'workflow',
						description: '去重信息将由工作流中的所有节点共享',
					},
					{
						name: '节点',
						value: 'node',
						description: '去重信息将仅为此节点存储',
					},
				],
			},
			{
				displayName: '历史大小',
				name: 'historySize',
				type: 'number',
				default: 10000,
				hint: '用于去重的最大存储项数',
				displayOptions: {
					show: {
						'/logic': ['removeItemsWithAlreadySeenKeyValues'],
						'/operation': ['removeItemsSeenInPreviousExecutions'],
					},
				},
			},
		],
	},
];
