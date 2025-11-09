import type { INodeProperties } from 'n8n-workflow';

export const fuzzyCompareProperty: INodeProperties = {
	displayName: '模糊比较',
	name: 'fuzzyCompare',
	type: 'boolean',
	default: false,
	description: "比较字段时是否容忍小的类型差异。例如，数字 3 和字符串 '3' 会被视为相同。",
};
export const numberInputsProperty: INodeProperties = {
	displayName: '输入数量',
	name: 'numberInputs',
	type: 'options',
	noDataExpression: true,
	default: 2,
	options: [
		{
			name: '2',
			value: 2,
		},
		{
			name: '3',
			value: 3,
		},
		{
			name: '4',
			value: 4,
		},
		{
			name: '5',
			value: 5,
		},
		{
			name: '6',
			value: 6,
		},
		{
			name: '7',
			value: 7,
		},
		{
			name: '8',
			value: 8,
		},
		{
			name: '9',
			value: 9,
		},
		{
			name: '10',
			value: 10,
		},
	],
	validateType: 'number',
	description: '要合并的数据输入数量。节点会等待所有连接的输入都执行完毕。',
};

export const clashHandlingProperties: INodeProperties = {
	displayName: '冲突处理',
	name: 'clashHandling',
	type: 'fixedCollection',
	default: {
		values: { resolveClash: 'preferLast', mergeMode: 'deepMerge', overrideEmpty: false },
	},
	options: [
		{
			displayName: '值',
			name: 'values',
			values: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: '当字段值冲突时',
					name: 'resolveClash',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-options
					type: 'options',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getResolveClashOptions',
						loadOptionsDependsOn: ['numberInputs'],
					},
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
							description: '仅在顶层进行合并（所有嵌套字段都将来自同一输入）',
						},
					],
					hint: '当顶层字段下有子字段时如何合并',
					displayOptions: {
						show: {
							resolveClash: [{ _cnd: { not: 'addSuffix' } }],
						},
					},
				},
				{
					displayName: '最小化空字段',
					name: 'overrideEmpty',
					type: 'boolean',
					default: false,
					description:
						'如果首选输入版本的字段为空而另一个版本不为空，是否覆盖首选输入版本。这里的「空」指 undefined、null 或空字符串。',
					displayOptions: {
						show: {
							resolveClash: [{ _cnd: { not: 'addSuffix' } }],
						},
					},
				},
			],
		},
	],
};
