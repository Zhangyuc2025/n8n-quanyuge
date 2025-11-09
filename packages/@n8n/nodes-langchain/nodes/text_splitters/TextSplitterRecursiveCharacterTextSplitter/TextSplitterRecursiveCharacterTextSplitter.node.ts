import type {
	RecursiveCharacterTextSplitterParams,
	SupportedTextSplitterLanguage,
} from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

const supportedLanguages: SupportedTextSplitterLanguage[] = [
	'cpp',
	'go',
	'java',
	'js',
	'php',
	'proto',
	'python',
	'rst',
	'ruby',
	'rust',
	'scala',
	'swift',
	'markdown',
	'latex',
	'html',
];
export class TextSplitterRecursiveCharacterTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: '递归字符文本分割器',
		name: 'textSplitterRecursiveCharacterTextSplitter',
		icon: 'fa:grip-lines-vertical',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '递归地按字符将文本分割成块，推荐用于大多数使用场景',
		defaults: {
			name: '递归字符文本分割器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplitterrecursivecharactertextsplitter/',
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
			},
			{
				displayName: '分块重叠',
				name: 'chunkOverlap',
				type: 'number',
				default: 0,
			},
			{
				displayName: '选项',
				name: 'options',
				placeholder: '添加选项',
				description: '要添加的额外选项',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: '分割代码',
						name: 'splitCode',
						default: 'markdown',
						type: 'options',
						options: supportedLanguages.map((lang) => ({ name: lang, value: lang })),
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply Data for Text Splitter');

		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;
		const splitCode = this.getNodeParameter(
			'options.splitCode',
			itemIndex,
			null,
		) as SupportedTextSplitterLanguage | null;
		const params: RecursiveCharacterTextSplitterParams = {
			// TODO: These are the default values, should we allow the user to change them?
			separators: ['\n\n', '\n', ' ', ''],
			chunkSize,
			chunkOverlap,
			keepSeparator: false,
		};
		let splitter: RecursiveCharacterTextSplitter;

		if (splitCode && supportedLanguages.includes(splitCode)) {
			splitter = RecursiveCharacterTextSplitter.fromLanguage(splitCode, params);
		} else {
			splitter = new RecursiveCharacterTextSplitter(params);
		}

		return {
			response: logWrapper(splitter, this),
		};
	}
}
