import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { STORES } from '@n8n/stores';
import { useToast } from '@/app/composables/useToast';
import * as pluginsApi from './plugins.api';
import type { Plugin, PluginCredentials } from './plugins.api';

export const usePluginsStore = defineStore(STORES.PLUGINS, () => {
	const rootStore = useRootStore();
	const toast = useToast();

	// ---------------------------------------------------------------------------
	// #region State
	// ---------------------------------------------------------------------------

	const allPlugins = ref<Plugin[]>([]);
	const availablePlugins = ref<Plugin[]>([]);
	const myPlugins = ref<Plugin[]>([]);
	const selectedPlugin = ref<Plugin | null>(null);
	const pluginCredentials = ref<Map<string, PluginCredentials>>(new Map());
	const loading = ref(false);
	const currentWorkspaceId = ref<string | null>(null);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	/**
	 * Get platform-managed plugins (global visibility)
	 */
	const platformPlugins = computed(() =>
		allPlugins.value.filter(
			(plugin) => plugin.serviceMode === 'platform_managed' && plugin.visibility === 'global',
		),
	);

	/**
	 * Get third-party approved plugins (user-managed, global visibility)
	 */
	const thirdPartyPlugins = computed(() =>
		allPlugins.value.filter(
			(plugin) =>
				plugin.serviceMode === 'user_managed' &&
				plugin.visibility === 'global' &&
				plugin.submissionStatus === 'approved',
		),
	);

	/**
	 * Get custom workspace plugins
	 */
	const customPlugins = computed(() =>
		myPlugins.value.filter((plugin) => plugin.visibility === 'workspace'),
	);

	/**
	 * Get pending submission plugins
	 */
	const pendingPlugins = computed(() =>
		myPlugins.value.filter((plugin) => plugin.submissionStatus === 'pending'),
	);

	/**
	 * Get plugins grouped by category
	 */
	const pluginsByCategory = computed(() => {
		const grouped = new Map<string, Plugin[]>();
		availablePlugins.value.forEach((plugin) => {
			const category = plugin.category ?? 'Uncategorized';
			if (!grouped.has(category)) {
				grouped.set(category, []);
			}
			grouped.get(category)!.push(plugin);
		});
		return grouped;
	});

	/**
	 * Get configured plugins (plugins with credentials set)
	 */
	const configuredPlugins = computed(() =>
		availablePlugins.value.filter((plugin) => plugin.isConfigured),
	);

	/**
	 * Get unconfigured user-managed plugins
	 */
	const unconfiguredPlugins = computed(() =>
		availablePlugins.value.filter(
			(plugin) => plugin.serviceMode === 'user_managed' && !plugin.isConfigured,
		),
	);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Actions
	// ---------------------------------------------------------------------------

	/**
	 * Fetch all plugins (global and third-party approved)
	 */
	async function fetchAllPlugins() {
		loading.value = true;
		try {
			allPlugins.value = await pluginsApi.getAllPlugins(rootStore.restApiContext);
		} catch (error) {
			toast.showError(error, 'Failed to fetch plugins');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch available plugins for workspace
	 */
	async function fetchAvailablePlugins(workspaceId: string) {
		loading.value = true;
		try {
			availablePlugins.value = await pluginsApi.getAvailablePlugins(
				rootStore.restApiContext,
				workspaceId,
			);
			currentWorkspaceId.value = workspaceId;
		} catch (error) {
			toast.showError(error, 'Failed to fetch available plugins');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch custom plugins for workspace
	 */
	async function fetchMyPlugins(workspaceId: string) {
		loading.value = true;
		try {
			myPlugins.value = await pluginsApi.getMyPlugins(rootStore.restApiContext, workspaceId);
			currentWorkspaceId.value = workspaceId;
		} catch (error) {
			toast.showError(error, 'Failed to fetch my plugins');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Upload a new custom plugin
	 */
	async function uploadPlugin(
		workspaceId: string,
		file: File,
		metadata: {
			serviceKey: string;
			serviceName: string;
			category: string;
			description?: string;
			userConfigSchema?: Record<string, unknown>;
			pluginVersion: string;
			iconUrl?: string;
		},
	) {
		loading.value = true;
		try {
			// Read file content
			const pluginCode = await file.text();

			const plugin = await pluginsApi.uploadPlugin(rootStore.restApiContext, workspaceId, {
				...metadata,
				pluginCode,
			});

			// Add to myPlugins list
			myPlugins.value.push(plugin);

			toast.showMessage({
				title: 'Plugin Uploaded',
				message: `Plugin "${plugin.name}" has been uploaded successfully`,
				type: 'success',
			});

			return plugin;
		} catch (error) {
			toast.showError(error, 'Failed to upload plugin');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Submit plugin for platform review
	 */
	async function submitPlugin(workspaceId: string, serviceKey: string) {
		loading.value = true;
		try {
			await pluginsApi.submitPlugin(rootStore.restApiContext, workspaceId, serviceKey);

			// Update plugin status in local state
			const plugin = myPlugins.value.find((p) => p.serviceKey === serviceKey);
			if (plugin) {
				plugin.submissionStatus = 'pending';
				plugin.submittedAt = new Date().toISOString();
			}

			toast.showMessage({
				title: 'Plugin Submitted',
				message: 'Your plugin has been submitted for review',
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, 'Failed to submit plugin');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update an existing custom plugin
	 */
	async function updatePlugin(
		workspaceId: string,
		serviceKey: string,
		file?: File,
		metadata?: {
			serviceName?: string;
			category?: string;
			description?: string;
			pluginVersion?: string;
			iconUrl?: string;
		},
	) {
		loading.value = true;
		try {
			let pluginCode: string | undefined;
			if (file) {
				pluginCode = await file.text();
			}

			const updatedPlugin = await pluginsApi.updatePlugin(
				rootStore.restApiContext,
				workspaceId,
				serviceKey,
				{
					...metadata,
					pluginCode,
				},
			);

			// Update plugin in local state
			const index = myPlugins.value.findIndex((p) => p.serviceKey === serviceKey);
			if (index !== -1) {
				myPlugins.value[index] = updatedPlugin;
			}

			toast.showMessage({
				title: 'Plugin Updated',
				message: `Plugin "${updatedPlugin.name}" has been updated successfully`,
				type: 'success',
			});

			return updatedPlugin;
		} catch (error) {
			toast.showError(error, 'Failed to update plugin');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete a custom plugin
	 */
	async function deletePlugin(workspaceId: string, serviceKey: string) {
		loading.value = true;
		try {
			await pluginsApi.deletePlugin(rootStore.restApiContext, workspaceId, serviceKey);

			// Remove from local state
			myPlugins.value = myPlugins.value.filter((p) => p.serviceKey !== serviceKey);
			availablePlugins.value = availablePlugins.value.filter((p) => p.serviceKey !== serviceKey);

			// Clear credentials if exists
			pluginCredentials.value.delete(serviceKey);

			toast.showMessage({
				title: 'Plugin Deleted',
				message: 'Plugin has been deleted successfully',
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, 'Failed to delete plugin');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Configure credentials for a plugin
	 */
	async function configureCredentials(
		workspaceId: string,
		serviceKey: string,
		credentials: PluginCredentials,
	) {
		loading.value = true;
		try {
			await pluginsApi.configurePluginCredentials(
				rootStore.restApiContext,
				workspaceId,
				serviceKey,
				credentials,
			);

			// Update local cache
			pluginCredentials.value.set(serviceKey, credentials);

			// Update plugin configuration status
			const plugin = availablePlugins.value.find((p) => p.serviceKey === serviceKey);
			if (plugin) {
				plugin.isConfigured = true;
			}

			toast.showMessage({
				title: 'Credentials Configured',
				message: 'Plugin credentials have been configured successfully',
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, 'Failed to configure credentials');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch credentials for a plugin (masked)
	 */
	async function fetchCredentials(workspaceId: string, serviceKey: string) {
		loading.value = true;
		try {
			const credentials = await pluginsApi.getPluginCredentials(
				rootStore.restApiContext,
				workspaceId,
				serviceKey,
			);

			// Update local cache
			pluginCredentials.value.set(serviceKey, credentials);

			return credentials;
		} catch (error) {
			toast.showError(error, 'Failed to fetch credentials');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete credentials for a plugin
	 */
	async function deleteCredentials(workspaceId: string, serviceKey: string) {
		loading.value = true;
		try {
			await pluginsApi.deletePluginCredentials(rootStore.restApiContext, workspaceId, serviceKey);

			// Update local cache
			pluginCredentials.value.delete(serviceKey);

			// Update plugin configuration status
			const plugin = availablePlugins.value.find((p) => p.serviceKey === serviceKey);
			if (plugin) {
				plugin.isConfigured = false;
			}

			toast.showMessage({
				title: 'Credentials Deleted',
				message: 'Plugin credentials have been removed',
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, 'Failed to delete credentials');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Select a plugin for viewing details
	 */
	function selectPlugin(plugin: Plugin | null) {
		selectedPlugin.value = plugin;
	}

	/**
	 * Get plugin by service key
	 */
	function getPluginByKey(serviceKey: string): Plugin | undefined {
		return availablePlugins.value.find((p) => p.serviceKey === serviceKey);
	}

	/**
	 * Check if plugin is configured
	 */
	function isPluginConfigured(serviceKey: string): boolean {
		const plugin = availablePlugins.value.find((p) => p.serviceKey === serviceKey);
		return plugin?.isConfigured ?? false;
	}

	/**
	 * Reset store state
	 */
	function reset() {
		allPlugins.value = [];
		availablePlugins.value = [];
		myPlugins.value = [];
		selectedPlugin.value = null;
		pluginCredentials.value.clear();
		loading.value = false;
		currentWorkspaceId.value = null;
	}

	// #endregion

	return {
		// State
		allPlugins,
		availablePlugins,
		myPlugins,
		selectedPlugin,
		pluginCredentials,
		loading,
		currentWorkspaceId,

		// Computed
		platformPlugins,
		thirdPartyPlugins,
		customPlugins,
		pendingPlugins,
		pluginsByCategory,
		configuredPlugins,
		unconfiguredPlugins,

		// Actions
		fetchAllPlugins,
		fetchAvailablePlugins,
		fetchMyPlugins,
		uploadPlugin,
		submitPlugin,
		updatePlugin,
		deletePlugin,
		configureCredentials,
		fetchCredentials,
		deleteCredentials,
		selectPlugin,
		getPluginByKey,
		isPluginConfigured,
		reset,
	};
});
