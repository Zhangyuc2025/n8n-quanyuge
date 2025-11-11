import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface SystemInitStatus {
	initialized: boolean;
	hasAdmin: boolean;
}

export const useSystemStore = defineStore('system', () => {
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
			const response = await fetch('/rest/platform-admin/status', {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to check system status');
			}

			const result = (await response.json()) as { data: SystemInitStatus };
			const status = result.data;
			initializationStatus.value = status;
			lastCheckedAt.value = new Date();

			return status;
		} catch (error) {
			console.error('[System] Failed to check initialization status:', error);
			throw error;
		} finally {
			isCheckingStatus.value = false;
		}
	}

	async function setupAdmin(data: {
		email: string;
		password: string;
		name: string;
	}): Promise<void> {
		try {
			const response = await fetch('/rest/platform-admin/setup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to setup administrator');
			}

			// Refresh status after successful setup
			await checkSystemStatus();
		} catch (error) {
			console.error('[System] Failed to setup admin:', error);
			throw error;
		}
	}

	async function loginAdmin(data: { email: string; password: string }): Promise<{
		admin: unknown;
	}> {
		try {
			const response = await fetch('/rest/platform-admin/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Login failed');
			}

			const responseData = (await response.json()) as {
				data: { admin: unknown };
			};
			const result = responseData.data;

			// Cookie is automatically set by the backend via Set-Cookie header
			// No need to store token in localStorage

			// Refresh system status after successful login
			await checkSystemStatus();

			return result;
		} catch (error) {
			console.error('[System] Failed to login admin:', error);
			throw error;
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
		setupAdmin,
		loginAdmin,
		resetState,
	};
});
