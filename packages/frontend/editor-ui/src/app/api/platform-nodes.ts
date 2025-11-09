import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Node Type Enum
 */
export enum NodeType {
	PLATFORM_MANAGED = 'platform_managed',
	THIRD_PARTY = 'third_party',
}

/**
 * Platform Node API Types
 */
export interface PlatformNode {
	id: string;
	nodeKey: string;
	nodeName: string;
	nodeType: NodeType;
	nodeDefinition: Record<string, unknown>;
	configMode: string;
	configSchema: Record<string, unknown> | null;
	category: string | null;
	description: string | null;
	iconUrl: string | null;
	version: string | null;
	isActive: boolean;
	enabled: boolean;
	submissionStatus: string | null;
	reviewNotes: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface NodeFilters {
	category?: string;
	nodeType?: NodeType;
	enabled?: boolean;
}

export interface NodesByCategory {
	[category: string]: PlatformNode[];
}

/**
 * Get all platform nodes with optional filters
 * GET /platform-nodes
 */
export async function getNodes(
	context: IRestApiContext,
	filters?: NodeFilters,
): Promise<PlatformNode[]> {
	const queryParams: Record<string, string> = {};

	if (filters?.category) {
		queryParams.category = filters.category;
	}
	if (filters?.nodeType) {
		queryParams.nodeType = filters.nodeType;
	}
	if (filters?.enabled !== undefined) {
		queryParams.enabled = String(filters.enabled);
	}

	return await makeRestApiRequest<PlatformNode[]>(context, 'GET', '/platform-nodes', queryParams);
}

/**
 * Get platform node details by node key
 * GET /platform-nodes/:nodeKey
 */
export async function getNode(context: IRestApiContext, nodeKey: string): Promise<PlatformNode> {
	return await makeRestApiRequest<PlatformNode>(context, 'GET', `/platform-nodes/${nodeKey}`);
}

/**
 * Search platform nodes
 * GET /platform-nodes/search
 */
export async function searchNodes(
	context: IRestApiContext,
	query: string,
): Promise<PlatformNode[]> {
	return await makeRestApiRequest<PlatformNode[]>(context, 'GET', '/platform-nodes/search', {
		q: query,
	});
}

/**
 * Get nodes grouped by category
 * GET /platform-nodes/categories/grouped
 */
export async function getGroupedByCategory(context: IRestApiContext): Promise<NodesByCategory> {
	return await makeRestApiRequest<NodesByCategory>(
		context,
		'GET',
		'/platform-nodes/categories/grouped',
	);
}

/**
 * Admin: Approve a third-party node
 * POST /platform-nodes/:nodeKey/approve
 */
export async function approveNode(
	context: IRestApiContext,
	nodeKey: string,
	reviewNotes?: string,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'POST', `/platform-nodes/${nodeKey}/approve`, {
		reviewNotes,
	});
}

/**
 * Admin: Reject a third-party node
 * POST /platform-nodes/:nodeKey/reject
 */
export async function rejectNode(
	context: IRestApiContext,
	nodeKey: string,
	reviewNotes?: string,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'POST', `/platform-nodes/${nodeKey}/reject`, {
		reviewNotes,
	});
}

/**
 * Admin: Toggle node enabled status
 * PATCH /platform-nodes/:nodeKey/toggle
 */
export async function toggleNode(
	context: IRestApiContext,
	nodeKey: string,
	enabled: boolean,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'PATCH', `/platform-nodes/${nodeKey}/toggle`, {
		enabled,
	});
}
