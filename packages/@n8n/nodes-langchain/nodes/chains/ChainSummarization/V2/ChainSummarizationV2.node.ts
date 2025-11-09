import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeInputConfiguration,
} from 'n8n-workflow';
import { NodeConnectionTypes, sleep } from 'n8n-workflow';

import { getBatchingOptionFields, getTemplateNoticeField } from '@utils/sharedFields';

import { processItem } from './processItem';
import { REFINE_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from '../prompt';

function getInputs(parameters: IDataObject) {
	const chunkingMode = parameters?.chunkingMode;
	const operationMode = parameters?.operationMode;
	const inputs: INodeInputConfiguration[] = [
		{ displayName: '', type: 'main' },
		{
			displayName: '模型',
			maxConnections: 1,
			type: 'ai_languageModel',
			required: true,
		},
	];

	if (operationMode === 'documentLoader') {
		inputs.push({
			displayName: '文档',
			type: 'ai_document',
			required: true,
			maxConnections: 1,
		});
		return inputs;
	}

	if (chunkingMode === 'advanced') {
		inputs.push({
			displayName: '文本分割器',
			type: 'ai_textSplitter',
			required: false,
			maxConnections: 1,
		});
		return inputs;
	}
	return inputs;
}

export class ChainSummarizationV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2, 2.1],
			defaults: {
				name: '摘要链',
				color: '#909298',
			},

			inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
			outputs: [NodeConnectionTypes.Main],
			credentials: [],
			properties: [
				getTemplateNoticeField(1951),
				{
					displayName: '要摘要的数据',
					name: 'operationMode',
					noDataExpression: true,
					type: 'options',
					description: '如何将数据传入摘要链',
					default: 'nodeInputJson',
					options: [
						{
							name: '使用节点输入（JSON）',
							value: 'nodeInputJson',
							description: '摘要从上一个节点传入本节点的 JSON 数据',
						},
						{
							name: '使用节点输入（二进制）',
							value: 'nodeInputBinary',
							description: '摘要从上一个节点传入本节点的二进制数据',
						},
						{
							name: '使用文档加载器',
							value: 'documentLoader',
							description: '使用具有更多配置选项的加载器子节点',
						},
					],
				},
				{
					displayName: '分块策略',
					name: 'chunkingMode',
					noDataExpression: true,
					type: 'options',
					description: '分块分割策略',
					default: 'simple',
					options: [
						{
							name: '简单（在下面定义）',
							value: 'simple',
						},
						{
							name: '高级',
							value: 'advanced',
							description: '使用具有更多配置选项的分割器子节点',
						},
					],
					displayOptions: {
						show: {
							'/operationMode': ['nodeInputJson', 'nodeInputBinary'],
						},
					},
				},
				{
					displayName: '每个分块的字符数',
					name: 'chunkSize',
					description: '控制最终文档分块的最大大小（以字符数计）',
					type: 'number',
					default: 1000,
					displayOptions: {
						show: {
							'/chunkingMode': ['simple'],
						},
					},
				},
				{
					displayName: '分块重叠（字符）',
					name: 'chunkOverlap',
					type: 'number',
					description: '指定分块之间应有多少字符重叠',
					default: 200,
					displayOptions: {
						show: {
							'/chunkingMode': ['simple'],
						},
					},
				},
				{
					displayName: '选项',
					name: 'options',
					type: 'collection',
					default: {},
					placeholder: '添加选项',
					options: [
						{
							displayName: '输入数据字段名称',
							name: 'binaryDataKey',
							type: 'string',
							default: 'data',
							description: '智能体或链输入中包含要处理的二进制文件的字段名称',
							displayOptions: {
								show: {
									'/operationMode': ['nodeInputBinary'],
								},
							},
						},
						{
							displayName: '摘要方法和提示词',
							name: 'summarizationMethodAndPrompts',
							type: 'fixedCollection',
							default: {
								values: {
									summarizationMethod: 'map_reduce',
									prompt: DEFAULT_PROMPT_TEMPLATE,
									combineMapPrompt: DEFAULT_PROMPT_TEMPLATE,
								},
							},
							placeholder: '添加选项',
							typeOptions: {},
							options: [
								{
									name: 'values',
									displayName: '值',
									values: [
										{
											displayName: '摘要方法',
											name: 'summarizationMethod',
											type: 'options',
											description: '要运行的摘要类型',
											default: 'map_reduce',
											options: [
												{
													name: '映射归并（推荐）',
													value: 'map_reduce',
													description: '分别摘要每个文档（或分块），然后再摘要这些摘要',
												},
												{
													name: '精炼',
													value: 'refine',
													description:
														'摘要第一个文档（或分块），然后基于下一个文档（或分块）更新该摘要，并重复此过程',
												},
												{
													name: '填充',
													value: 'stuff',
													description: '一次性传递所有文档（或分块）。适用于小数据集',
												},
											],
										},
										{
											displayName: '单个摘要提示词',
											name: 'combineMapPrompt',
											type: 'string',
											hint: '用于摘要单个文档（或分块）的提示词',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'refine',
													],
												},
											},
											default: DEFAULT_PROMPT_TEMPLATE,
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: '最终合并提示词',
											name: 'prompt',
											type: 'string',
											default: DEFAULT_PROMPT_TEMPLATE,
											hint: '用于合并各个摘要的提示词',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'refine',
													],
												},
											},
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: '提示词',
											name: 'prompt',
											type: 'string',
											default: DEFAULT_PROMPT_TEMPLATE,
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'refine',
														'map_reduce',
													],
												},
											},
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: '后续（精炼）提示词',
											name: 'refinePrompt',
											type: 'string',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'map_reduce',
													],
												},
											},
											default: REFINE_PROMPT_TEMPLATE,
											hint: '基于下一个文档（或分块）精炼摘要的提示词',
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: '初始提示词',
											name: 'refineQuestionPrompt',
											type: 'string',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'map_reduce',
													],
												},
											},
											default: DEFAULT_PROMPT_TEMPLATE,
											hint: '用于第一个文档（或分块）的提示词',
											typeOptions: {
												rows: 9,
											},
										},
									],
								},
							],
						},
						getBatchingOptionFields({
							show: {
								'@version': [{ _cnd: { gte: 2.1 } }],
							},
						}),
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Summarization Chain V2');
		const operationMode = this.getNodeParameter('operationMode', 0, 'nodeInputJson') as
			| 'nodeInputJson'
			| 'nodeInputBinary'
			| 'documentLoader';
		const chunkingMode = this.getNodeParameter('chunkingMode', 0, 'simple') as
			| 'simple'
			| 'advanced';

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		if (this.getNode().typeVersion >= 2.1 && batchSize > 1) {
			// Batch processing
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (item, batchItemIndex) => {
					const itemIndex = i + batchItemIndex;
					return await processItem(this, itemIndex, item, operationMode, chunkingMode);
				});

				const batchResults = await Promise.allSettled(batchPromises);
				batchResults.forEach((response, index) => {
					if (response.status === 'rejected') {
						const error = response.reason as Error;
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i + index },
							});
						} else {
							throw error;
						}
					} else {
						const output = response.value;
						returnData.push({ json: { output } });
					}
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const response = await processItem(
						this,
						itemIndex,
						items[itemIndex],
						operationMode,
						chunkingMode,
					);
					returnData.push({ json: { response } });
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
						continue;
					}

					throw error;
				}
			}
		}

		return [returnData];
	}
}
