import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { STORES } from '@n8n/stores';
import * as aiProvidersApi from '@/app/api/ai-providers';
import type {
	AIProvider,
	AIModel,
	ChatCompletionRequest,
	ChatCompletionResponse,
} from '@/app/api/ai-providers';

export const useAIProvidersStore = defineStore(STORES.AI_PROVIDERS, () => {
	const rootStore = useRootStore();

	// ---------------------------------------------------------------------------
	// #region State
	// ---------------------------------------------------------------------------

	const providers = ref<AIProvider[]>([]);
	const selectedProvider = ref<AIProvider | null>(null);
	const models = ref<AIModel[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	/**
	 * Get active providers only
	 */
	const activeProviders = computed(() => providers.value.filter((p) => p.isActive && p.enabled));

	/**
	 * Get current provider key
	 */
	const currentProviderKey = computed(() => selectedProvider.value?.providerKey ?? null);

	/**
	 * Check if models are loaded for current provider
	 */
	const hasModels = computed(() => models.value.length > 0);

	/**
	 * Check if currently loading
	 */
	const isLoading = computed(() => loading.value);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Actions
	// ---------------------------------------------------------------------------

	/**
	 * Fetch all active AI providers
	 */
	async function fetchProviders() {
		loading.value = true;
		error.value = null;

		try {
			const response = await aiProvidersApi.getProviders(rootStore.restApiContext);
			providers.value = response;
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch AI providers';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch provider details
	 */
	async function fetchProvider(providerKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const provider = await aiProvidersApi.getProvider(rootStore.restApiContext, providerKey);
			selectedProvider.value = provider;
			return provider;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch provider details';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch models for a specific provider
	 */
	async function fetchModels(providerKey: string) {
		loading.value = true;
		error.value = null;

		try {
			const response = await aiProvidersApi.getProviderModels(
				rootStore.restApiContext,
				providerKey,
			);
			models.value = response;
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch models';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Select a provider and load its models
	 */
	async function selectProvider(providerKey: string) {
		try {
			await fetchProvider(providerKey);
			await fetchModels(providerKey);
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to select provider';
			throw err;
		}
	}

	/**
	 * Call AI chat completion
	 */
	async function chatCompletion(
		providerKey: string,
		request: ChatCompletionRequest,
	): Promise<ChatCompletionResponse> {
		loading.value = true;
		error.value = null;

		try {
			const response = await aiProvidersApi.chatCompletion(
				rootStore.restApiContext,
				providerKey,
				request,
			);
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to call chat completion';
			throw err;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Get model by key
	 */
	function getModelByKey(modelKey: string): AIModel | undefined {
		return models.value.find((m) => m.modelKey === modelKey);
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
		models.value = [];
		loading.value = false;
		error.value = null;
	}

	// #endregion

	return {
		// State
		providers,
		selectedProvider,
		models,
		loading,
		error,

		// Computed
		activeProviders,
		currentProviderKey,
		hasModels,
		isLoading,

		// Actions
		fetchProviders,
		fetchProvider,
		fetchModels,
		selectProvider,
		chatCompletion,
		getModelByKey,
		clearError,
		reset,
	};
});
