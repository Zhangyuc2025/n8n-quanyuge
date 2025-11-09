import type { Embeddings } from '@langchain/core/embeddings';
import type { Document } from 'langchain/document';
import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { N8nJsonLoader } from '@utils/N8nJsonLoader';

import { MemoryVectorStoreManager } from '../shared/MemoryManager/MemoryVectorStoreManager';
import { processDocuments } from '../shared/processDocuments';

// This node is deprecated. Use VectorStoreInMemory instead.
export class VectorStoreInMemoryInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: '内存向量存储插入',
		name: 'vectorStoreInMemoryInsert',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		hidden: true,
		description: '将数据插入内存向量存储',
		defaults: {
			name: '内存向量存储插入',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
					},
				],
			},
		},

		inputs: [
			NodeConnectionTypes.Main,
			{
				displayName: '文档',
				maxConnections: 1,
				type: NodeConnectionTypes.AiDocument,
				required: true,
			},
			{
				displayName: '嵌入',
				maxConnections: 1,
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'嵌入的数据存储在服务器内存中，因此在服务器重启时会丢失。此外，如果数据量太大，可能会因内存不足而导致服务器崩溃。',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '清除存储',
				name: 'clearStore',
				type: 'boolean',
				default: false,
				description: '是否在插入新数据之前清除存储',
			},
			{
				displayName: '内存键',
				name: 'memoryKey',
				type: 'string',
				default: 'vector_store_key',
				description: '用于在工作流数据中存储向量内存的键。该键将以工作流 ID 为前缀，以避免冲突。',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0);
		const embeddings = (await this.getInputConnectionData(
			NodeConnectionTypes.AiEmbedding,
			0,
		)) as Embeddings;

		const memoryKey = this.getNodeParameter('memoryKey', 0) as string;
		const clearStore = this.getNodeParameter('clearStore', 0) as boolean;
		const documentInput = (await this.getInputConnectionData(NodeConnectionTypes.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const { processedDocuments, serializedDocuments } = await processDocuments(
			documentInput,
			items,
		);

		const workflowId = this.getWorkflow().id;

		const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings, this.logger);
		await vectorStoreInstance.addDocuments(
			`${workflowId}__${memoryKey}`,
			processedDocuments,
			clearStore,
		);

		return [serializedDocuments];
	}
}
