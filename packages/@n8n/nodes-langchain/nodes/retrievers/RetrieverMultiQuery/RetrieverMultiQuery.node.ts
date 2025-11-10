import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

export class RetrieverMultiQuery implements INodeType {
	description: INodeTypeDescription = {
		displayName: '多查询检索器',
		name: 'retrieverMultiQuery',
		icon: 'fa:box-open',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '自动化提示调优，生成多样化的查询并扩展文档池以增强检索效果',
		defaults: {
			name: '多查询检索器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Retrievers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.retrievermultiquery/',
					},
				],
			},
		},

		inputs: [
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
		outputs: [
			{
				displayName: '检索器',
				maxConnections: 1,
				type: NodeConnectionTypes.AiRetriever,
			},
		],
		properties: [
			{
				displayName: '选项',
				name: 'options',
				placeholder: '添加选项',
				description: '要添加的附加选项',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: '查询数量',
						name: 'queryCount',
						default: 3,
						typeOptions: { minValue: 1 },
						description: '要生成的给定问题的不同版本数量',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supplying data for MultiQuery Retriever');

		const options = this.getNodeParameter('options', itemIndex, {}) as { queryCount?: number };

		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;

		const baseRetriever = (await this.getInputConnectionData(
			NodeConnectionTypes.AiRetriever,
			itemIndex,
		)) as BaseRetriever;

		// TODO: Add support for parserKey

		const retriever = MultiQueryRetriever.fromLLM({
			llm: model,
			retriever: baseRetriever,
			...options,
		});

		return {
			response: logWrapper(retriever, this),
		};
	}
}
