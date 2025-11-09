import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { STORES } from '@n8n/stores';
import * as customNodesApi from '@/app/api/custom-nodes';
import type {
	CustomNode,
	CreateCustomNodeRequest,
	UpdateCustomNodeRequest,
	SharedConfigRequest,
} from '@/app/api/custom-nodes';
import { ConfigMode } from '@/app/api/custom-nodes';

export const useCustomNodesStore = defineStore(STORES.CUSTOM_NODES, () => {
	const rootStore = useRootStore();

	// ---------------------------------------------------------------------------
	// #region State
	// ---------------------------------------------------------------------------

	const customNodes = ref<CustomNode[]>([]);
	const selectedNode = ref<CustomNode | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	/**
	 * Get active custom nodes
	 */
	const activeNodes = computed(() => customNodes.value.filter((n) => n.isActive));

	/**
	 * Get pending submission nodes
	 */
	const pendingNodes = computed(() =>
		customNodes.value.filter((n) => n.submissionStatus === 'pending'),
	);

	/**
	 * Get user-managed nodes
	 */
	const userManagedNodes = computed(() =>
		customNodes.value.filter((n) => n.configMode === ConfigMode.USER_MANAGED),
	);

	/**
	 * Get team-shared nodes
	 */
	const teamSharedNodes = computed(() =>
		customNodes.value.filter((n) => n.configMode === ConfigMode.TEAM_SHARED),
	);

	/**
	 * Get nodes by category
	 */
	const nodesByCategory = computed(() => {
		const grouped: Record<string, CustomNode[]> = {};
		customNodes.value.forEach((node) => {
			const category = node.category ?? 'Uncategorized';
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(node);
		});
		return grouped;
	});

	/**
	 * Check if currently loading
	 */
	const isLoading = computed(() => loading.value);

	/**
	 * Check if has custom nodes
	 */
	const hasNodes = computed(() => customNodes.value.length > 0);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Actions
	// ---------------------------------------------------------------------------

	/**
	 * Fetch workspace custom nodes
	 */
	async function fetchWorkspaceNodes(workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await customNodesApi.getCustomNodes(rootStore.restApiContext, workspaceId);
			customNodes.value = response;
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch custom nodes';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch custom node details
	 */
	async function fetchNode(nodeKey: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const node = await customNodesApi.getCustomNode(
				rootStore.restApiContext,
				nodeKey,
				workspaceId,
			);
			selectedNode.value = node;
			return node;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch node details';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Create a new custom node
	 */
	async function createNode(data: CreateCustomNodeRequest) {
		loading.value = true;
		error.value = null;

		try {
			const node = await customNodesApi.createCustomNode(rootStore.restApiContext, data);
			customNodes.value.push(node);
			return node;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to create custom node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update custom node
	 */
	async function updateNode(id: string, workspaceId: string, data: UpdateCustomNodeRequest) {
		loading.value = true;
		error.value = null;

		try {
			await customNodesApi.updateCustomNode(rootStore.restApiContext, id, workspaceId, data);
			// Refresh node list
			await fetchWorkspaceNodes(workspaceId);
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to update custom node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete custom node
	 */
	async function deleteNode(id: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			await customNodesApi.deleteCustomNode(rootStore.restApiContext, id, workspaceId);
			// Remove from local state
			customNodes.value = customNodes.value.filter((n) => n.id !== id);
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to delete custom node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Submit custom node for review
	 */
	async function submitForReview(id: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await customNodesApi.submitForReview(
				rootStore.restApiContext,
				id,
				workspaceId,
			);
			// Refresh node list
			await fetchWorkspaceNodes(workspaceId);
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to submit node for review';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update team shared configuration
	 */
	async function updateSharedConfig(id: string, workspaceId: string, config: SharedConfigRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await customNodesApi.updateSharedConfig(
				rootStore.restApiContext,
				id,
				workspaceId,
				config,
			);
			// Refresh node to get updated config
			const nodeKey = customNodes.value.find((n) => n.id === id)?.nodeKey;
			if (nodeKey) {
				await fetchNode(nodeKey, workspaceId);
			}
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to update shared configuration';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get team shared configuration
	 */
	async function getSharedConfig(id: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const config = await customNodesApi.getSharedConfig(
				rootStore.restApiContext,
				id,
				workspaceId,
			);
			return config;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to get shared configuration';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Toggle custom node enabled status
	 */
	async function toggleNode(id: string, workspaceId: string, isActive: boolean) {
		loading.value = true;
		error.value = null;

		try {
			await customNodesApi.toggleCustomNode(rootStore.restApiContext, id, workspaceId, isActive);
			// Update local state
			const node = customNodes.value.find((n) => n.id === id);
			if (node) {
				node.isActive = isActive;
			}
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to toggle custom node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get node by key from cached nodes
	 */
	function getNodeByKey(nodeKey: string): CustomNode | undefined {
		return customNodes.value.find((n) => n.nodeKey === nodeKey);
	}

	/**
	 * Get node by ID from cached nodes
	 */
	function getNodeById(id: string): CustomNode | undefined {
		return customNodes.value.find((n) => n.id === id);
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
		customNodes.value = [];
		selectedNode.value = null;
		loading.value = false;
		error.value = null;
	}

	// #endregion

	return {
		// State
		customNodes,
		selectedNode,
		loading,
		error,

		// Computed
		activeNodes,
		pendingNodes,
		userManagedNodes,
		teamSharedNodes,
		nodesByCategory,
		isLoading,
		hasNodes,

		// Actions
		fetchWorkspaceNodes,
		fetchNode,
		createNode,
		updateNode,
		deleteNode,
		submitForReview,
		updateSharedConfig,
		getSharedConfig,
		toggleNode,
		getNodeByKey,
		getNodeById,
		clearError,
		reset,
	};
});
