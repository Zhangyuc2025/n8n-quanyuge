import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { STORES } from '@n8n/stores';
import * as platformNodesApi from '@/app/api/platform-nodes';
import type { PlatformNode, NodeFilters, NodesByCategory } from '@/app/api/platform-nodes';
import { NodeType } from '@/app/api/platform-nodes';

export const usePlatformNodesStore = defineStore(STORES.PLATFORM_NODES, () => {
	const rootStore = useRootStore();

	// ---------------------------------------------------------------------------
	// #region State
	// ---------------------------------------------------------------------------

	const nodes = ref<PlatformNode[]>([]);
	const groupedNodes = ref<NodesByCategory>({});
	const selectedNode = ref<PlatformNode | null>(null);
	const filters = ref<NodeFilters>({});
	const loading = ref(false);
	const error = ref<string | null>(null);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	/**
	 * Get platform-managed nodes
	 */
	const platformManagedNodes = computed(() =>
		nodes.value.filter((n) => n.nodeType === NodeType.PLATFORM_MANAGED),
	);

	/**
	 * Get third-party nodes
	 */
	const thirdPartyNodes = computed(() =>
		nodes.value.filter((n) => n.nodeType === NodeType.THIRD_PARTY),
	);

	/**
	 * Get enabled nodes only
	 */
	const enabledNodes = computed(() => nodes.value.filter((n) => n.enabled && n.isActive));

	/**
	 * Get nodes by category
	 */
	const nodesByCategory = computed(() => {
		const grouped: NodesByCategory = {};
		nodes.value.forEach((node) => {
			const category = node.category ?? 'Uncategorized';
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(node);
		});
		return grouped;
	});

	/**
	 * Get available categories
	 */
	const categories = computed(() => {
		const cats = new Set<string>();
		nodes.value.forEach((node) => {
			if (node.category) {
				cats.add(node.category);
			}
		});
		return Array.from(cats).sort();
	});

	/**
	 * Check if currently loading
	 */
	const isLoading = computed(() => loading.value);

	/**
	 * Check if nodes are loaded
	 */
	const hasNodes = computed(() => nodes.value.length > 0);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Actions
	// ---------------------------------------------------------------------------

	/**
	 * Fetch all platform nodes
	 */
	async function fetchNodes(newFilters?: NodeFilters) {
		loading.value = true;
		error.value = null;

		if (newFilters) {
			filters.value = newFilters;
		}

		try {
			const response = await platformNodesApi.getNodes(rootStore.restApiContext, filters.value);
			nodes.value = response;
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch platform nodes';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch node details
	 */
	async function fetchNode(nodeKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const node = await platformNodesApi.getNode(rootStore.restApiContext, nodeKey);
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
	 * Search nodes
	 */
	async function searchNodes(query: string) {
		loading.value = true;
		error.value = null;

		try {
			const results = await platformNodesApi.searchNodes(rootStore.restApiContext, query);
			return results;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to search nodes';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch nodes grouped by category
	 */
	async function fetchGroupedNodes() {
		loading.value = true;
		error.value = null;

		try {
			const response = await platformNodesApi.getGroupedByCategory(rootStore.restApiContext);
			groupedNodes.value = response;
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch grouped nodes';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Admin: Approve a third-party node
	 */
	async function approveNode(nodeKey: string, reviewNotes?: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await platformNodesApi.approveNode(
				rootStore.restApiContext,
				nodeKey,
				reviewNotes,
			);
			// Refresh node list
			await fetchNodes();
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to approve node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Admin: Reject a third-party node
	 */
	async function rejectNode(nodeKey: string, reviewNotes?: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await platformNodesApi.rejectNode(
				rootStore.restApiContext,
				nodeKey,
				reviewNotes,
			);
			// Refresh node list
			await fetchNodes();
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to reject node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Admin: Toggle node enabled status
	 */
	async function toggleNode(nodeKey: string, enabled: boolean) {
		loading.value = true;
		error.value = null;

		try {
			const response = await platformNodesApi.toggleNode(
				rootStore.restApiContext,
				nodeKey,
				enabled,
			);
			// Refresh node list
			await fetchNodes();
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to toggle node';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get node by key from cached nodes
	 */
	function getNodeByKey(nodeKey: string): PlatformNode | undefined {
		return nodes.value.find((n) => n.nodeKey === nodeKey);
	}

	/**
	 * Set filters
	 */
	function setFilters(newFilters: NodeFilters) {
		filters.value = newFilters;
	}

	/**
	 * Clear filters
	 */
	function clearFilters() {
		filters.value = {};
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
		nodes.value = [];
		groupedNodes.value = {};
		selectedNode.value = null;
		filters.value = {};
		loading.value = false;
		error.value = null;
	}

	// #endregion

	return {
		// State
		nodes,
		groupedNodes,
		selectedNode,
		filters,
		loading,
		error,

		// Computed
		platformManagedNodes,
		thirdPartyNodes,
		enabledNodes,
		nodesByCategory,
		categories,
		isLoading,
		hasNodes,

		// Actions
		fetchNodes,
		fetchNode,
		searchNodes,
		fetchGroupedNodes,
		approveNode,
		rejectNode,
		toggleNode,
		getNodeByKey,
		setFilters,
		clearFilters,
		clearError,
		reset,
	};
});
