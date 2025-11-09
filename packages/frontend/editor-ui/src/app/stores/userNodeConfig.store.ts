import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { STORES } from '@n8n/stores';
import * as userNodeConfigApi from '@/app/api/user-node-config';
import type {
	UserNodeConfig,
	UserNodeConfigListItem,
	SaveConfigRequest,
} from '@/app/api/user-node-config';

export const useUserNodeConfigStore = defineStore(STORES.USER_NODE_CONFIG, () => {
	const rootStore = useRootStore();

	// ---------------------------------------------------------------------------
	// #region State
	// ---------------------------------------------------------------------------

	const configs = ref<Map<string, UserNodeConfig>>(new Map());
	const configList = ref<UserNodeConfigListItem[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	/**
	 * Get all configured node types
	 */
	const configuredNodeTypes = computed(() => Array.from(configs.value.keys()));

	/**
	 * Get number of configured nodes
	 */
	const configCount = computed(() => configs.value.size);

	/**
	 * Check if any configs exist
	 */
	const hasConfigs = computed(() => configs.value.size > 0);

	/**
	 * Check if currently loading
	 */
	const isLoading = computed(() => loading.value);

	/**
	 * Get valid configs only
	 */
	const validConfigs = computed(() => {
		const valid: Map<string, UserNodeConfig> = new Map();
		configs.value.forEach((config, nodeType) => {
			if (config.isValid) {
				valid.set(nodeType, config);
			}
		});
		return valid;
	});

	/**
	 * Get invalid configs
	 */
	const invalidConfigs = computed(() => {
		const invalid: Map<string, UserNodeConfig> = new Map();
		configs.value.forEach((config, nodeType) => {
			if (!config.isValid) {
				invalid.set(nodeType, config);
			}
		});
		return invalid;
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Actions
	// ---------------------------------------------------------------------------

	/**
	 * Fetch all user node configurations
	 */
	async function fetchAllConfigs() {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.getAllConfigs(rootStore.restApiContext);
			configList.value = response;
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch node configurations';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get configuration for specific node type
	 */
	async function getConfig(nodeType: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.getConfig(rootStore.restApiContext, nodeType);

			if (response.isConfigured && response.config) {
				configs.value.set(nodeType, response.config);
			}

			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to get node configuration';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Save/update node configuration
	 */
	async function saveConfig(nodeType: string, data: SaveConfigRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.saveConfig(rootStore.restApiContext, nodeType, data);

			// Refresh config after save
			await getConfig(nodeType);

			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to save node configuration';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete node configuration
	 */
	async function deleteConfig(nodeType: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.deleteConfig(rootStore.restApiContext, nodeType);

			// Remove from local state
			configs.value.delete(nodeType);

			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to delete node configuration';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Test node connection
	 */
	async function testConnection(nodeType: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.testConnection(rootStore.restApiContext, nodeType);
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to test connection';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get node configuration schema
	 */
	async function getConfigSchema(nodeType: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.getConfigSchema(rootStore.restApiContext, nodeType);
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to get configuration schema';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Check if node is configured
	 */
	async function getConfigStatus(nodeType: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await userNodeConfigApi.getConfigStatus(rootStore.restApiContext, nodeType);
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to get configuration status';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Check if node type is configured (from cached data)
	 */
	function isNodeConfigured(nodeType: string): boolean {
		return configs.value.has(nodeType);
	}

	/**
	 * Get config from cache
	 */
	function getCachedConfig(nodeType: string): UserNodeConfig | undefined {
		return configs.value.get(nodeType);
	}

	/**
	 * Clear error
	 */
	function clearError() {
		error.value = null;
	}

	/**
	 * Reset store
	 */
	function reset() {
		configs.value.clear();
		configList.value = [];
		loading.value = false;
		error.value = null;
	}

	// #endregion

	return {
		// State
		configs,
		configList,
		loading,
		error,

		// Computed
		configuredNodeTypes,
		configCount,
		hasConfigs,
		isLoading,
		validConfigs,
		invalidConfigs,

		// Actions
		fetchAllConfigs,
		getConfig,
		saveConfig,
		deleteConfig,
		testConnection,
		getConfigSchema,
		getConfigStatus,
		isNodeConfigured,
		getCachedConfig,
		clearError,
		reset,
	};
});
