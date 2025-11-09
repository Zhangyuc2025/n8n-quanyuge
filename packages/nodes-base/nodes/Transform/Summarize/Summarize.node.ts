import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
	type NodeExecutionHint,
	NodeOperationError,
} from 'n8n-workflow';

import {
	type Aggregations,
	NUMERICAL_AGGREGATIONS,
	type SummarizeOptions,
	aggregateAndSplitData,
	checkIfFieldExists,
	fieldValueGetter,
	flattenAggregationResultToArray,
	flattenAggregationResultToObject,
} from './utils';

export class Summarize implements INodeType {
	description: INodeTypeDescription = {
		displayName: '汇总',
		name: 'summarize',
		icon: 'file:summarize.svg',
		group: ['transform'],
		subtitle: '',
		version: [1, 1.1],
		description: '对项目进行求和、计数、最大值等操作',
		defaults: {
			name: '汇总',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '要汇总的字段',
				name: 'fieldsToSummarize',
				type: 'fixedCollection',
				placeholder: '添加字段',
				default: { values: [{ aggregation: 'count', field: '' }] },
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: '',
						name: 'values',
						values: [
							{
								displayName: '聚合方式',
								name: 'aggregation',
								type: 'options',
								options: [
									{
										name: '追加',
										value: 'append',
									},
									{
										name: '平均值',
										value: 'average',
									},
									{
										name: '连接',
										value: 'concatenate',
									},
									{
										name: '计数',
										value: 'count',
									},
									{
										name: '唯一计数',
										value: 'countUnique',
									},
									{
										name: '最大值',
										value: 'max',
									},
									{
										name: '最小值',
										value: 'min',
									},
									{
										name: '总和',
										value: 'sum',
									},
								],
								default: 'count',
								description: '如何组合要汇总的字段值',
							},
							//field repeated to have different descriptions for different aggregations --------------------------------
							{
								displayName: '字段',
								name: 'field',
								type: 'string',
								default: '',
								description: '要汇总的输入字段名称',
								placeholder: '例如：cost',
								hint: '输入字段名作为文本',
								displayOptions: {
									hide: {
										aggregation: [...NUMERICAL_AGGREGATIONS, 'countUnique', 'count', 'max', 'min'],
									},
								},
								requiresDataPath: 'single',
							},
							{
								displayName: '字段',
								name: 'field',
								type: 'string',
								default: '',
								description:
									'要汇总的输入字段名称。字段应包含数值；null、undefined、空字符串将被忽略',
								placeholder: '例如：cost',
								hint: '输入字段名作为文本',
								displayOptions: {
									show: {
										aggregation: NUMERICAL_AGGREGATIONS,
									},
								},
								requiresDataPath: 'single',
							},
							{
								displayName: '字段',
								name: 'field',
								type: 'string',
								default: '',
								description: '要汇总的输入字段名称；null、undefined、空字符串将被忽略',
								placeholder: '例如：cost',
								hint: '输入字段名作为文本',
								displayOptions: {
									show: {
										aggregation: ['countUnique', 'count', 'max', 'min'],
									},
								},
								requiresDataPath: 'single',
							},
							// ----------------------------------------------------------------------------------------------------------
							{
								displayName: '包含空值',
								name: 'includeEmpty',
								type: 'boolean',
								default: false,
								displayOptions: {
									show: {
										aggregation: ['append', 'concatenate', 'count', 'countUnique'],
									},
								},
							},
							{
								displayName: '分隔符',
								name: 'separateBy',
								type: 'options',
								default: ',',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									{
										name: '逗号',
										value: ',',
									},
									{
										name: '逗号和空格',
										value: ', ',
									},
									{
										name: '换行符',
										value: '\n',
									},
									{
										name: '无',
										value: '',
									},
									{
										name: '空格',
										value: ' ',
									},
									{
										name: '其他',
										value: 'other',
									},
								],
								hint: '在值之间插入什么',
								displayOptions: {
									show: {
										aggregation: ['concatenate'],
									},
								},
							},
							{
								displayName: '自定义分隔符',
								name: 'customSeparator',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										aggregation: ['concatenate'],
										separateBy: ['other'],
									},
								},
							},
						],
					},
				],
			},
			// fieldsToSplitBy repeated to have different displayName for singleItem and separateItems -----------------------------
			{
				displayName: '拆分依据字段',
				name: 'fieldsToSplitBy',
				type: 'string',
				placeholder: '例如：country, city',
				default: '',
				description: '要按其拆分汇总的输入字段名称',
				hint: '输入字段名作为文本（用逗号分隔）',
				displayOptions: {
					hide: {
						'/options.outputFormat': ['singleItem'],
					},
				},
				requiresDataPath: 'multiple',
			},
			{
				displayName: '分组依据字段',
				name: 'fieldsToSplitBy',
				type: 'string',
				placeholder: '例如：country, city',
				default: '',
				description: '要按其拆分汇总的输入字段名称',
				hint: '输入字段名作为文本（用逗号分隔）',
				displayOptions: {
					show: {
						'/options.outputFormat': ['singleItem'],
					},
				},
				requiresDataPath: 'multiple',
			},
			// ----------------------------------------------------------------------------------------------------------
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '找不到字段时继续',
						name: 'continueIfFieldNotFound',
						type: 'boolean',
						default: false,
						description:
							'如果在任何项目中找不到要汇总的字段，是否继续并返回单个空项目，否则会抛出错误',
						displayOptions: {
							hide: {
								'@version': [{ _cnd: { gte: 1.1 } }],
							},
						},
					},
					{
						displayName: '禁用点表示法',
						name: 'disableDotNotation',
						type: 'boolean',
						default: false,
						description: '是否禁止在字段名中使用 `parent.child` 引用子字段',
					},
					{
						displayName: '输出格式',
						name: 'outputFormat',
						type: 'options',
						default: 'separateItems',
						options: [
							{
								name: '每个拆分为单独项目',
								value: 'separateItems',
							},
							{
								name: '所有拆分在单个项目中',
								value: 'singleItem',
							},
						],
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						displayName: '忽略没有有效分组字段的项目',
						name: 'skipEmptySplitFields',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const newItems = items.map(({ json }, i) => ({ ...json, _itemIndex: i }));

		const options = this.getNodeParameter('options', 0, {}) as SummarizeOptions;

		const fieldsToSplitBy = (this.getNodeParameter('fieldsToSplitBy', 0, '') as string)
			.split(',')
			.map((field) => field.trim())
			.filter((field) => field);

		const fieldsToSummarize = this.getNodeParameter(
			'fieldsToSummarize.values',
			0,
			[],
		) as Aggregations;

		if (fieldsToSummarize.filter((aggregation) => aggregation.field !== '').length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				"You need to add at least one aggregation to 'Fields to Summarize' with non empty 'Field'",
			);
		}

		const getValue = fieldValueGetter(options.disableDotNotation);

		const nodeVersion = this.getNode().typeVersion;

		const aggregationResult = aggregateAndSplitData({
			splitKeys: fieldsToSplitBy,
			inputItems: newItems,
			fieldsToSummarize,
			options,
			getValue,
			convertKeysToString: nodeVersion === 1,
		});

		const fieldsNotFound: NodeExecutionHint[] = [];
		try {
			checkIfFieldExists.call(this, newItems, fieldsToSummarize, getValue);
		} catch (error) {
			if (nodeVersion > 1 || options.continueIfFieldNotFound) {
				const fieldNotFoundHint: NodeExecutionHint = {
					message: error instanceof Error ? error.message : String(error),
					location: 'outputPane',
				};
				fieldsNotFound.push(fieldNotFoundHint);
			} else {
				throw error;
			}
		}

		if (fieldsNotFound.length) {
			this.addExecutionHints(...fieldsNotFound);
		}

		if (options.outputFormat === 'singleItem') {
			const executionData: INodeExecutionData = {
				json: flattenAggregationResultToObject(aggregationResult),
				pairedItem: newItems.map((_v, index) => ({
					item: index,
				})),
			};
			return [[executionData]];
		} else {
			if (!fieldsToSplitBy.length && 'pairedItems' in aggregationResult) {
				const { pairedItems, returnData } = aggregationResult;
				const executionData: INodeExecutionData = {
					json: returnData,
					pairedItem: (pairedItems ?? []).map((index) => ({ item: index })),
				};
				return [[executionData]];
			}
			const flatAggregationResults = flattenAggregationResultToArray(aggregationResult);
			const executionData = flatAggregationResults.map((item) => {
				const { pairedItems, returnData } = item;
				return {
					json: returnData,
					pairedItem: (pairedItems ?? []).map((index) => ({ item: index })),
				};
			});
			return [executionData];
		}
	}
}
