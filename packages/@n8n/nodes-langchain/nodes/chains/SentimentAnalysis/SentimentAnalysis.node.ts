import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { SystemMessagePromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { z } from 'zod';

import { getBatchingOptionFields } from '@utils/sharedFields';
import { getTracingConfig } from '@utils/tracing';

const DEFAULT_SYSTEM_PROMPT_TEMPLATE =
	'你是一个高度智能和准确的情感分析器。分析提供的文本的情感。将其分类为以下类别之一：{categories}。使用提供的格式化说明。只输出 JSON。';

const DEFAULT_CATEGORIES = '积极，中性，消极';
const configuredOutputs = (parameters: INodeParameters, defaultCategories: string) => {
	const options = (parameters?.options ?? {}) as IDataObject;
	const categories = (options?.categories as string) ?? defaultCategories;
	const categoriesArray = categories.split(',').map((cat) => cat.trim());

	const ret = categoriesArray.map((cat) => ({ type: 'main', displayName: cat }));
	return ret;
};

export class SentimentAnalysis implements INodeType {
	description: INodeTypeDescription = {
		displayName: '情感分析',
		name: 'sentimentAnalysis',
		icon: 'fa:balance-scale-left',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: '分析文本的情感',
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.sentimentanalysis/',
					},
				],
			},
		},
		defaults: {
			name: '情感分析',
		},
		inputs: [
			{ displayName: '', type: NodeConnectionTypes.Main },
			{
				displayName: '模型',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
		],
		outputs: `={{(${configuredOutputs})($parameter, "${DEFAULT_CATEGORIES}")}}`,
		properties: [
			{
				displayName: '要分析的文本',
				name: 'inputText',
				type: 'string',
				required: true,
				default: '',
				description: '使用表达式引用先前节点中的数据或输入静态文本',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName:
					'情感得分是 LLM 生成的估计值，而非统计学上严格的测量。它们在运行之间可能不一致，应仅用作粗略指标',
				name: 'detailedResultsNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.includeDetailedResults': [true],
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
						displayName: '情感类别',
						name: 'categories',
						type: 'string',
						default: DEFAULT_CATEGORIES,
						description: '要分析的逗号分隔类别列表',
						noDataExpression: true,
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: '系统提示词模板',
						name: 'systemPromptTemplate',
						type: 'string',
						default: DEFAULT_SYSTEM_PROMPT_TEMPLATE,
						description: '直接用作系统提示词模板的字符串',
						typeOptions: {
							rows: 6,
						},
					},
					{
						displayName: '包含详细结果',
						name: 'includeDetailedResults',
						type: 'boolean',
						default: false,
						description: '是否在输出中包含情感强度和置信度得分',
					},
					{
						displayName: '启用自动修复',
						name: 'enableAutoFixing',
						type: 'boolean',
						default: true,
						description: '是否启用自动修复（如果输出损坏，可能会触发额外的 LLM 调用）',
					},
					getBatchingOptionFields({
						show: {
							'@version': [{ _cnd: { gte: 1.1 } }],
						},
					}),
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const llm = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const returnData: INodeExecutionData[][] = [];

		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		if (this.getNode().typeVersion >= 1.1 && batchSize > 1) {
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					const itemIndex = i + batchItemIndex;
					const sentimentCategories = this.getNodeParameter(
						'options.categories',
						itemIndex,
						DEFAULT_CATEGORIES,
					) as string;

					const categories = sentimentCategories
						.split(',')
						.map((cat) => cat.trim())
						.filter(Boolean);

					if (categories.length === 0) {
						return {
							result: null,
							itemIndex,
							error: new NodeOperationError(this.getNode(), 'No sentiment categories provided', {
								itemIndex,
							}),
						};
					}

					// Initialize returnData with empty arrays for each category
					if (returnData.length === 0) {
						returnData.push(...Array.from({ length: categories.length }, () => []));
					}

					const options = this.getNodeParameter('options', itemIndex, {}) as {
						systemPromptTemplate?: string;
						includeDetailedResults?: boolean;
						enableAutoFixing?: boolean;
					};

					const schema = z.object({
						sentiment: z.enum(categories as [string, ...string[]]),
						strength: z
							.number()
							.min(0)
							.max(1)
							.describe('Strength score for sentiment in relation to the category'),
						confidence: z.number().min(0).max(1),
					});

					const structuredParser = StructuredOutputParser.fromZodSchema(schema);

					const parser = options.enableAutoFixing
						? OutputFixingParser.fromLLM(llm, structuredParser)
						: structuredParser;

					const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
						`${options.systemPromptTemplate ?? DEFAULT_SYSTEM_PROMPT_TEMPLATE}
				{format_instructions}`,
					);

					const input = this.getNodeParameter('inputText', itemIndex) as string;
					const inputPrompt = new HumanMessage(input);
					const messages = [
						await systemPromptTemplate.format({
							categories: sentimentCategories,
							format_instructions: parser.getFormatInstructions(),
						}),
						inputPrompt,
					];

					const prompt = ChatPromptTemplate.fromMessages(messages);
					const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(this));

					try {
						const output = await chain.invoke(messages);
						const sentimentIndex = categories.findIndex(
							(s) => s.toLowerCase() === output.sentiment.toLowerCase(),
						);

						if (sentimentIndex !== -1) {
							const resultItem = { ...items[itemIndex] };
							const sentimentAnalysis: IDataObject = {
								category: output.sentiment,
							};
							if (options.includeDetailedResults) {
								sentimentAnalysis.strength = output.strength;
								sentimentAnalysis.confidence = output.confidence;
							}
							resultItem.json = {
								...resultItem.json,
								sentimentAnalysis,
							};

							return {
								result: {
									resultItem,
									sentimentIndex,
								},
								itemIndex,
							};
						}

						return {
							result: {},
							itemIndex,
						};
					} catch (error) {
						return {
							result: null,
							itemIndex,
							error: new NodeOperationError(
								this.getNode(),
								'Error during parsing of LLM output, please check your LLM model and configuration',
								{
									itemIndex,
								},
							),
						};
					}
				});
				const batchResults = await Promise.all(batchPromises);

				batchResults.forEach(({ result, itemIndex, error }) => {
					if (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.message }),
								{ itemData: { item: itemIndex } },
							);

							returnData[0].push(...executionErrorData);
							return;
						} else {
							throw error;
						}
					} else if (result.resultItem && result.sentimentIndex !== -1) {
						const sentimentIndex = result.sentimentIndex;
						const resultItem = result.resultItem;
						returnData[sentimentIndex].push(resultItem);
					}
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			// Sequential Processing
			for (let i = 0; i < items.length; i++) {
				try {
					const sentimentCategories = this.getNodeParameter(
						'options.categories',
						i,
						DEFAULT_CATEGORIES,
					) as string;

					const categories = sentimentCategories
						.split(',')
						.map((cat) => cat.trim())
						.filter(Boolean);

					if (categories.length === 0) {
						throw new NodeOperationError(this.getNode(), 'No sentiment categories provided', {
							itemIndex: i,
						});
					}

					// Initialize returnData with empty arrays for each category
					if (returnData.length === 0) {
						returnData.push(...Array.from({ length: categories.length }, () => []));
					}

					const options = this.getNodeParameter('options', i, {}) as {
						systemPromptTemplate?: string;
						includeDetailedResults?: boolean;
						enableAutoFixing?: boolean;
					};

					const schema = z.object({
						sentiment: z.enum(categories as [string, ...string[]]),
						strength: z
							.number()
							.min(0)
							.max(1)
							.describe('Strength score for sentiment in relation to the category'),
						confidence: z.number().min(0).max(1),
					});

					const structuredParser = StructuredOutputParser.fromZodSchema(schema);

					const parser = options.enableAutoFixing
						? OutputFixingParser.fromLLM(llm, structuredParser)
						: structuredParser;

					const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
						`${options.systemPromptTemplate ?? DEFAULT_SYSTEM_PROMPT_TEMPLATE}
			{format_instructions}`,
					);

					const input = this.getNodeParameter('inputText', i) as string;
					const inputPrompt = new HumanMessage(input);
					const messages = [
						await systemPromptTemplate.format({
							categories: sentimentCategories,
							format_instructions: parser.getFormatInstructions(),
						}),
						inputPrompt,
					];

					const prompt = ChatPromptTemplate.fromMessages(messages);
					const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(this));

					try {
						const output = await chain.invoke(messages);
						const sentimentIndex = categories.findIndex(
							(s) => s.toLowerCase() === output.sentiment.toLowerCase(),
						);

						if (sentimentIndex !== -1) {
							const resultItem = { ...items[i] };
							const sentimentAnalysis: IDataObject = {
								category: output.sentiment,
							};
							if (options.includeDetailedResults) {
								sentimentAnalysis.strength = output.strength;
								sentimentAnalysis.confidence = output.confidence;
							}
							resultItem.json = {
								...resultItem.json,
								sentimentAnalysis,
							};
							returnData[sentimentIndex].push(resultItem);
						}
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							'Error during parsing of LLM output, please check your LLM model and configuration',
							{
								itemIndex: i,
							},
						);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: i } },
						);
						returnData[0].push(...executionErrorData);
						continue;
					}
					throw error;
				}
			}
		}
		return returnData;
	}
}
