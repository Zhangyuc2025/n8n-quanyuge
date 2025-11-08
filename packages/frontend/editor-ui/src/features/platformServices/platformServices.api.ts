import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Platform Services API Types
 */

export interface PlatformService {
	id: string;
	serviceKey: string;
	name: string;
	serviceType: 'ai_model' | 'rag_service' | 'plugin';
	serviceMode: 'platform_managed' | 'user_managed';
	visibility: 'global' | 'workspace';
	pricingConfig: Record<string, unknown>;
	userConfigSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	enabled: boolean;
	isActive: boolean;
	ownerWorkspaceId?: string;
	pluginCode?: string;
	pluginVersion?: string;
	submissionStatus?: 'pending' | 'approved' | 'rejected';
	createdAt: string;
	updatedAt: string;
	isConfigured?: boolean;
}

export interface AvailablePlatformService extends PlatformService {
	isConfigured: boolean;
}

export interface ServiceUsageStats {
	serviceKey: string;
	serviceName: string;
	totalUsage: number;
	totalCost: number;
	usageCount: number;
	lastUsedAt?: string;
	period: {
		startDate: string;
		endDate: string;
	};
}

export interface PlatformServiceQueryParams {
	serviceType?: 'ai_model' | 'rag_service' | 'plugin';
	isActive?: boolean;
	category?: string;
}

/**
 * Platform Services API Methods
 */

/**
 * GET /platform-services
 * Get all platform services (admin view)
 */
export async function getAllPlatformServices(
	context: IRestApiContext,
	params?: PlatformServiceQueryParams,
): Promise<PlatformService[]> {
	const queryParams = new URLSearchParams();

	if (params?.serviceType) queryParams.append('serviceType', params.serviceType);
	if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
	if (params?.category) queryParams.append('category', params.category);

	const query = queryParams.toString();
	const url = query ? `/platform-services?${query}` : '/platform-services';

	return await makeRestApiRequest<PlatformService[]>(context, 'GET', url);
}

/**
 * GET /platform-services/available
 * Get available services for a workspace (user view)
 * This includes global services and workspace-specific services
 */
export async function getAvailableServices(
	context: IRestApiContext,
	workspaceId: string,
): Promise<AvailablePlatformService[]> {
	return await makeRestApiRequest<AvailablePlatformService[]>(
		context,
		'GET',
		`/platform-services/available?workspaceId=${workspaceId}`,
	);
}

/**
 * GET /platform-services/:serviceKey
 * Get a specific platform service by its key
 */
export async function getPlatformService(
	context: IRestApiContext,
	serviceKey: string,
): Promise<PlatformService> {
	return await makeRestApiRequest<PlatformService>(
		context,
		'GET',
		`/platform-services/${serviceKey}`,
	);
}

/**
 * GET /platform-services/:serviceKey/usage
 * Get usage statistics for a specific service in a workspace
 */
export async function getServiceUsageStats(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
	params?: {
		startDate?: string;
		endDate?: string;
	},
): Promise<ServiceUsageStats> {
	const queryParams = new URLSearchParams();
	queryParams.append('workspaceId', workspaceId);

	if (params?.startDate) queryParams.append('startDate', params.startDate);
	if (params?.endDate) queryParams.append('endDate', params.endDate);

	return await makeRestApiRequest<ServiceUsageStats>(
		context,
		'GET',
		`/platform-services/${serviceKey}/usage?${queryParams.toString()}`,
	);
}

/**
 * Admin Platform Services API Methods
 * These are only available to administrators
 */

/**
 * GET /admin/platform-services/ai-models
 * Get all AI models (admin only)
 */
export async function getAllAiModels(
	context: IRestApiContext,
	params?: {
		serviceType?: 'llm' | 'embedding' | 'image' | 'audio';
		isActive?: boolean;
	},
): Promise<PlatformService[]> {
	const queryParams = new URLSearchParams();

	if (params?.serviceType) queryParams.append('serviceType', params.serviceType);
	if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

	const query = queryParams.toString();
	const url = query
		? `/admin/platform-services/ai-models?${query}`
		: '/admin/platform-services/ai-models';

	return await makeRestApiRequest<PlatformService[]>(context, 'GET', url);
}

