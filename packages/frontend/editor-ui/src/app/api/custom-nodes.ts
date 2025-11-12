import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Config Mode Enum
 */
export enum ConfigMode {
	USER_MANAGED = 'user_managed',
	TEAM_SHARED = 'team_shared',
}

/**
 * Custom Node API Types
 */
export interface CustomNode {
	id: string;
	workspaceId: string;
	nodeKey: string;
	nodeName: string;
	nodeDefinition: Record<string, unknown>;
	nodeCode: string;
	configMode: ConfigMode;
	configSchema: Record<string, unknown> | null;
	sharedConfig: Record<string, unknown> | null;
	category: string | null;
	description: string | null;
	iconUrl: string | null;
	version: string | null;
	isActive: boolean;
	submissionStatus: string | null;
	reviewNotes: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	createdAt: string;
	createdBy: string;
	updatedAt: string;
}

export interface CreateCustomNodeRequest {
	workspaceId: string;
	nodeKey: string;
	nodeName: string;
	nodeDefinition: Record<string, unknown>;
	nodeCode: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
}

export interface UpdateCustomNodeRequest {
	nodeName?: string;
	nodeDefinition?: Record<string, unknown>;
	nodeCode?: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
}

export interface SharedConfigRequest {
	configData: Record<string, unknown>;
}

/**
 * Get workspace custom nodes
 * GET /custom-nodes?workspaceId=xxx
 */
export async function getCustomNodes(
	context: IRestApiContext,
	workspaceId: string,
): Promise<CustomNode[]> {
	return await makeRestApiRequest<CustomNode[]>(context, 'GET', '/custom-nodes', {
		workspaceId,
	});
}

/**
 * Get custom node details by node key
 * GET /custom-nodes/:nodeKey?workspaceId=xxx
 */
export async function getCustomNode(
	context: IRestApiContext,
	nodeKey: string,
	workspaceId: string,
): Promise<CustomNode> {
	return await makeRestApiRequest<CustomNode>(context, 'GET', `/custom-nodes/${nodeKey}`, {
		workspaceId,
	});
}

/**
 * Create a new custom node
 * POST /custom-nodes
 */
export async function createCustomNode(
	context: IRestApiContext,
	data: CreateCustomNodeRequest,
): Promise<CustomNode> {
	return await makeRestApiRequest<CustomNode>(context, 'POST', '/custom-nodes', data);
}

/**
 * Update custom node
 * PUT /custom-nodes/:id?workspaceId=xxx
 */
export async function updateCustomNode(
	context: IRestApiContext,
	id: string,
	workspaceId: string,
	data: UpdateCustomNodeRequest,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'PUT', `/custom-nodes/${id}`, {
		...data,
		workspaceId,
	});
}

/**
 * Delete custom node
 * DELETE /custom-nodes/:id?workspaceId=xxx
 */
export async function deleteCustomNode(
	context: IRestApiContext,
	id: string,
	workspaceId: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/custom-nodes/${id}`, {
		workspaceId,
	});
}

/**
 * Submit custom node for review (to become third-party node)
 * POST /custom-nodes/:id/submit?workspaceId=xxx
 */
export async function submitForReview(
	context: IRestApiContext,
	id: string,
	workspaceId: string,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'POST', `/custom-nodes/${id}/submit`, {
		workspaceId,
	});
}

/**
 * Update team shared configuration
 * PUT /custom-nodes/:id/shared-config?workspaceId=xxx
 */
export async function updateSharedConfig(
	context: IRestApiContext,
	id: string,
	workspaceId: string,
	config: SharedConfigRequest,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'PUT', `/custom-nodes/${id}/shared-config`, {
		...config,
		workspaceId,
	});
}

/**
 * Get team shared configuration
 * GET /custom-nodes/:id/shared-config?workspaceId=xxx
 */
export async function getSharedConfig(
	context: IRestApiContext,
	id: string,
	workspaceId: string,
): Promise<Record<string, unknown>> {
	return await makeRestApiRequest(context, 'GET', `/custom-nodes/${id}/shared-config`, {
		workspaceId,
	});
}

/**
 * Toggle custom node enabled status
 * POST /custom-nodes/:id/toggle?workspaceId=xxx
 */
export async function toggleCustomNode(
	context: IRestApiContext,
	id: string,
	workspaceId: string,
	isActive: boolean,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'POST', `/custom-nodes/${id}/toggle`, {
		workspaceId,
		isActive,
	});
}

/**
 * Test custom node
 * POST /custom-nodes/test
 */
export async function testNode(
	context: IRestApiContext,
	data: {
		nodeDefinition: object;
		nodeCode?: string;
		testInput?: any[];
	},
): Promise<any> {
	return await makeRestApiRequest(context, 'POST', '/custom-nodes/test', data);
}
