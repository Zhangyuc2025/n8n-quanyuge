import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * User Node Config API Types
 */
export interface UserNodeConfig {
	id: string;
	userId: string;
	nodeType: string;
	configData: Record<string, unknown>;
	isValid: boolean;
	lastUsedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface UserNodeConfigListItem {
	nodeType: string;
	isValid: boolean;
	lastUsedAt: string;
	createdAt: string;
}

export interface SaveConfigRequest {
	configData: Record<string, unknown>;
}

export interface ConfigResponse {
	isConfigured: boolean;
	config?: UserNodeConfig;
}

export interface ConfigSchemaResponse {
	hasSchema: boolean;
	schema?: Record<string, unknown>;
}

export interface ConfigStatusResponse {
	nodeType: string;
	isConfigured: boolean;
}

export interface TestConnectionResponse {
	success: boolean;
	message: string;
	details?: Record<string, unknown>;
}

/**
 * Get all user node configurations
 * GET /user-node-config
 *
 * Returns list of all node types that user has configured
 * (metadata only, no actual config data)
 */
export async function getAllConfigs(context: IRestApiContext): Promise<UserNodeConfigListItem[]> {
	return await makeRestApiRequest<UserNodeConfigListItem[]>(context, 'GET', '/user-node-config');
}

/**
 * Get configuration for specific node type
 * GET /user-node-config/:nodeType
 *
 * Note: For security, this may return masked/redacted config data
 */
export async function getConfig(
	context: IRestApiContext,
	nodeType: string,
): Promise<ConfigResponse> {
	return await makeRestApiRequest<ConfigResponse>(context, 'GET', `/user-node-config/${nodeType}`);
}

/**
 * Save/update node configuration
 * POST /user-node-config/:nodeType
 *
 * This will:
 * 1. Encrypt and store configuration data
 * 2. Create new config if not exists, otherwise update
 * 3. Update last used timestamp
 */
export async function saveConfig(
	context: IRestApiContext,
	nodeType: string,
	data: SaveConfigRequest,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'POST', `/user-node-config/${nodeType}`, data);
}

/**
 * Delete node configuration
 * DELETE /user-node-config/:nodeType
 */
export async function deleteConfig(
	context: IRestApiContext,
	nodeType: string,
): Promise<{ success: boolean; message: string }> {
	return await makeRestApiRequest(context, 'DELETE', `/user-node-config/${nodeType}`);
}

/**
 * Test node connection
 * POST /user-node-config/:nodeType/test
 *
 * Used to validate configuration, e.g., test if API key is valid
 */
export async function testConnection(
	context: IRestApiContext,
	nodeType: string,
): Promise<TestConnectionResponse> {
	return await makeRestApiRequest(context, 'POST', `/user-node-config/${nodeType}/test`);
}

/**
 * Get node configuration schema
 * GET /user-node-config/:nodeType/schema
 *
 * Returns field definitions needed for user configuration
 * (in JSON Schema format for frontend form rendering)
 */
export async function getConfigSchema(
	context: IRestApiContext,
	nodeType: string,
): Promise<ConfigSchemaResponse> {
	return await makeRestApiRequest<ConfigSchemaResponse>(
		context,
		'GET',
		`/user-node-config/${nodeType}/schema`,
	);
}

/**
 * Check if node is configured
 * GET /user-node-config/:nodeType/status
 *
 * Quick check for configuration status without returning actual config data
 */
export async function getConfigStatus(
	context: IRestApiContext,
	nodeType: string,
): Promise<ConfigStatusResponse> {
	return await makeRestApiRequest<ConfigStatusResponse>(
		context,
		'GET',
		`/user-node-config/${nodeType}/status`,
	);
}
