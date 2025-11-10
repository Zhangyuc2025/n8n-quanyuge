import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { NodeOperationError, NodeConnectionTypes, sleep } from 'n8n-workflow';
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

import { processItem } from './processItem';

const SYSTEM_PROMPT_TEMPLATE =
	"Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json.";

const configuredOutputs = (parameters: INodeParameters) => {
	const categories = ((parameters.categories as IDataObject)?.categories as IDataObject[]) ?? [];
	const fallback = (parameters.options as IDataObject)?.fallback as string;
	const ret = categories.map((cat) => {
		return { type: 'main', displayName: cat.category };
	});
	if (fallback === 'other') ret.push({ type: 'main', displayName: 'Other' });
	return ret;
};

export class TextClassifier implements INodeType {
	description: INodeTypeDescription = {
		displayName: '文本分类器',
		name: 'textClassifier',
		icon: 'fa:tags',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: '将文本分类为不同的类别',
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.text-classifier/',
					},
				],
			},
		},
		defaults: {
			name: '文本分类器',
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
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		properties: [
			{
				displayName: '要分类的文本',
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
				displayName: '类别',
				name: 'categories',
				placeholder: '添加类别',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'categories',
						displayName: '类别',
						values: [
							{
								displayName: '类别',
								name: 'category',
								type: 'string',
								default: '',
								description: '要添加的类别',
								required: true,
							},
							{
								displayName: '描述',
								name: 'description',
								type: 'string',
								default: '',
								description: '如果类别不明显，请描述您的类别',
							},
						],
					},
				],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: '添加选项',
				options: [
					{
						displayName: '允许多个类别为真',
						name: 'multiClass',
						type: 'boolean',
						default: false,
					},
					{
						displayName: '当没有明确匹配时',
						name: 'fallback',
						type: 'options',
						default: 'discard',
						description: '对于不完全匹配类别的项目如何处理',
						options: [
							{
								name: '丢弃项目',
								value: 'discard',
								description: '忽略该项目并从输出中删除',
							},
							{
								name: "在额外的'其他'分支上输出",
								value: 'other',
								description: "创建一个名为'其他'的单独输出分支",
							},
						],
					},
					{
						displayName: '系统提示词模板',
						name: 'systemPromptTemplate',
						type: 'string',
						default: SYSTEM_PROMPT_TEMPLATE,
						description: '直接用作系统提示词模板的字符串',
						typeOptions: {
							rows: 6,
						},
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
		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		const llm = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const categories = this.getNodeParameter('categories.categories', 0, []) as Array<{
			category: string;
			description: string;
		}>;

		if (categories.length === 0) {
			throw new NodeOperationError(this.getNode(), 'At least one category must be defined');
		}

		const options = this.getNodeParameter('options', 0, {}) as {
			multiClass: boolean;
			fallback?: string;
			systemPromptTemplate?: string;
			enableAutoFixing: boolean;
		};
		const multiClass = options?.multiClass ?? false;
		const fallback = options?.fallback ?? 'discard';

		const schemaEntries = categories.map((cat) => [
			cat.category,
			z
				.boolean()
				.describe(
					`Should be true if the input has category "${cat.category}" (description: ${cat.description})`,
				),
		]);
		if (fallback === 'other')
			schemaEntries.push([
				'fallback',
				z.boolean().describe('Should be true if none of the other categories apply'),
			]);
		const schema = z.object(Object.fromEntries(schemaEntries));

		const structuredParser = StructuredOutputParser.fromZodSchema(schema);

		const parser = options.enableAutoFixing
			? OutputFixingParser.fromLLM(llm, structuredParser)
			: structuredParser;

		const multiClassPrompt = multiClass
			? 'Categories are not mutually exclusive, and multiple can be true'
			: 'Categories are mutually exclusive, and only one can be true';

		const fallbackPrompt = {
			other: 'If no categories apply, select the "fallback" option.',
			discard: 'If there is not a very fitting category, select none of the categories.',
		}[fallback];

		const returnData: INodeExecutionData[][] = Array.from(
			{ length: categories.length + (fallback === 'other' ? 1 : 0) },
			(_) => [],
		);

		if (this.getNode().typeVersion >= 1.1 && batchSize > 1) {
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					const itemIndex = i + batchItemIndex;
					const item = items[itemIndex];

					return await processItem(
						this,
						itemIndex,
						item,
						llm,
						parser,
						categories,
						multiClassPrompt,
						fallbackPrompt,
					);
				});

				const batchResults = await Promise.allSettled(batchPromises);

				batchResults.forEach((response, batchItemIndex) => {
					const index = i + batchItemIndex;
					if (response.status === 'rejected') {
						const error = response.reason as Error;
						if (this.continueOnFail()) {
							returnData[0].push({
								json: { error: error.message },
								pairedItem: { item: index },
							});
							return;
						} else {
							throw new NodeOperationError(this.getNode(), error.message);
						}
					} else {
						const output = response.value;
						const item = items[index];

						categories.forEach((cat, idx) => {
							if (output[cat.category]) returnData[idx].push(item);
						});

						if (fallback === 'other' && output.fallback)
							returnData[returnData.length - 1].push(item);
					}
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const item = items[itemIndex];

				try {
					const output = await processItem(
						this,
						itemIndex,
						item,
						llm,
						parser,
						categories,
						multiClassPrompt,
						fallbackPrompt,
					);

					categories.forEach((cat, idx) => {
						if (output[cat.category]) returnData[idx].push(item);
					});
					if (fallback === 'other' && output.fallback) returnData[returnData.length - 1].push(item);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData[0].push({
							json: { error: error.message },
							pairedItem: { item: itemIndex },
						});

						continue;
					}

					throw error;
				}
			}
		}

		return returnData;
	}
}
