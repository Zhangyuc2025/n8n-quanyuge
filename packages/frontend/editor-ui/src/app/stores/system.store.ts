import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface SystemInitStatus {
	initialized: boolean;
	hasAdmin: boolean;
}

export const useSystemStore = defineStore(STORES.SYSTEM, () => {
	const rootStore = useRootStore();

	// State
	const initializationStatus = ref<SystemInitStatus | null>(null);
	const isCheckingStatus = ref(false);
	const lastCheckedAt = ref<Date | null>(null);

	// Getters
	const isPlatformInitialized = computed(() => {
		return initializationStatus.value?.initialized ?? false;
	});

	const hasAdminAccount = computed(() => {
		return initializationStatus.value?.hasAdmin ?? false;
	});

	const needsSetup = computed(() => {
		return (
			initializationStatus.value !== null &&
			!initializationStatus.value.initialized &&
			!initializationStatus.value.hasAdmin
		);
	});

	const isReady = computed(() => {
		return initializationStatus.value?.initialized === true;
	});

	// Actions
	async function checkSystemStatus(): Promise<SystemInitStatus> {
		isCheckingStatus.value = true;

		try {
			const response = await makeRestApiRequest<SystemInitStatus>(
				rootStore.restApiContext,
				'GET',
				'/platform-admin/status',
			);

			initializationStatus.value = response;
			lastCheckedAt.value = new Date();

			return response;
		} catch (error) {
			console.error('[System] Failed to check initialization status:', error);
			throw error;
		} finally {
			isCheckingStatus.value = false;
		}
	}

	function resetState(): void {
		initializationStatus.value = null;
		isCheckingStatus.value = false;
		lastCheckedAt.value = null;
	}

	return {
		// State
		initializationStatus,
		isCheckingStatus,
		lastCheckedAt,

		// Getters
		isPlatformInitialized,
		hasAdminAccount,
		needsSetup,
		isReady,

		// Actions
		checkSystemStatus,
		resetState,
	};
});