/**
 * POST /admin/platform-services/ai-models
 * Create a new AI model service (admin only)
 */
export async function createAiModel(
	context: IRestApiContext,
	data: {
		serviceKey: string;
		name: string;
		modelType: 'llm' | 'embedding' | 'image' | 'audio';
		provider: string;
		modelId: string;
		apiKey?: string;
		apiBaseUrl?: string;
		pricePerThousandTokens: number;
		inputTokenPrice?: number;
		outputTokenPrice?: number;
		description?: string;
		iconUrl?: string;
	},
): Promise<PlatformService> {
	return await makeRestApiRequest<PlatformService>(
		context,
		'POST',
		'/admin/platform-services/ai-models',
		data,
	);
}

/**
 * PATCH /admin/platform-services/ai-models/:key
 * Update an AI model service (admin only)
 */
export async function updateAiModel(
	context: IRestApiContext,
	serviceKey: string,
	data: {
		name?: string;
		apiKey?: string;
		apiBaseUrl?: string;
		pricePerThousandTokens?: number;
		inputTokenPrice?: number;
		outputTokenPrice?: number;
		description?: string;
		iconUrl?: string;
		enabled?: boolean;
		isActive?: boolean;
	},
): Promise<PlatformService> {
	return await makeRestApiRequest<PlatformService>(
		context,
		'PATCH',
		`/admin/platform-services/ai-models/${serviceKey}`,
		data,
	);
}

/**
 * DELETE /admin/platform-services/ai-models/:key
 * Disable an AI model (soft delete, admin only)
 */
export async function deleteAiModel(
	context: IRestApiContext,
	serviceKey: string,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest<{ success: boolean; message: string }>(
		context,
		'DELETE',
		`/admin/platform-services/ai-models/${serviceKey}`,
	);
}

/**
 * GET /admin/platform-services/rag
 * Get all RAG services (admin only)
 */
export async function getAllRagServices(
	context: IRestApiContext,
	params?: {
		domain?: string;
		isActive?: boolean;
	},
): Promise<PlatformService[]> {
	const queryParams = new URLSearchParams();

	if (params?.domain) queryParams.append('domain', params.domain);
	if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

	const query = queryParams.toString();
	const url = query ? `/admin/platform-services/rag?${query}` : '/admin/platform-services/rag';

	return await makeRestApiRequest<PlatformService[]>(context, 'GET', url);
}

/**
 * POST /admin/platform-services/rag
 * Create a new RAG service (admin only)
 */
export async function createRagService(
	context: IRestApiContext,
	data: {
		serviceKey: string;
		name: string;
		domain: string;
		pricePerQueryCny: number;
		metadata?: {
			knowledgeBaseSize?: number;
			lastUpdated?: string;
			coverageYears?: string;
			languages?: string[];
			updateFrequency?: string;
		};
	},
): Promise<PlatformService> {
	return await makeRestApiRequest<PlatformService>(
		context,
		'POST',
		'/admin/platform-services/rag',
		data,
	);
}

/**
 * PATCH /admin/platform-services/rag/:key
 * Update a RAG service (admin only)
 */
export async function updateRagService(
	context: IRestApiContext,
	serviceKey: string,
	data: {
		name?: string;
		pricePerQueryCny?: number;
		metadata?: Record<string, unknown>;
		isActive?: boolean;
	},
): Promise<PlatformService> {
	return await makeRestApiRequest<PlatformService>(
		context,
		'PATCH',
		`/admin/platform-services/rag/${serviceKey}`,
		data,
	);
}

/**
 * DELETE /admin/platform-services/rag/:key
 * Disable a RAG service (soft delete, admin only)
 */
export async function deleteRagService(
	context: IRestApiContext,
	serviceKey: string,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest<{ success: boolean; message: string }>(
		context,
		'DELETE',
		`/admin/platform-services/rag/${serviceKey}`,
	);
}
