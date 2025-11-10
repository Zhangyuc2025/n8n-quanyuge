import { RecursiveCharacterTextSplitter, type TextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type IDataObject,
	type INodeInputConfiguration,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { metadataFilterField } from '@utils/sharedFields';

// Dependencies needed underneath the hood for the loaders. We add them
// here only to track where what dependency is sued
// import 'd3-dsv'; // for csv
import 'mammoth'; // for docx
import 'epub2'; // for epub
import 'pdf-parse'; // for pdf

function getInputs(parameters: IDataObject) {
	const inputs: INodeInputConfiguration[] = [];

	const textSplittingMode = parameters?.textSplittingMode;
	// If text splitting mode is 'custom' or does not exist (v1), we need to add an input for the text splitter
	if (!textSplittingMode || textSplittingMode === 'custom') {
		inputs.push({
			displayName: '文本分割器',
			maxConnections: 1,
			type: 'ai_textSplitter',
			required: true,
		});
	}

	return inputs;
}

export class DocumentDefaultDataLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: '默认数据加载器',
		name: 'documentDefaultDataLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		description: '从工作流中前一步骤加载数据',
		defaults: {
			name: '默认数据加载器',
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

		inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,

		outputs: [NodeConnectionTypes.AiDocument],
		outputNames: ['文档'],
		properties: [
			{
				displayName:
					'此节点将从工作流中的前一步骤加载数据。<a href="/templates/1962" target="_blank">示例</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '数据类型',
				name: 'dataType',
				type: 'options',
				default: 'json',
				required: true,
				noDataExpression: true,
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: '处理工作流中前一步骤的 JSON 数据',
					},
					{
						name: '二进制',
						value: 'binary',
						description: '处理工作流中前一步骤的二进制数据',
					},
				],
			},
			{
				displayName: '模式',
				name: 'jsonMode',
				type: 'options',
				default: 'allInputData',
				required: true,
				displayOptions: {
					show: {
						dataType: ['json'],
					},
				},
				options: [
					{
						name: '加载所有输入数据',
						value: 'allInputData',
						description: '使用流入父级智能体或链的所有 JSON 数据',
					},
					{
						name: '加载特定数据',
						value: 'expressionData',
						description: '加载数据的子集，和/或工作流中任何前一步骤的数据',
					},
				],
			},
			{
				displayName: '模式',
				name: 'binaryMode',
				type: 'options',
				default: 'allInputData',
				required: true,
				displayOptions: {
					show: {
						dataType: ['binary'],
					},
				},
				options: [
					{
						name: '加载所有输入数据',
						value: 'allInputData',
						description: '使用流入父级智能体或链的所有二进制数据',
					},
					{
						name: '加载特定数据',
						value: 'specificField',
						description: '从父级智能体或链的特定字段加载数据',
					},
				],
			},
			{
				displayName: '数据格式',
				name: 'loader',
				type: 'options',
				default: 'auto',
				required: true,
				displayOptions: {
					show: {
						dataType: ['binary'],
					},
				},
				options: [
					{
						name: '通过 MIME 类型自动检测',
						value: 'auto',
						description: '使用 MIME 类型检测格式',
					},
					{
						name: 'CSV',
						value: 'csvLoader',
						description: '加载 CSV 文件',
					},
					{
						name: 'Docx',
						value: 'docxLoader',
						description: '加载 Docx 文档',
					},
					{
						name: 'EPub',
						value: 'epubLoader',
						description: '加载 EPub 文件',
					},
					{
						name: 'JSON',
						value: 'jsonLoader',
						description: '加载 JSON 文件',
					},
					{
						name: 'PDF',
						value: 'pdfLoader',
						description: '加载 PDF 文档',
					},
					{
						name: '文本',
						value: 'textLoader',
						description: '加载纯文本文件',
					},
				],
			},
			{
				displayName: '数据',
				name: 'jsonData',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				required: true,
				description: '从输入面板拖放字段，或使用表达式',
				displayOptions: {
					show: {
						dataType: ['json'],
						jsonMode: ['expressionData'],
					},
				},
			},
			{
				displayName: '输入数据字段名称',
				name: 'binaryDataKey',
				type: 'string',
				default: 'data',
				required: true,
				description: '智能体或链的输入中包含要处理的二进制文件的字段名称',
				displayOptions: {
					show: {
						dataType: ['binary'],
					},
					hide: {
						binaryMode: ['allInputData'],
					},
				},
			},
			{
				displayName: '文本分割',
				name: 'textSplittingMode',
				type: 'options',
				default: 'simple',
				required: true,
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
				options: [
					{
						name: '简单模式',
						value: 'simple',
						description: '每 1000 个字符分割一次，重叠 200 个字符',
					},
					{
						name: '自定义模式',
						value: 'custom',
						description: '连接自定义的文本分割子节点',
					},
				],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: 'JSON 指针',
						name: 'pointers',
						type: 'string',
						default: '',
						description: '从 JSON 中提取的指针，例如："/text" 或 "/text, /meta/title"',
						displayOptions: {
							show: {
								'/loader': ['jsonLoader', 'auto'],
							},
						},
					},
					{
						displayName: 'CSV 分隔符',
						name: 'separator',
						type: 'string',
						description: '用于 CSV 的分隔符',
						default: ',',
						displayOptions: {
							show: {
								'/loader': ['csvLoader', 'auto'],
							},
						},
					},
					{
						displayName: 'CSV 列',
						name: 'column',
						type: 'string',
						default: '',
						description: '从 CSV 中提取的列',
						displayOptions: {
							show: {
								'/loader': ['csvLoader', 'auto'],
							},
						},
					},
					{
						displayName: '拆分 PDF 页面',
						description: '是否将 PDF 页面拆分为单独的文档',
						name: 'splitPages',
						type: 'boolean',
						default: true,
						displayOptions: {
							show: {
								'/loader': ['pdfLoader', 'auto'],
							},
						},
					},
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const dataType = this.getNodeParameter('dataType', itemIndex, 'json') as 'json' | 'binary';

		let textSplitter: TextSplitter | undefined;

		if (node.typeVersion === 1.1) {
			const textSplittingMode = this.getNodeParameter('textSplittingMode', itemIndex, 'simple') as
				| 'simple'
				| 'custom';

			if (textSplittingMode === 'simple') {
				textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
			} else if (textSplittingMode === 'custom') {
				textSplitter = (await this.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
					| TextSplitter
					| undefined;
			}
		} else {
			textSplitter = (await this.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
				| TextSplitter
				| undefined;
		}

		const binaryDataKey = this.getNodeParameter('binaryDataKey', itemIndex, '') as string;

		const processor =
			dataType === 'binary'
				? new N8nBinaryLoader(this, 'options.', binaryDataKey, textSplitter)
				: new N8nJsonLoader(this, 'options.', textSplitter);

		return {
			response: logWrapper(processor, this),
		};
	}
}
