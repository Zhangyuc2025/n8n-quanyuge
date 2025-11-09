import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	checkInput,
	checkInputAndThrowError,
	checkMatchFieldsInput,
	findMatches,
} from './GenericFunctions';

export class CompareDatasets implements INodeType {
	description: INodeTypeDescription = {
		displayName: '数据集对比',
		name: 'compareDatasets',
		icon: 'file:compare.svg',
		group: ['transform'],
		version: [1, 2, 2.1, 2.2, 2.3],
		description: '对比两个输入的变化',
		defaults: { name: '数据集对比' },

		inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		inputNames: ['输入 A', '输入 B'],
		requiredInputs: 1,

		outputs: [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
		],
		outputNames: ['仅在 A 中', '相同', '不同', '仅在 B 中'],
		properties: [
			{
				displayName:
					'当下面的字段匹配时，来自不同分支的项目会配对在一起。如果配对，其余字段会被比较以确定项目是否相同',
				name: 'infoBox',
				type: 'notice',
				default: '',
			},
			{
				displayName: '要匹配的字段',
				name: 'mergeByFields',
				type: 'fixedCollection',
				placeholder: '添加要匹配的字段',
				default: { values: [{ field1: '', field2: '' }] },
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: '值',
						name: 'values',
						values: [
							{
								displayName: '输入 A 字段',
								name: 'field1',
								type: 'string',
								default: '',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: '例如：id',
								hint: '输入字段名称作为文本',
								requiresDataPath: 'single',
							},
							{
								displayName: '输入 B 字段',
								name: 'field2',
								type: 'string',
								default: '',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: '例如：id',
								hint: '输入字段名称作为文本',
								requiresDataPath: 'single',
							},
						],
					},
				],
			},
			{
				displayName: '当存在差异时',
				name: 'resolve',
				type: 'options',
				default: 'preferInput2',
				options: [
					{
						name: '使用输入 A 版本',
						value: 'preferInput1',
					},
					{
						name: '使用输入 B 版本',
						value: 'preferInput2',
					},
					{
						name: '使用混合版本',
						value: 'mix',
						description: '输出对不同字段使用不同的输入',
					},
					{
						name: '包括两个版本',
						value: 'includeBoth',
						description: '输出包含所有数据（但结构更复杂）',
					},
				],
				displayOptions: {
					show: {
						'@version': [1, 2],
					},
				},
			},
			{
				displayName: '当存在差异时',
				name: 'resolve',
				type: 'options',
				default: 'includeBoth',
				options: [
					{
						name: '使用输入 A 版本',
						value: 'preferInput1',
					},
					{
						name: '使用输入 B 版本',
						value: 'preferInput2',
					},
					{
						name: '使用混合版本',
						value: 'mix',
						description: '输出对不同字段使用不同的输入',
					},
					{
						name: '包括两个版本',
						value: 'includeBoth',
						description: '输出包含所有数据（但结构更复杂）',
					},
				],
				displayOptions: {
					hide: {
						'@version': [1, 2],
					},
				},
			},
			{
				displayName: '模糊对比',
				name: 'fuzzyCompare',
				type: 'boolean',
				default: false,
				description: '是否在比较字段时容忍小的类型差异。例如，数字 3 和字符串 "3" 被视为相同。',
				displayOptions: {
					hide: {
						'@version': [1],
					},
				},
			},
			{
				displayName: '偏好',
				name: 'preferWhenMix',
				type: 'options',
				default: 'input1',
				options: [
					{
						name: '输入 A 版本',
						value: 'input1',
					},
					{
						name: '输入 B 版本',
						value: 'input2',
					},
				],
				displayOptions: {
					show: {
						resolve: ['mix'],
					},
				},
			},
			{
				displayName: '除了以下字段外的所有内容',
				name: 'exceptWhenMix',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				placeholder: '例如：id, country',
				hint: '输入字段名称作为文本，用逗号分隔',
				displayOptions: {
					show: {
						resolve: ['mix'],
					},
				},
				requiresDataPath: 'multiple',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '跳过对比的字段',
						name: 'skipFields',
						type: 'string',
						default: '',
						placeholder: '例如：updated_at, updated_by',
						hint: '输入字段名称作为文本，用逗号分隔',
						description: '在检查两个项目是否相同时不应包含的字段',
						requiresDataPath: 'multiple',
					},
					{
						displayName: '模糊对比',
						name: 'fuzzyCompare',
						type: 'boolean',
						default: false,
						description: '是否在比较字段时容忍小的类型差异。例如，数字 3 和字符串 "3" 被视为相同。',
						displayOptions: {
							show: {
								'@version': [1],
							},
						},
					},
					{
						displayName: '禁用点符号',
						name: 'disableDotNotation',
						type: 'boolean',
						default: false,
						description: '是否禁止在字段名称中使用 `parent.child` 引用子字段',
					},
					{
						displayName: '多个匹配项',
						name: 'multipleMatches',
						type: 'options',
						default: 'first',
						options: [
							{
								name: '仅包括第一个匹配项',
								value: 'first',
								description: '每个匹配项仅输出一个项目',
							},
							{
								name: '包括所有匹配项',
								value: 'all',
								description: '如果有多个匹配项，输出多个项目',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const matchFields = checkMatchFieldsInput(
			this.getNodeParameter('mergeByFields.values', 0, []) as IDataObject[],
		);

		const options = this.getNodeParameter('options', 0, {});

		options.nodeVersion = this.getNode().typeVersion;

		if (options.nodeVersion >= 2) {
			options.fuzzyCompare = this.getNodeParameter('fuzzyCompare', 0, false) as boolean;
		}

		let input1 = this.getInputData(0);
		let input2 = this.getInputData(1);
		if (options.nodeVersion < 2.2) {
			input1 = checkInputAndThrowError(
				input1,
				matchFields.map((pair) => pair.field1),
				(options.disableDotNotation as boolean) || false,
				'Input A',
			);

			input2 = checkInputAndThrowError(
				input2,
				matchFields.map((pair) => pair.field2),
				(options.disableDotNotation as boolean) || false,
				'Input B',
			);
		} else {
			input1 = checkInput(input1);
			input2 = checkInput(input2);
		}

		const resolve = this.getNodeParameter('resolve', 0, '') as string;
		options.resolve = resolve;

		if (resolve === 'mix') {
			options.preferWhenMix = this.getNodeParameter('preferWhenMix', 0, '') as string;
			options.exceptWhenMix = this.getNodeParameter('exceptWhenMix', 0, '') as string;
		}

		const matches = findMatches(input1, input2, matchFields, options);

		return matches;
	}
}
