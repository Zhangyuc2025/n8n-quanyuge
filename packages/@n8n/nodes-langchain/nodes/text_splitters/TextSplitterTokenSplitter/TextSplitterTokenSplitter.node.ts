import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { TokenTextSplitter } from './TokenTextSplitter';

export class TextSplitterTokenSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Token 分割器',
		name: 'textSplitterTokenSplitter',
		icon: 'fa:grip-lines-vertical',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '按 Token 将文本分割成块',
		defaults: {
			name: 'Token 分割器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplittertokensplitter/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiTextSplitter],
		outputNames: ['文本分割器'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiDocument]),
			{
				displayName: '分块大小',
				name: 'chunkSize',
				type: 'number',
				default: 1000,
				description: '每个块的最大 Token 数',
			},
			{
				displayName: '分块重叠',
				name: 'chunkOverlap',
				type: 'number',
				default: 0,
				description: '连续分块之间共享的 Token 数，用于保留上下文',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply Data for Text Splitter');

		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;

		const splitter = new TokenTextSplitter({
			chunkSize,
			chunkOverlap,
			allowedSpecial: 'all',
			disallowedSpecial: 'all',
			encodingName: 'cl100k_base',
			keepSeparator: false,
		});

		return {
			response: logWrapper(splitter, this),
		};
	}
}
