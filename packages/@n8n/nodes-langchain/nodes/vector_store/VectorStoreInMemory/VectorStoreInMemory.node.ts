import type { Embeddings } from '@langchain/core/embeddings';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';
import {
	type INodeProperties,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type IDataObject,
	type NodeParameterValueType,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
	ApplicationError,
} from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { MemoryVectorStoreManager } from '../shared/MemoryManager/MemoryVectorStoreManager';

const warningBanner: INodeProperties = {
	displayName:
		'<strong>仅供实验使用</strong>：数据存储在内存中，如果 n8n 重启将会丢失。如果可用内存不足，数据也可能被清除，并且此实例的所有用户都可以访问。<a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/">更多信息</a>',
	name: 'notice',
	type: 'notice',
	default: '',
};

const insertFields: INodeProperties[] = [
	{
		displayName: '清除存储',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: '是否在插入新数据之前清除存储',
	},
	warningBanner,
];

const DEFAULT_MEMORY_KEY = 'vector_store_key';

function getMemoryKey(context: IExecuteFunctions | ISupplyDataFunctions, itemIndex: number) {
	const node = context.getNode();
	if (node.typeVersion <= 1.1) {
		const memoryKeyParam = context.getNodeParameter('memoryKey', itemIndex) as string;
		const workflowId = context.getWorkflow().id;

		return `${workflowId}__${memoryKeyParam}`;
	} else {
		const memoryKeyParam = context.getNodeParameter('memoryKey', itemIndex) as {
			mode: string;
			value: string;
		};

		return memoryKeyParam.value;
	}
}

export class VectorStoreInMemory extends createVectorStoreNode<MemoryVectorStore>({
	meta: {
		displayName: '简单向量存储',
		name: 'vectorStoreInMemory',
		description: '实验向量存储的最简单方法，无需外部设置。',
		icon: 'fa:database',
		iconColor: 'black',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
		categories: ['AI'],
		subcategories: {
			AI: ['Vector Stores', 'Tools', 'Root Nodes'],
			'Vector Stores': ['For Beginners'],
			Tools: ['Other Tools'],
		},
	},
	sharedFields: [
		{
			displayName: '内存键',
			name: 'memoryKey',
			type: 'string',
			default: DEFAULT_MEMORY_KEY,
			description: '用于在工作流数据中存储向量内存的键。该键将以工作流 ID 为前缀，以避免冲突。',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lte: 1.1 } }],
				},
			},
		},
		{
			displayName: '内存键',
			name: 'memoryKey',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: DEFAULT_MEMORY_KEY },
			description: '用于在工作流数据中存储向量内存的键。这些键在工作流之间共享。',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { gte: 1.2 } }],
				},
			},
			modes: [
				{
					displayName: '从列表',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'vectorStoresSearch',
						searchable: true,
						allowNewResource: {
							label: 'resourceLocator.mode.list.addNewResource.vectorStoreInMemory',
							defaultName: DEFAULT_MEMORY_KEY,
							method: 'createVectorStore',
						},
					},
				},
				{
					displayName: '手动',
					name: 'id',
					type: 'string',
					placeholder: DEFAULT_MEMORY_KEY,
				},
			],
		},
	],
	methods: {
		listSearch: {
			async vectorStoresSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(
					{} as Embeddings, // Real Embeddings are provided when executing the node
					this.logger,
				);

				const searchOptions: INodeListSearchResult['results'] = vectorStoreSingleton
					.getMemoryKeysList()
					.map((key) => {
						return {
							name: key,
							value: key,
						};
					});

				let results = searchOptions;
				if (filter) {
					results = results.filter((option) => option.name.includes(filter));
				}

				return {
					results,
				};
			},
		},
		actionHandler: {
			async createVectorStore(
				this: ILoadOptionsFunctions,
				payload: string | IDataObject | undefined,
			): Promise<NodeParameterValueType> {
				if (!payload || typeof payload === 'string') {
					throw new ApplicationError('Invalid payload type');
				}

				const { name } = payload;

				const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(
					{} as Embeddings, // Real Embeddings are provided when executing the node
					this.logger,
				);

				const memoryKey = name ? (name as string) : DEFAULT_MEMORY_KEY;
				await vectorStoreSingleton.getVectorStore(memoryKey);

				return memoryKey;
			},
		},
	},
	insertFields,
	loadFields: [warningBanner],
	retrieveFields: [warningBanner],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings, context.logger);

		return await vectorStoreSingleton.getVectorStore(memoryKey);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;
		const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings, context.logger);

		await vectorStoreInstance.addDocuments(memoryKey, documents, clearStore);
	},
}) {}
