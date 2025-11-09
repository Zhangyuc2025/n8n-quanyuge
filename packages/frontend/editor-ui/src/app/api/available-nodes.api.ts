import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Available Node Source Types
 */
export const enum NodeSource {
	BUILTIN = 'builtin',
	PLATFORM = 'platform',
	CUSTOM = 'custom',
}

/**
 * Available Node Response Type
 * Matches the backend AvailableNodesController response
 */
export interface AvailableNode {
	nodeKey: string;
	nodeName: string;
	nodeType: string;
	category: string | null;
	description: string | null;
	iconUrl: string | null;
	version: string | null;
	source: NodeSource;
	needsConfig: boolean;
	isConfigured: boolean;
}

/**
 * Available Nodes Stats Response
 */
export interface AvailableNodesStats {
	total: number;
	builtin: number;
	platform: number;
	custom: number;
	configured: number;
	needsConfig: number;
	byCategory: Record<string, number>;
}

/**
 * Get all available nodes for the workspace
 * GET /rest/available-nodes?workspaceId=xxx
 */
export async function getAvailableNodes(
	context: IRestApiContext,
	workspaceId: string,
): Promise<AvailableNode[]> {
	return await makeRestApiRequest<AvailableNode[]>(context, 'GET', '/available-nodes', {
		workspaceId,
	});
}

/**
 * Get available nodes grouped by category
 * GET /rest/available-nodes/by-category?workspaceId=xxx
 */
export async function getAvailableNodesByCategory(
	context: IRestApiContext,
	workspaceId: string,
): Promise<Record<string, AvailableNode[]>> {
	return await makeRestApiRequest<Record<string, AvailableNode[]>>(
		context,
		'GET',
		'/available-nodes/by-category',
		{
			workspaceId,
		},
	);
}

/**
 * Get unconfigured nodes (nodes that need configuration but haven't been configured yet)
 * GET /rest/available-nodes/unconfigured?workspaceId=xxx
 */
export async function getUnconfiguredNodes(
	context: IRestApiContext,
	workspaceId: string,
): Promise<AvailableNode[]> {
	return await makeRestApiRequest<AvailableNode[]>(
		context,
		'GET',
		'/available-nodes/unconfigured',
		{
			workspaceId,
		},
	);
}

/**
 * Get node statistics
 * GET /rest/available-nodes/stats?workspaceId=xxx
 */
export async function getAvailableNodesStats(
	context: IRestApiContext,
	workspaceId: string,
): Promise<AvailableNodesStats> {
	return await makeRestApiRequest<AvailableNodesStats>(context, 'GET', '/available-nodes/stats', {
		workspaceId,
	});
}

/**
 * Get all builtin nodes (from filesystem)
 * GET /rest/available-nodes/builtin
 */
export async function getBuiltinNodes(context: IRestApiContext): Promise<
	Array<{
		nodeKey: string;
		className: string;
		sourcePath: string;
		displayName: string;
		description: string;
		group: string[];
		version: number;
	}>
> {
	return await makeRestApiRequest(context, 'GET', '/available-nodes/builtin');
}
