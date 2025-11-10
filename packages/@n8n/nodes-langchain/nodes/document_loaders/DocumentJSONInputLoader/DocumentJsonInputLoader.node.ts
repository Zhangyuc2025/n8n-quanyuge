import type { TextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { getConnectionHintNoticeField, metadataFilterField } from '@utils/sharedFields';

export class DocumentJsonInputLoader implements INodeType {
	description: INodeTypeDescription = {
		// This node is deprecated and will be removed in the future.
		// The functionality was merged with the `DocumentBinaryInputLoader` to `DocumentDefaultDataLoader`
		hidden: true,
		displayName: 'JSON 输入加载器',
		name: 'documentJsonInputLoader',
		icon: 'file:json.svg',
		group: ['transform'],
		version: 1,
		description: '使用工作流中前一步骤的 JSON 数据',
		defaults: {
			name: 'JSON 输入加载器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentdefaultdataloader/',
					},
				],
			},
		},

		inputs: [
			{
				displayName: '文本分割器',
				maxConnections: 1,
				type: NodeConnectionTypes.AiTextSplitter,
			},
		],
		inputNames: ['文本分割器'],

		outputs: [NodeConnectionTypes.AiDocument],
		outputNames: ['文档'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: '指针',
				name: 'pointers',
				type: 'string',
				default: '',
				description: '从 JSON 中提取的指针，例如："/text" 或 "/text, /meta/title"',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						...metadataFilterField,
						displayName: '元数据',
						description: '要添加到每个文档的元数据。可用于检索时的过滤',
						placeholder: '添加属性',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		this.logger.debug('Supply Data for JSON Input Loader');
		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionTypes.AiTextSplitter,
			0,
		)) as TextSplitter | undefined;

		const processor = new N8nJsonLoader(this, undefined, textSplitter);

		return {
			response: logWrapper(processor, this),
		};
	}
}
