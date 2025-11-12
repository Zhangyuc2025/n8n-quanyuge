import { ApplicationError, type ILoadOptionsFunctions } from 'n8n-workflow';

// Note: All search functions have been disabled because the credentials system has been removed
// These functions previously used getCredentials which is no longer available

export async function pineconeIndexSearch(this: ILoadOptionsFunctions) {
	throw new ApplicationError(
		'Pinecone index search is no longer supported - credentials system has been removed',
	);
}

export async function supabaseTableNameSearch(this: ILoadOptionsFunctions) {
	throw new ApplicationError(
		'Supabase table search is no longer supported - credentials system has been removed',
	);
}

export async function qdrantCollectionsSearch(this: ILoadOptionsFunctions) {
	throw new ApplicationError(
		'Qdrant collections search is no longer supported - credentials system has been removed',
	);
}

export async function milvusCollectionsSearch(this: ILoadOptionsFunctions) {
	throw new ApplicationError(
		'Milvus collections search is no longer supported - credentials system has been removed',
	);
}

export async function weaviateCollectionsSearch(this: ILoadOptionsFunctions) {
	throw new ApplicationError(
		'Weaviate collections search is no longer supported - credentials system has been removed',
	);
}
