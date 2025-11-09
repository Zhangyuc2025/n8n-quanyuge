import type { INodeProperties } from 'n8n-workflow';

const clashHandlingProperties: INodeProperties = {
	displayName: '冲突处理',
	name: 'clashHandling',
	type: 'fixedCollection',
	default: {
		values: { resolveClash: 'preferInput2', mergeMode: 'deepMerge', overrideEmpty: false },
	},
	options: [
		{
			displayName: '值',
			name: 'values',
			values: [
				{
					displayName: '字段值冲突时',
					name: 'resolveClash',
					type: 'options',
					default: '',
					options: [
						{
							name: '始终在字段名后添加输入编号',
							value: 'addSuffix',
						},
						{
							name: '优先使用输入 1 的版本',
							value: 'preferInput1',
						},
						{
							name: '优先使用输入 2 的版本',
							value: 'preferInput2',
						},
					],
				},
				{
					displayName: '合并嵌套字段',
					name: 'mergeMode',
					type: 'options',
					default: 'deepMerge',
					options: [
						{
							name: '深度合并',
							value: 'deepMerge',
							description: '在每个嵌套层级进行合并',
						},
						{
							name: '浅层合并',
							value: 'shallowMerge',
							description: '仅在顶层合并（所有嵌套字段将来自同一个输入）',
						},
					],
					hint: '当存在顶层字段下的子字段时如何合并',
					displayOptions: {
						show: {
							resolveClash: ['preferInput1', 'preferInput2'],
						},
					},
				},
				{
					displayName: '最小化空字段',
					name: 'overrideEmpty',
					type: 'boolean',
					default: false,
					description:
						'是否在字段为空且另一个版本不为空时覆盖首选输入的版本。这里"空"指 undefined、null 或空字符串。',
					displayOptions: {
						show: {
							resolveClash: ['preferInput1', 'preferInput2'],
						},
					},
				},
			],
		},
	],
};

export const optionsDescription: INodeProperties[] = [
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
					},
					hide: {
						'/joinMode': ['keepMatches', 'keepNonMatches'],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
						'/joinMode': ['keepMatches'],
						'/outputDataFrom': ['both'],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['multiplex', 'mergeByPosition'],
					},
				},
			},
			{
				displayName: '禁用点号表示法',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				description: '是否禁止在字段名中使用 `parent.child` 引用子字段',
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
					},
				},
			},
			{
				displayName: '模糊比较',
				name: 'fuzzyCompare',
				type: 'boolean',
				default: false,
				description: "是否在比较字段时容忍小的类型差异。例如，数字 3 和字符串 '3' 被视为相同。",
			},
			{
				displayName: '包含未配对的数据项',
				name: 'includeUnpaired',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: '如果输入 1 和输入 2 的数据项数量不同，是否包含末尾没有配对项的数据项',
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByPosition'],
					},
				},
			},
			{
				displayName: '多重匹配',
				name: 'multipleMatches',
				type: 'options',
				default: 'all',
				options: [
					{
						name: '包含所有匹配',
						value: 'all',
						description: '如果有多个匹配项则输出多个数据项',
					},
					{
						name: '仅包含第一个匹配',
						value: 'first',
						description: '每次匹配只输出单个数据项',
					},
				],
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
						'/joinMode': ['keepMatches'],
						'/outputDataFrom': ['both'],
					},
				},
			},
			{
				displayName: '多重匹配',
				name: 'multipleMatches',
				type: 'options',
				default: 'all',
				options: [
					{
						name: '包含所有匹配',
						value: 'all',
						description: '如果有多个匹配项则输出多个数据项',
					},
					{
						name: '仅包含第一个匹配',
						value: 'first',
						description: '每次匹配只输出单个数据项',
					},
				],
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
						'/joinMode': ['enrichInput1', 'enrichInput2', 'keepEverything'],
					},
				},
			},
		],
		displayOptions: {
			hide: {
				mode: ['chooseBranch', 'append'],
			},
		},
	},
];
