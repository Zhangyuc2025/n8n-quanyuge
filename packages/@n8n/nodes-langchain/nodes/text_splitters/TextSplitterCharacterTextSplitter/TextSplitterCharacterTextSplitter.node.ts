import type { CharacterTextSplitterParams } from '@langchain/textsplitters';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class TextSplitterCharacterTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: '字符文本分割器',
		name: 'textSplitterCharacterTextSplitter',
		icon: 'fa:grip-lines-vertical',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '按字符将文本分割成块',
		defaults: {
			name: '字符文本分割器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplittercharactertextsplitter/',
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
				displayName: '分隔符',
				name: 'separator',
				type: 'string',
				default: '',
			},
			{
				displayName: '分块大小',
				name: 'chunkSize',
				type: 'number',
				default: 1000,
				description: '每个块的最大字符数',
			},
			{
				displayName: '分块重叠',
				name: 'chunkOverlap',
				type: 'number',
				default: 0,
				description: '连续分块之间共享的字符数，用于保留上下文',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply Data for Text Splitter');

		const separator = this.getNodeParameter('separator', itemIndex) as string;
		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;

		const params: CharacterTextSplitterParams = {
			separator,
			chunkSize,
			chunkOverlap,
			keepSeparator: false,
		};

		const splitter = new CharacterTextSplitter(params);

		return {
			response: logWrapper(splitter, this),
		};
	}
}
