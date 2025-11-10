import type { TextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { getConnectionHintNoticeField, metadataFilterField } from '@utils/sharedFields';

// Dependencies needed underneath the hood for the loaders. We add them
// here only to track where what dependency is sued
// import 'd3-dsv'; // for csv
import 'mammoth'; // for docx
import 'epub2'; // for epub
import 'pdf-parse'; // for pdf

export class DocumentBinaryInputLoader implements INodeType {
	description: INodeTypeDescription = {
		// This node is deprecated and will be removed in the future.
		// The functionality was merged with the `DocumentJSONInputLoader` to `DocumentDefaultDataLoader`
		hidden: true,
		displayName: '二进制输入加载器',
		name: 'documentBinaryInputLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: 1,
		description: '使用工作流中前一步骤的二进制数据',
		defaults: {
			name: '二进制输入加载器',
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
				required: true,
			},
		],

		outputs: [NodeConnectionTypes.AiDocument],
		outputNames: ['文档'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: '加载器类型',
				name: 'loader',
				type: 'options',
				default: 'jsonLoader',
				required: true,
				options: [
					{
						name: 'CSV 加载器',
						value: 'csvLoader',
						description: '加载 CSV 文件',
					},
					{
						name: 'Docx 加载器',
						value: 'docxLoader',
						description: '加载 Docx 文档',
					},
					{
						name: 'EPub 加载器',
						value: 'epubLoader',
						description: '加载 EPub 文件',
					},
					{
						name: 'JSON 加载器',
						value: 'jsonLoader',
						description: '加载 JSON 文件',
					},
					{
						name: 'PDF 加载器',
						value: 'pdfLoader',
						description: '加载 PDF 文档',
					},
					{
						name: '文本加载器',
						value: 'textLoader',
						description: '加载纯文本文件',
					},
				],
			},
			{
				displayName: '二进制数据键',
				name: 'binaryDataKey',
				type: 'string',
				default: 'data',
				required: true,
				description: '用于读取文件缓冲区的二进制属性名称',
			},
			// PDF Only Fields
			{
				displayName: '拆分页面',
				name: 'splitPages',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						loader: ['pdfLoader'],
					},
				},
			},
			// CSV Only Fields
			{
				displayName: '列',
				name: 'column',
				type: 'string',
				default: '',
				description: '从 CSV 中提取的列',
				displayOptions: {
					show: {
						loader: ['csvLoader'],
					},
				},
			},
			{
				displayName: '分隔符',
				name: 'separator',
				type: 'string',
				description: '用于 CSV 的分隔符',
				default: ',',
				displayOptions: {
					show: {
						loader: ['csvLoader'],
					},
				},
			},
			// JSON Only Fields
			{
				displayName: '指针',
				name: 'pointers',
				type: 'string',
				default: '',
				description: '从 JSON 中提取的指针，例如："/text" 或 "/text, /meta/title"',
				displayOptions: {
					show: {
						loader: ['jsonLoader'],
					},
				},
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
		this.logger.debug('Supply Data for Binary Input Loader');
		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionTypes.AiTextSplitter,
			0,
		)) as TextSplitter | undefined;

		const binaryDataKey = this.getNodeParameter('binaryDataKey', 0) as string;
		const processor = new N8nBinaryLoader(this, undefined, binaryDataKey, textSplitter);

		return {
			response: logWrapper(processor, this),
		};
	}
}
