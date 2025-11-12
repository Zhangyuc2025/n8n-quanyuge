import { NodeConnectionTypes, parseErrorMetadata, sleep } from 'n8n-workflow';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	promptTypeOptions,
	textFromGuardrailsNode,
	textFromPreviousNode,
} from '@utils/descriptions';
import { getBatchingOptionFields, getTemplateNoticeField } from '@utils/sharedFields';

import { INPUT_TEMPLATE_KEY, LEGACY_INPUT_TEMPLATE_KEY, systemPromptOption } from './constants';
import { processItem } from './processItem';

export class ChainRetrievalQa implements INodeType {
	description: INodeTypeDescription = {
		displayName: '问答链',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
		description: '回答关于检索到的文档的问题',
		defaults: {
			name: '问答链',
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainretrievalqa/',
					},
				],
			},
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
				displayName: '检索器',
				maxConnections: 1,
				type: NodeConnectionTypes.AiRetriever,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			getTemplateNoticeField(1960),
			{
				displayName: '查询',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.input }}',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: '查询',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.chat_input }}',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				displayName: '查询',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.chatInput }}',
				displayOptions: {
					show: {
						'@version': [1.2],
					},
				},
			},
			{
				...promptTypeOptions,
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { lte: 1.2 } }],
					},
				},
			},
			{
				...textFromGuardrailsNode,
				displayOptions: {
					show: { promptType: ['guardrails'], '@version': [{ _cnd: { gte: 1.4 } }] },
				},
			},
			{
				...textFromPreviousNode,
				displayOptions: { show: { promptType: ['auto'], '@version': [{ _cnd: { gte: 1.4 } }] } },
			},
			{
				displayName: '提示词（用户消息）',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
				placeholder: '例如：你好，你能帮我什么？',
				typeOptions: {
					rows: 2,
				},
				displayOptions: {
					show: {
						promptType: ['define'],
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
						...systemPromptOption,
						description: `用于系统提示词的模板字符串。这应包含变量 \`{context}\` 来表示提供的上下文。对于文本完成模型，您还应包含变量 \`{${LEGACY_INPUT_TEMPLATE_KEY}}\` 来表示用户的查询`,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { lt: 1.5 } }],
							},
						},
					},
					{
						...systemPromptOption,
						description: `用于系统提示词的模板字符串。这应包含变量 \`{context}\` 来表示提供的上下文。对于文本完成模型，您还应包含变量 \`{${INPUT_TEMPLATE_KEY}}\` 来表示用户的查询`,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.5 } }],
							},
						},
					},
					getBatchingOptionFields({
						show: {
							'@version': [{ _cnd: { gte: 1.6 } }],
						},
					}),
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Retrieval QA Chain');

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		if (this.getNode().typeVersion >= 1.6 && batchSize >= 1) {
			// Run in batches
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					return await processItem(this, i + batchItemIndex);
				});

				const batchResults = await Promise.allSettled(batchPromises);

				batchResults.forEach((response, index) => {
					if (response.status === 'rejected') {
						const error = response.reason;
						if (this.continueOnFail()) {
							const metadata = parseErrorMetadata(error);
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: index },
								metadata,
							});
							return;
						} else {
							throw error;
						}
					}
					const output = response.value;
					const answer = output.answer as string;
					if (this.getNode().typeVersion >= 1.5) {
						returnData.push({ json: { response: answer } });
					} else {
						// Legacy format for versions 1.4 and below is { text: string }
						returnData.push({ json: { response: { text: answer } } });
					}
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			// Run for each item
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const response = await processItem(this, itemIndex);
					const answer = response.answer as string;
					if (this.getNode().typeVersion >= 1.5) {
						returnData.push({ json: { response: answer } });
					} else {
						// Legacy format for versions 1.4 and below is { text: string }
						returnData.push({ json: { response: { text: answer } } });
					}
				} catch (error) {
					if (this.continueOnFail()) {
						const metadata = parseErrorMetadata(error);
						returnData.push({
							json: { error: error.message },
							pairedItem: { item: itemIndex },
							metadata,
						});
						continue;
					}

					throw error;
				}
			}
		}
		return [returnData];
	}
}
