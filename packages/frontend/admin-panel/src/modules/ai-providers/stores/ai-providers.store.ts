import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Admin AI Provider Types
 */
export interface AdminAIProvider {
	id: string;
	providerKey: string;
	providerName: string;
	apiEndpoint: string;
	apiKey?: string;
	modelsConfig: {
		models: Array<{
			id: string;
			name: string;
			description: string;
			pricePerToken: number;
			currency: string;
			contextWindow: number;
			maxOutputTokens: number;
			supportsFunctions: boolean;
			supportsVision: boolean;
		}>;
	};
	quotaConfig?: {
		monthlyTokens?: number;
		currentUsed?: number;
	};
	isActive: boolean;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateAIProviderRequest {
	providerKey: string;
	providerName: string;
	apiEndpoint: string;
	apiKey: string;
	modelsConfig: {
		models: Array<{
			id: string;
			name: string;
			description: string;
			pricePerToken: number;
			currency: string;
			contextWindow: number;
			maxOutputTokens: number;
			supportsFunctions: boolean;
			supportsVision: boolean;
		}>;
	};
	quotaConfig?: {
		monthlyTokens?: number;
		currentUsed?: number;
	};
	enabled?: boolean;
}

export interface UpdateAIProviderRequest {
	apiKey?: string;
	modelsConfig?: {
		models: Array<{
			id: string;
			name: string;
			description: string;
			pricePerToken: number;
			currency: string;
			contextWindow: number;
			maxOutputTokens: number;
			supportsFunctions: boolean;
			supportsVision: boolean;
		}>;
	};
	quotaConfig?: Record<string, unknown>;
	enabled?: boolean;
}

export interface ListProvidersFilters {
	isActive?: boolean;
	enabled?: boolean;
}

export const useAIProvidersStore = defineStore('ai-providers', () => {
	// State
	const providers = ref<AdminAIProvider[]>([]);
	const selectedProvider = ref<AdminAIProvider | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	// Computed
	const activeProviders = computed(() => providers.value.filter((p) => p.isActive && p.enabled));

	const inactiveProviders = computed(() =>
		providers.value.filter((p) => !p.isActive || !p.enabled),
	);

	const isLoading = computed(() => loading.value);

	const hasError = computed(() => error.value !== null);

	// Actions

	/**
	 * Fetch all AI providers
	 */
	async function fetchProviders(filters?: ListProvidersFilters) {
		loading.value = true;
		error.value = null;

		try {
			const params = new URLSearchParams();
			if (filters?.isActive !== undefined) {
				params.append('isActive', String(filters.isActive));
			}
			if (filters?.enabled !== undefined) {
				params.append('enabled', String(filters.enabled));
			}

			const url = `/rest/admin/platform-ai-providers${params.toString() ? `?${params.toString()}` : ''}`;
			const response = await fetch(url, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch AI providers: ${response.statusText}`);
			}

			providers.value = await response.json();
			return providers.value;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch AI providers';
			console.error('[AI Providers] Failed to fetch providers:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch AI provider details by provider key
	 */
	async function fetchProvider(providerKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/admin/platform-ai-providers/${providerKey}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch AI provider details: ${response.statusText}`);
			}

			selectedProvider.value = await response.json();
			return selectedProvider.value;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch AI provider details';
			console.error('[AI Providers] Failed to fetch provider:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Create AI provider
	 */
	async function createProvider(data: CreateAIProviderRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch('/rest/admin/platform-ai-providers', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to create AI provider: ${response.statusText}`);
			}

			const provider = await response.json();
			providers.value.push(provider);
			return provider;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to create AI provider';
			console.error('[AI Providers] Failed to create provider:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Update AI provider
	 */
	async function updateProvider(providerKey: string, data: UpdateAIProviderRequest) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/admin/platform-ai-providers/${providerKey}`, {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to update AI provider: ${response.statusText}`);
			}

			const provider = await response.json();

			// Update in the list
			const index = providers.value.findIndex((p) => p.providerKey === providerKey);
			if (index !== -1) {
				providers.value[index] = provider;
			}

			// Update selected if it's the same
			if (selectedProvider.value?.providerKey === providerKey) {
				selectedProvider.value = provider;
			}

			return provider;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to update AI provider';
			console.error('[AI Providers] Failed to update provider:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Delete AI provider
	 */
	async function deleteProvider(providerKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/admin/platform-ai-providers/${providerKey}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to delete AI provider: ${response.statusText}`);
			}

			// Remove from the list
			providers.value = providers.value.filter((p) => p.providerKey !== providerKey);

			// Clear selected if it's the same
			if (selectedProvider.value?.providerKey === providerKey) {
				selectedProvider.value = null;
			}

			return { success: true };
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to delete AI provider';
			console.error('[AI Providers] Failed to delete provider:', e);
			throw e;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Toggle AI provider enabled/disabled status
	 */
	async function toggleProvider(providerKey: string, enabled: boolean) {
		loading.value = true;
		error.value = null;

		try {
			const response = await fetch(`/rest/admin/platform-ai-providers/${providerKey}/toggle`, {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ enabled }),
			});

			if (!response.ok) {
				throw new Error(`Failed to toggle AI provider: ${response.statusText}`);
			}

			const result = await response.json();

			// Update in the list
			const index = providers.value.findIndex((p) => p.providerKey === providerKey);
			if (index !== -1) {
				providers.value[index].enabled = enabled;
			}

			// Update selected if it's the same
			if (selectedProvider.value?.providerKey === providerKey) {
				selectedProvider.value.enabled = enabled;
			}

			return result;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to toggle AI provider';
			console.error('[AI Providers] Failed to toggle provider:', e);
			throw e;
		} finally {
			loading.value = false;
		}
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
		providers.value = [];
		selectedProvider.value = null;
		loading.value = false;
		error.value = null;
	}

	return {
		// State
		providers,
		selectedProvider,
		loading,
		error,

		// Computed
		activeProviders,
		inactiveProviders,
		isLoading,
		hasError,

		// Actions
		fetchProviders,
		fetchProvider,
		createProvider,
		updateProvider,
		deleteProvider,
		toggleProvider,
		clearError,
		reset,
	};
});
