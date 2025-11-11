import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Platform Node Types
 */
export type NodeType = 'platform' | 'third-party';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type ConfigMode = 'none' | 'user' | 'team';
export type BillingMode = 'free' | 'token-based' | 'per-execution' | 'duration-based';

export interface BillingConfig {
	pricePerToken?: number;
	pricePerExecution?: number;
	pricePerSecond?: number;
	currency: string;
}

export interface AdminPlatformNode {
	id: string;
	nodeKey: string;
	nodeName: string;
	nodeType: NodeType;
	nodeDefinition: Record<string, unknown>;
	nodeCode?: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
	isActive: boolean;
	enabled: boolean;
	submissionStatus?: SubmissionStatus;
	reviewedBy?: string;
	reviewedAt?: string;
	reviewNotes?: string;
	billingMode?: BillingMode;
	billingConfig?: BillingConfig;
	createdAt: string;
	updatedAt: string;
}

export interface CreatePlatformNodeRequest {
	nodeKey: string;
	nodeName: string;
	nodeType: NodeType;
	nodeDefinition: Record<string, unknown>;
	nodeCode?: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
	billingMode?: BillingMode;
	billingConfig?: BillingConfig;
}

export interface UpdatePlatformNodeRequest {
	nodeName?: string;
	nodeDefinition?: Record<string, unknown>;
	nodeCode?: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
	billingMode?: BillingMode;
	billingConfig?: BillingConfig;
}

export interface ListNodesFilters {
	category?: string;
	nodeType?: NodeType;
	enabled?: boolean;
	isActive?: boolean;
	submissionStatus?: SubmissionStatus;
}

/**
 * Custom Node Types
 */
