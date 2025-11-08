import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Plugins API Types
 */

export interface Plugin {
	id: string;
	serviceKey: string;
	name: string;
	serviceType: 'plugin';
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
	submittedAt?: string;
	reviewedAt?: string;
	reviewNotes?: string;
	createdAt: string;
	updatedAt: string;
	isConfigured?: boolean;
}

export interface PluginCredentials {
	apiKey?: string;
	apiSecret?: string;
	baseUrl?: string;
	[key: string]: unknown;
}

/**
 * Plugins API Methods
 */

/**
 * GET /plugins
 * Get all plugins (global and third-party approved plugins)
 */
export async function getAllPlugins(context: IRestApiContext): Promise<Plugin[]> {
	return await makeRestApiRequest<Plugin[]>(context, 'GET', '/plugins');
}

/**
 * GET /plugins/available
 * Get available plugins for the current workspace
 * Includes global plugins and workspace custom plugins
 */
export async function getAvailablePlugins(
	context: IRestApiContext,
	workspaceId: string,
): Promise<Plugin[]> {
	return await makeRestApiRequest<Plugin[]>(
		context,
		'GET',
		`/plugins/available?workspaceId=${workspaceId}`,
	);
}

/**
 * GET /plugins/custom
 * Get custom plugins for the current workspace
 */
export async function getMyPlugins(
	context: IRestApiContext,
	workspaceId: string,
): Promise<Plugin[]> {
	return await makeRestApiRequest<Plugin[]>(
		context,
		'GET',
		`/plugins/custom?workspaceId=${workspaceId}`,
	);
}

/**
 * POST /plugins/custom
 * Upload a custom plugin
 */
export async function uploadPlugin(
	context: IRestApiContext,
	workspaceId: string,
	data: {
		serviceKey: string;
		serviceName: string;
		category: string;
		description?: string;
		userConfigSchema?: Record<string, unknown>;
		pluginCode: string;
		pluginVersion: string;
		iconUrl?: string;
	},
): Promise<Plugin> {
	return await makeRestApiRequest<Plugin>(
		context,
		'POST',
		`/plugins/custom?workspaceId=${workspaceId}`,
		data,
	);
}

/**
 * POST /plugins/:key/submit
 * Submit a custom plugin for platform review
 */
export async function submitPlugin(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'POST',
		`/plugins/${serviceKey}/submit?workspaceId=${workspaceId}`,
	);
}

/**
 * POST /plugins/:key/update
 * Update a custom plugin
 */
export async function updatePlugin(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
	data: {
		serviceName?: string;
		category?: string;
		description?: string;
		pluginCode?: string;
		pluginVersion?: string;
		iconUrl?: string;
	},
): Promise<Plugin> {
	return await makeRestApiRequest<Plugin>(
		context,
		'POST',
		`/plugins/${serviceKey}/update?workspaceId=${workspaceId}`,
		data,
	);
}

/**
 * DELETE /plugins/custom/:key
 * Delete a custom plugin
 */
export async function deletePlugin(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		`/plugins/custom/${serviceKey}?workspaceId=${workspaceId}`,
	);
}

/**
 * POST /plugins/:key/credentials
 * Configure credentials for a user-managed plugin
 * This allows users to provide their own API keys for third-party services
 */
export async function configurePluginCredentials(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
	credentials: PluginCredentials,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'POST',
		`/plugins/${serviceKey}/credentials?workspaceId=${workspaceId}`,
		credentials,
	);
}

/**
 * GET /plugins/:key/credentials
 * Get configured credentials for a plugin (masked for security)
 */
export async function getPluginCredentials(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
): Promise<PluginCredentials> {
	return await makeRestApiRequest<PluginCredentials>(
		context,
		'GET',
		`/plugins/${serviceKey}/credentials?workspaceId=${workspaceId}`,
	);
}

/**
 * DELETE /plugins/:key/credentials
 * Remove configured credentials for a plugin
 */
export async function deletePluginCredentials(
	context: IRestApiContext,
	workspaceId: string,
	serviceKey: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		`/plugins/${serviceKey}/credentials?workspaceId=${workspaceId}`,
	);
}

/**
 * Admin Plugins API Methods
 * These are only available to administrators
 */

/**
 * GET /admin/plugins/submissions
 * Get all plugin submissions pending review (admin only)
 */
export async function getPendingPluginSubmissions(context: IRestApiContext): Promise<Plugin[]> {
	return await makeRestApiRequest<Plugin[]>(context, 'GET', '/admin/plugins/submissions');
}

/**
 * POST /admin/plugins/:key/approve
 * Approve a plugin submission (admin only)
 */
export async function approvePlugin(
	context: IRestApiContext,
	serviceKey: string,
	reviewNotes?: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'POST',
		`/admin/plugins/${serviceKey}/approve`,
		{ reviewNotes },
	);
}

/**
 * POST /admin/plugins/:key/reject
 * Reject a plugin submission (admin only)
 */
export async function rejectPlugin(
	context: IRestApiContext,
	serviceKey: string,
	reviewNotes: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'POST',
		`/admin/plugins/${serviceKey}/reject`,
		{ reviewNotes },
	);
}

/**
 * DELETE /admin/plugins/:key
 * Delete a plugin permanently (admin only)
 */
export async function deletePluginPermanently(
	context: IRestApiContext,
	serviceKey: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		`/admin/plugins/${serviceKey}`,
	);
}
