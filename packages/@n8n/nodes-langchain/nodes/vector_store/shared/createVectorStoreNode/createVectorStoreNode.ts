import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	SupplyData,
	ISupplyDataFunctions,
	INodeType,
	INodeProperties,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

// Import custom types
import {
	handleLoadOperation,
	handleInsertOperation,
	handleUpdateOperation,
	handleRetrieveOperation,
	handleRetrieveAsToolOperation,
	handleRetrieveAsToolExecuteOperation,
} from './operations';
import type { NodeOperationMode, VectorStoreNodeConstructorArgs } from './types';
// Import utility functions
import { transformDescriptionForOperationMode, getOperationModeOptions } from './utils';

const ragStarterCallout: INodeProperties = {
	displayName: '提示：通过我们的 RAG 入门模板快速了解 n8n 中的向量存储',
	name: 'ragStarterCallout',
	type: 'callout',
	typeOptions: {
		calloutAction: {
			label: 'RAG 入门模板',
			type: 'openSampleWorkflowTemplate',
			templateId: 'rag-starter-template',
		},
	},
	default: '',
};

/**
 * Creates a vector store node with the given configuration
 * This factory function produces a complete node class that implements all vector store operations
 */
export const createVectorStoreNode = <T extends VectorStore = VectorStore>(
	args: VectorStoreNodeConstructorArgs<T>,
) =>
	class VectorStoreNodeType implements INodeType {
		description: INodeTypeDescription = {
			displayName: args.meta.displayName,
			name: args.meta.name,
			description: args.meta.description,
			icon: args.meta.icon,
			iconColor: args.meta.iconColor,
			group: ['transform'],
			// 1.2 has changes to VectorStoreInMemory node.
			// 1.3 drops `toolName` and uses node name as the tool name.
			version: [1, 1.1, 1.2, 1.3],
			defaults: {
				name: args.meta.displayName,
			},
			codex: {
				categories: args.meta.categories ?? ['AI'],
				subcategories: args.meta.subcategories ?? {
					AI: ['Vector Stores', 'Tools', 'Root Nodes'],
					'Vector Stores': ['Other Vector Stores'],
					Tools: ['Other Tools'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: args.meta.docsUrl,
						},
					],
				},
			},
			credentials: args.meta.credentials,

			inputs: `={{
			((parameters) => {
				const mode = parameters?.mode;
				const useReranker = parameters?.useReranker;
				const inputs = [{ displayName: "嵌入", type: "${NodeConnectionTypes.AiEmbedding}", required: true, maxConnections: 1}]

				if (['load', 'retrieve', 'retrieve-as-tool'].includes(mode) && useReranker) {
					inputs.push({ displayName: "重排序器", type: "${NodeConnectionTypes.AiReranker}", required: true, maxConnections: 1})
				}

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (['insert', 'load', 'update'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionTypes.Main}"})
				}

				if (['insert'].includes(mode)) {
					inputs.push({ displayName: "文档", type: "${NodeConnectionTypes.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}`,
			outputs: `={{
			((parameters) => {
				const mode = parameters?.mode ?? 'retrieve';

				if (mode === 'retrieve-as-tool') {
					return [{ displayName: "工具", type: "${NodeConnectionTypes.AiTool}"}]
				}

				if (mode === 'retrieve') {
					return [{ displayName: "向量存储", type: "${NodeConnectionTypes.AiVectorStore}"}]
				}
				return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
			})($parameter)
		}}`,
			properties: [
				ragStarterCallout,
				{
					displayName: '操作模式',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					default: 'retrieve',
					options: getOperationModeOptions(args),
				},
				{
					...getConnectionHintNoticeField([NodeConnectionTypes.AiRetriever]),
					displayOptions: {
						show: {
							mode: ['retrieve'],
						},
					},
				},
				{
					displayName: '名称',
					name: 'toolName',
					type: 'string',
					default: '',
					required: true,
					description: '向量存储的名称',
					placeholder: '例如：company_knowledge_base',
					validateType: 'string-alphanumeric',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { lte: 1.2 } }],
							mode: ['retrieve-as-tool'],
						},
					},
				},
				{
					displayName: '描述',
					name: 'toolDescription',
					type: 'string',
					default: '',
					required: true,
					typeOptions: { rows: 2 },
					description: '向 LLM 解释此工具的用途，一个好的、具体的描述能让 LLM 更频繁地产生预期结果',
					placeholder: `例如：${args.meta.description}`,
					displayOptions: {
						show: {
							mode: ['retrieve-as-tool'],
						},
					},
				},
				...args.sharedFields,
				{
					displayName: '嵌入批次大小',
					name: 'embeddingBatchSize',
					type: 'number',
					default: 200,
					description: '单个批次中嵌入的文档数量',
					displayOptions: {
						show: {
							mode: ['insert'],
							'@version': [{ _cnd: { gte: 1.1 } }],
						},
					},
				},
				...transformDescriptionForOperationMode(args.insertFields ?? [], 'insert'),
				// Prompt and topK are always used for the load operation
				{
					displayName: '提示词',
					name: 'prompt',
					type: 'string',
					default: '',
					required: true,
					description: '搜索提示词，用于使用基于相似度的排名从向量存储中检索匹配的文档',
					displayOptions: {
						show: {
							mode: ['load'],
						},
					},
				},
				{
					displayName: '限制',
					name: 'topK',
					type: 'number',
					default: 4,
					description: '从向量存储中获取的顶部结果数量',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve-as-tool'],
						},
					},
				},
				{
					displayName: '包含元数据',
					name: 'includeDocumentMetadata',
					type: 'boolean',
					default: true,
					description: '是否包含文档元数据',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve-as-tool'],
						},
					},
				},
				{
					displayName: '重排结果',
					name: 'useReranker',
					type: 'boolean',
					default: false,
					description: '是否对结果进行重排序',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve', 'retrieve-as-tool'],
						},
					},
				},
				// ID is always used for update operation
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					default: '',
					required: true,
					description: 'ID of an embedding entry',
					displayOptions: {
						show: {
							mode: ['update'],
						},
					},
				},
				...transformDescriptionForOperationMode(args.loadFields ?? [], [
					'load',
					'retrieve-as-tool',
				]),
				...transformDescriptionForOperationMode(args.retrieveFields ?? [], 'retrieve'),
				...transformDescriptionForOperationMode(args.updateFields ?? [], 'update'),
			],
		};

		methods = args.methods;

		/**
		 * Method to execute the node in regular workflow mode
		 * Supports 'load', 'insert', and 'update' operation modes
		 */
		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;
			// Get the embeddings model connected to this node
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionTypes.AiEmbedding,
				0,
			)) as Embeddings;

			// Handle each operation mode with dedicated modules
			if (mode === 'load') {
				const items = this.getInputData(0);
				const resultData = [];

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const docs = await handleLoadOperation(this, args, embeddings, itemIndex);
					resultData.push(...docs);
				}

				return [resultData];
			}

			if (mode === 'insert') {
				const resultData = await handleInsertOperation(this, args, embeddings);
				return [resultData];
			}

			if (mode === 'update') {
				const resultData = await handleUpdateOperation(this, args, embeddings);
				return [resultData];
			}

			if (mode === 'retrieve-as-tool') {
				const items = this.getInputData(0);
				const resultData = [];

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const docs = await handleRetrieveAsToolExecuteOperation(
						this,
						args,
						embeddings,
						itemIndex,
					);
					resultData.push(...docs);
				}

				return [resultData];
			}

			throw new NodeOperationError(
				this.getNode(),
				'执行模式仅支持 "加载"、"更新"、"插入" 和 "作为工具检索" 操作',
			);
		}

		/**
		 * Method to supply data to AI nodes
		 * Supports 'retrieve' and 'retrieve-as-tool' operation modes
		 */
		async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;

			// Get the embeddings model connected to this node
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionTypes.AiEmbedding,
				0,
			)) as Embeddings;

			// Handle each supply data operation mode with dedicated modules
			if (mode === 'retrieve') {
				return await handleRetrieveOperation(this, args, embeddings, itemIndex);
			}

			if (mode === 'retrieve-as-tool') {
				return await handleRetrieveAsToolOperation(this, args, embeddings, itemIndex);
			}

			throw new NodeOperationError(
				this.getNode(),
				'数据供应模式仅支持 "检索" 和 "作为工具检索" 操作',
			);
		}
	};