export interface AdminCustomNode {
	id: string;
	workspaceId: string;
	userId: string;
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
	isActive: boolean;
	submissionStatus?: SubmissionStatus;
	submittedAt?: string;
	reviewedBy?: string;
	reviewedAt?: string;
	reviewNotes?: string;
	createdAt: string;
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

export const usePlatformNodesStore = defineStore('platform-nodes', () => {
	// State
	const platformNodes = ref<AdminPlatformNode[]>([]);
	const selectedPlatformNode = ref<AdminPlatformNode | null>(null);
	const customNodes = ref<AdminCustomNode[]>([]);
	const selectedCustomNode = ref<AdminCustomNode | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	// Computed

	/**
	 * Get pending platform nodes
	 */
	const pendingPlatformNodes = computed(() =>
		platformNodes.value.filter((n) => n.submissionStatus === 'pending'),
	);

	/**
	 * Get approved platform nodes
	 */
	const approvedPlatformNodes = computed(() =>
		platformNodes.value.filter((n) => n.submissionStatus === 'approved'),
	);

	/**
	 * Get rejected platform nodes
	 */
	const rejectedPlatformNodes = computed(() =>
		platformNodes.value.filter((n) => n.submissionStatus === 'rejected'),
	);

	/**
	 * Get active platform nodes
	 */
	const activePlatformNodes = computed(() =>
		platformNodes.value.filter((n) => n.isActive && n.enabled),
	);

	/**
	 * Get pending custom nodes
	 */
	const pendingCustomNodes = computed(() =>
		customNodes.value.filter((n) => n.submissionStatus === 'pending'),
	);

	/**
	 * Check if currently loading
	 */
	const isLoading = computed(() => loading.value);

	/**
	 * Check if there are any errors
	 */
	const hasError = computed(() => error.value !== null);

	// Platform Node Actions

	/**
	 * Fetch all platform nodes (admin view, including inactive and pending nodes)
	 */
	async function fetchPlatformNodes(filters?: ListNodesFilters) {
		loading.value = true;
		error.value = null;

		try {
			const params = new URLSearchParams();
			if (filters?.category) {
				params.append('category', filters.category);
			}
			if (filters?.nodeType) {
				params.append('nodeType', filters.nodeType);
			}
			if (filters?.enabled !== undefined) {
				params.append('enabled', String(filters.enabled));
			}
			if (filters?.isActive !== undefined) {
				params.append('isActive', String(filters.isActive));
			}
			if (filters?.submissionStatus) {
				params.append('submissionStatus', filters.submissionStatus);
			}

			const url = `/rest/platform-nodes/admin/all${params.toString() ? `?${params.toString()}` : ''}`;
			const response = await fetch(url, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch platform nodes: ${response.statusText}`);
			}

			platformNodes.value = await response.json();
			return platformNodes.value;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch platform nodes';
			console.error('[Platform Nodes] Failed to fetch platform nodes:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch platform node details by node key
	 */
	async function fetchPlatformNode(nodeKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/platform-nodes/${nodeKey}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch platform node details: ${response.statusText}`);
			}

			selectedPlatformNode.value = await response.json();
			return selectedPlatformNode.value;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch platform node details';
			console.error('[Platform Nodes] Failed to fetch platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Create platform node
	 */
	async function createPlatformNode(data: CreatePlatformNodeRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch('/rest/platform-nodes/admin/create', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to create platform node: ${response.statusText}`);
			}

			const node = await response.json();
			platformNodes.value.push(node);
			return node;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to create platform node';
			console.error('[Platform Nodes] Failed to create platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update platform node
	 */
	async function updatePlatformNode(nodeKey: string, data: UpdatePlatformNodeRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/platform-nodes/${nodeKey}`, {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to update platform node: ${response.statusText}`);
			}

			const node = await response.json();

			// Update in the list
			const index = platformNodes.value.findIndex((n) => n.nodeKey === nodeKey);
			if (index !== -1) {
				platformNodes.value[index] = node;
			}

			// Update selected if it's the same
			if (selectedPlatformNode.value?.nodeKey === nodeKey) {
				selectedPlatformNode.value = node;
			}

			return node;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to update platform node';
			console.error('[Platform Nodes] Failed to update platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete platform node
	 */
	async function deletePlatformNode(nodeKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/platform-nodes/admin/${nodeKey}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to delete platform node: ${response.statusText}`);
			}

			// Remove from the list
			platformNodes.value = platformNodes.value.filter((n) => n.nodeKey !== nodeKey);

			// Clear selected if it's the same
			if (selectedPlatformNode.value?.nodeKey === nodeKey) {
				selectedPlatformNode.value = null;
			}

			return { success: true };
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to delete platform node';
			console.error('[Platform Nodes] Failed to delete platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Approve platform node
	 */
	async function approvePlatformNode(nodeKey: string, reviewNotes?: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/platform-nodes/${nodeKey}/approve`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ reviewNotes }),
			});

			if (!response.ok) {
				throw new Error(`Failed to approve platform node: ${response.statusText}`);
			}

			const result = await response.json();

			// Update in the list
			const index = platformNodes.value.findIndex((n) => n.nodeKey === nodeKey);
			if (index !== -1) {
				platformNodes.value[index].submissionStatus = 'approved';
			}

			// Update selected if it's the same
			if (selectedPlatformNode.value?.nodeKey === nodeKey) {
				selectedPlatformNode.value.submissionStatus = 'approved';
			}

			return result;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to approve platform node';
			console.error('[Platform Nodes] Failed to approve platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Reject platform node
	 */
	async function rejectPlatformNode(nodeKey: string, reviewNotes?: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/platform-nodes/${nodeKey}/reject`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ reviewNotes }),
			});

			if (!response.ok) {
				throw new Error(`Failed to reject platform node: ${response.statusText}`);
			}

			const result = await response.json();

			// Update in the list
			const index = platformNodes.value.findIndex((n) => n.nodeKey === nodeKey);
			if (index !== -1) {
				platformNodes.value[index].submissionStatus = 'rejected';
			}

			// Update selected if it's the same
			if (selectedPlatformNode.value?.nodeKey === nodeKey) {
				selectedPlatformNode.value.submissionStatus = 'rejected';
			}

			return result;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to reject platform node';
			console.error('[Platform Nodes] Failed to reject platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Toggle platform node enabled/disabled status
	 */
	async function togglePlatformNode(nodeKey: string, enabled: boolean) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/platform-nodes/${nodeKey}/toggle`, {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ enabled }),
			});

			if (!response.ok) {
				throw new Error(`Failed to toggle platform node: ${response.statusText}`);
			}

			const result = await response.json();

			// Update in the list
			const index = platformNodes.value.findIndex((n) => n.nodeKey === nodeKey);
			if (index !== -1) {
				platformNodes.value[index].enabled = enabled;
			}

			// Update selected if it's the same
			if (selectedPlatformNode.value?.nodeKey === nodeKey) {
				selectedPlatformNode.value.enabled = enabled;
			}

			return result;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to toggle platform node';
			console.error('[Platform Nodes] Failed to toggle platform node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch pending submissions
	 */
	async function fetchPendingSubmissions() {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch('/rest/platform-nodes/admin/submissions', {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch pending submissions: ${response.statusText}`);
			}

			return await response.json();
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch pending submissions';
			console.error('[Platform Nodes] Failed to fetch pending submissions:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get nodes grouped by category
	 */
	async function getNodesByCategory() {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch('/rest/platform-nodes/categories/grouped', {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch nodes by category: ${response.statusText}`);
			}

			return await response.json();
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch nodes by category';
			console.error('[Platform Nodes] Failed to fetch nodes by category:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	// Custom Node Actions

	/**
	 * Fetch all custom nodes for a workspace
	 */
	async function fetchCustomNodes(workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/custom-nodes?workspaceId=${workspaceId}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch custom nodes: ${response.statusText}`);
			}

			customNodes.value = await response.json();
			return customNodes.value;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch custom nodes';
			console.error('[Platform Nodes] Failed to fetch custom nodes:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch custom node details
	 */
	async function fetchCustomNode(nodeKey: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/custom-nodes/${nodeKey}?workspaceId=${workspaceId}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch custom node details: ${response.statusText}`);
			}

			selectedCustomNode.value = await response.json();
			return selectedCustomNode.value;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch custom node details';
			console.error('[Platform Nodes] Failed to fetch custom node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Create custom node
	 */
	async function createCustomNode(data: CreateCustomNodeRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch('/rest/custom-nodes', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to create custom node: ${response.statusText}`);
			}

			const node = await response.json();
			customNodes.value.push(node);
			return node;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to create custom node';
			console.error('[Platform Nodes] Failed to create custom node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update custom node
	 */
	async function updateCustomNode(
		nodeId: string,
		workspaceId: string,
		data: UpdateCustomNodeRequest,
	) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/custom-nodes/${nodeId}?workspaceId=${workspaceId}`, {
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to update custom node: ${response.statusText}`);
			}

			const result = await response.json();

			// Refresh the node to get updated data
			const updatedNode = await fetchCustomNode(nodeId, workspaceId);

			// Update in the list
			const index = customNodes.value.findIndex((n) => n.id === nodeId);
			if (index !== -1) {
				customNodes.value[index] = updatedNode;
			}

			return result;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to update custom node';
			console.error('[Platform Nodes] Failed to update custom node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete custom node
	 */
	async function deleteCustomNode(nodeId: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/custom-nodes/${nodeId}?workspaceId=${workspaceId}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to delete custom node: ${response.statusText}`);
			}

			// Remove from the list
			customNodes.value = customNodes.value.filter((n) => n.id !== nodeId);

			// Clear selected if it's the same
			if (selectedCustomNode.value?.id === nodeId) {
				selectedCustomNode.value = null;
			}

			return { success: true };
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to delete custom node';
			console.error('[Platform Nodes] Failed to delete custom node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Submit custom node for review
	 */
	async function submitCustomNodeForReview(nodeId: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(
				`/rest/custom-nodes/${nodeId}/submit?workspaceId=${workspaceId}`,
				{
					method: 'POST',
					credentials: 'include',
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to submit custom node for review: ${response.statusText}`);
			}

			return await response.json();
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to submit custom node for review';
			console.error('[Platform Nodes] Failed to submit custom node for review:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update shared configuration for a custom node
	 */
	async function updateCustomNodeSharedConfig(
		nodeId: string,
		workspaceId: string,
		configData: Record<string, unknown>,
	) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(
				`/rest/custom-nodes/${nodeId}/shared-config?workspaceId=${workspaceId}`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ configData }),
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to update shared configuration: ${response.statusText}`);
			}

			return await response.json();
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to update shared configuration';
			console.error('[Platform Nodes] Failed to update shared configuration:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get shared configuration for a custom node
	 */
	async function getCustomNodeSharedConfig(nodeId: string, workspaceId: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(
				`/rest/custom-nodes/${nodeId}/shared-config?workspaceId=${workspaceId}`,
				{
					method: 'GET',
					credentials: 'include',
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to get shared configuration: ${response.statusText}`);
			}

			return await response.json();
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to get shared configuration';
			console.error('[Platform Nodes] Failed to get shared configuration:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Toggle custom node active/inactive status
	 */
	async function toggleCustomNode(nodeId: string, workspaceId: string, isActive: boolean) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(
				`/rest/custom-nodes/${nodeId}/toggle?workspaceId=${workspaceId}`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ isActive }),
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to toggle custom node: ${response.statusText}`);
			}

			// Update in the list
			const index = customNodes.value.findIndex((n) => n.id === nodeId);
			if (index !== -1) {
				customNodes.value[index].isActive = isActive;
			}

			// Update selected if it's the same
			if (selectedCustomNode.value?.id === nodeId) {
				selectedCustomNode.value.isActive = isActive;
			}

			return { success: true };
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to toggle custom node';
			console.error('[Platform Nodes] Failed to toggle custom node:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	// Utility Actions

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
		platformNodes.value = [];
		selectedPlatformNode.value = null;
		customNodes.value = [];
		selectedCustomNode.value = null;
		loading.value = false;
		error.value = null;
	}

	return {
		// State
		platformNodes,
		selectedPlatformNode,
		customNodes,
		selectedCustomNode,
		loading,
		error,

		// Computed
		pendingPlatformNodes,
		approvedPlatformNodes,
		rejectedPlatformNodes,
		activePlatformNodes,
		pendingCustomNodes,
		isLoading,
		hasError,

		// Platform Node Actions
		fetchPlatformNodes,
		fetchPlatformNode,
		createPlatformNode,
		updatePlatformNode,
		deletePlatformNode,
		approvePlatformNode,
		rejectPlatformNode,
		togglePlatformNode,
		fetchPendingSubmissions,
		getNodesByCategory,

		// Custom Node Actions
		fetchCustomNodes,
		fetchCustomNode,
		createCustomNode,
		updateCustomNode,
		deleteCustomNode,
		submitCustomNodeForReview,
		updateCustomNodeSharedConfig,
		getCustomNodeSharedConfig,
		toggleCustomNode,

		// Utility Actions
		clearError,
		reset,
	};
});
