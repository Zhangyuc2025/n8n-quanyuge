import type { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import type { SummarizationChainParams } from 'langchain/chains';
import { loadSummarizationChain } from 'langchain/chains';
import {
	NodeConnectionTypes,
	type INodeTypeBaseDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { getTemplateNoticeField } from '@utils/sharedFields';

import { REFINE_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from '../prompt';

export class ChainSummarizationV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: '摘要链',
				color: '#909298',
			},

			inputs: [
				NodeConnectionTypes.Main,
				{
					displayName: '模型',
					maxConnections: 1,
					type: NodeConnectionTypes.AiLanguageModel,
					required: true,
				},
				{
					displayName: '文档',
					maxConnections: 1,
					type: NodeConnectionTypes.AiDocument,
					required: true,
				},
			],
			outputs: [NodeConnectionTypes.Main],
			credentials: [],
			properties: [
				getTemplateNoticeField(1951),
				{
					displayName: '类型',
					name: 'type',
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
								'摘要第一个文档（或分块）。然后基于下一个文档（或分块）更新该摘要，并重复此过程',
						},
						{
							name: '填充',
							value: 'stuff',
							description: '一次性传递所有文档（或分块）。适用于小数据集',
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
							displayName: '最终合并提示词',
							name: 'combineMapPrompt',
							type: 'string',
							hint: '用于合并各个摘要的提示词',
							displayOptions: {
								show: {
									'/type': ['map_reduce'],
								},
							},
							default: DEFAULT_PROMPT_TEMPLATE,
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: '单个摘要提示词',
							name: 'prompt',
							type: 'string',
							default: DEFAULT_PROMPT_TEMPLATE,
							hint: '用于摘要单个文档（或分块）的提示词',
							displayOptions: {
								show: {
									'/type': ['map_reduce'],
								},
							},
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: '提示词',
							name: 'prompt',
							type: 'string',
							default: DEFAULT_PROMPT_TEMPLATE,
							displayOptions: {
								show: {
									'/type': ['stuff'],
								},
							},
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: '后续（精炼）提示词',
							name: 'refinePrompt',
							type: 'string',
							displayOptions: {
								show: {
									'/type': ['refine'],
								},
							},
							default: REFINE_PROMPT_TEMPLATE,
							hint: '基于下一个文档（或分块）精炼摘要的提示词',
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: '初始提示词',
							name: 'refineQuestionPrompt',
							type: 'string',
							displayOptions: {
								show: {
									'/type': ['refine'],
								},
							},
							default: DEFAULT_PROMPT_TEMPLATE,
							hint: '用于第一个文档（或分块）的提示词',
							typeOptions: {
								rows: 6,
							},
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Vector Store QA Chain');
		const type = this.getNodeParameter('type', 0) as 'map_reduce' | 'stuff' | 'refine';

		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const documentInput = (await this.getInputConnectionData(NodeConnectionTypes.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const options = this.getNodeParameter('options', 0, {}) as {
			prompt?: string;
			refineQuestionPrompt?: string;
			refinePrompt?: string;
			combineMapPrompt?: string;
		};

		const chainArgs: SummarizationChainParams = {
			type,
		};

		// Map reduce prompt override
		if (type === 'map_reduce') {
			const mapReduceArgs = chainArgs as SummarizationChainParams & {
				type: 'map_reduce';
			};
			if (options.combineMapPrompt) {
				mapReduceArgs.combineMapPrompt = new PromptTemplate({
					template: options.combineMapPrompt,
					inputVariables: ['text'],
				});
			}
			if (options.prompt) {
				mapReduceArgs.combinePrompt = new PromptTemplate({
					template: options.prompt,
					inputVariables: ['text'],
				});
			}
		}

		// Stuff prompt override
		if (type === 'stuff') {
			const stuffArgs = chainArgs as SummarizationChainParams & {
				type: 'stuff';
			};
			if (options.prompt) {
				stuffArgs.prompt = new PromptTemplate({
					template: options.prompt,
					inputVariables: ['text'],
				});
			}
		}

		// Refine prompt override
		if (type === 'refine') {
			const refineArgs = chainArgs as SummarizationChainParams & {
				type: 'refine';
			};

			if (options.refinePrompt) {
				refineArgs.refinePrompt = new PromptTemplate({
					template: options.refinePrompt,
					inputVariables: ['existing_answer', 'text'],
				});
			}

			if (options.refineQuestionPrompt) {
				refineArgs.questionPrompt = new PromptTemplate({
					template: options.refineQuestionPrompt,
					inputVariables: ['text'],
				});
			}
		}

		const chain = loadSummarizationChain(model, chainArgs);

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let processedDocuments: Document[];
			if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
				processedDocuments = await documentInput.processItem(items[itemIndex], itemIndex);
			} else {
				processedDocuments = documentInput;
			}

			const response = await chain.call({
				input_documents: processedDocuments,
			});

			returnData.push({ json: { response } });
		}

		return [returnData];
	}
}
