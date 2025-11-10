import type { INodeProperties } from 'n8n-workflow';

export const pineconeIndexRLC: INodeProperties = {
	displayName: 'Pinecone 索引',
	name: 'pineconeIndex',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: '从列表',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'pineconeIndexSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const supabaseTableNameRLC: INodeProperties = {
	displayName: '表名',
	name: 'tableName',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: '从列表',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'supabaseTableNameSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const qdrantCollectionRLC: INodeProperties = {
	displayName: 'Qdrant 集合',
	name: 'qdrantCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: '从列表',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'qdrantCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const milvusCollectionRLC: INodeProperties = {
	displayName: 'Milvus 集合',
	name: 'milvusCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: '从列表',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'milvusCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

export const weaviateCollectionRLC: INodeProperties = {
	displayName: 'Weaviate 集合',
	name: 'weaviateCollection',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: '从列表',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'weaviateCollectionsSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};
