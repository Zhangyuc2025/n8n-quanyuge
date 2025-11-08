import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { STORES } from '@n8n/stores';
import { useToast } from '@/app/composables/useToast';
import * as billingApi from './billing.api';
import type {
	WorkspaceBalanceDto,
	UsageRecord,
	UsageSummaryDto,
	UsageQueryParams,
	UsageSummaryQueryParams,
	RechargeRecord,
	RechargeRecordsQueryParams,
} from './billing.api';

export const useBillingStore = defineStore(STORES.BILLING, () => {
	const rootStore = useRootStore();
	const toast = useToast();

	// ---------------------------------------------------------------------------
	// #region State
	// ---------------------------------------------------------------------------

	const balance = ref<WorkspaceBalanceDto | null>(null);
	const usageRecords = ref<UsageRecord[]>([]);
	const usagePagination = ref({
		total: 0,
		skip: 0,
		limit: 20,
		hasMore: false,
	});
	const rechargeRecords = ref<RechargeRecord[]>([]);
	const rechargePagination = ref({
		total: 0,
		skip: 0,
		limit: 20,
		hasMore: false,
	});
	const usageSummary = ref<UsageSummaryDto | null>(null);
	const loading = ref(false);
	const currentWorkspaceId = ref<string | null>(null);

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	/**
	 * Check if balance is low (below threshold)
	 */
	const hasLowBalance = computed(() => {
		if (!balance.value) return false;
		// Assuming low balance threshold is 10% of initial balance or 100 CNY
		const threshold = 100;
		return balance.value.balance < threshold;
	});

	/**
	 * Formatted balance string
	 */
	const formattedBalance = computed(() => {
		if (!balance.value) return '¥0.00';
		return `¥${balance.value.balance.toFixed(2)}`;
	});

	/**
	 * Currency symbol
	 */
	const currencySymbol = computed(() => {
		if (!balance.value) return '¥';
		return balance.value.currency === 'CNY' ? '¥' : balance.value.currency;
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Actions
	// ---------------------------------------------------------------------------

	/**
	 * Fetch workspace balance
	 */
	async function fetchBalance(workspaceId: string) {
		loading.value = true;
		try {
			balance.value = await billingApi.getWorkspaceBalance(rootStore.restApiContext, workspaceId);
			currentWorkspaceId.value = workspaceId;
		} catch (error) {
			toast.showError(error, 'Failed to fetch balance');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Refresh current workspace balance
	 */
	async function refreshBalance() {
		if (!currentWorkspaceId.value) {
			throw new Error('No workspace selected');
		}
		await fetchBalance(currentWorkspaceId.value);
	}

	/**
	 * Fetch usage records with pagination
	 */
	async function fetchUsageRecords(workspaceId: string, params?: Partial<UsageQueryParams>) {
		loading.value = true;
		try {
			const queryParams: UsageQueryParams = {
				workspaceId,
				skip: params?.skip ?? usagePagination.value.skip,
				limit: params?.limit ?? usagePagination.value.limit,
				startDate: params?.startDate,
				endDate: params?.endDate,
			};

			const response = await billingApi.getUsageRecords(rootStore.restApiContext, queryParams);

			// If skip is 0, replace records; otherwise append
			if (queryParams.skip === 0) {
				usageRecords.value = response.records;
			} else {
				usageRecords.value.push(...response.records);
			}

			usagePagination.value = response.pagination;
			currentWorkspaceId.value = workspaceId;
		} catch (error) {
			toast.showError(error, 'Failed to fetch usage records');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch recharge records with pagination
	 */
	async function fetchRechargeRecords(
		workspaceId: string,
		params?: Partial<RechargeRecordsQueryParams>,
	) {
		loading.value = true;
		try {
			const queryParams: RechargeRecordsQueryParams = {
				workspaceId,
				skip: params?.skip ?? rechargePagination.value.skip,
				limit: params?.limit ?? rechargePagination.value.limit,
			};

			const response = await billingApi.getRechargeRecords(rootStore.restApiContext, queryParams);

			// If skip is 0, replace records; otherwise append
			if (queryParams.skip === 0) {
				rechargeRecords.value = response.records;
			} else {
				rechargeRecords.value.push(...response.records);
			}

			rechargePagination.value = response.pagination;
			currentWorkspaceId.value = workspaceId;
		} catch (error) {
			toast.showError(error, 'Failed to fetch recharge records');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Fetch monthly usage summary
	 */
	async function fetchUsageSummary(
		workspaceId: string,
		year?: number,
		month?: number,
	): Promise<void> {
		loading.value = true;
		try {
			const params: UsageSummaryQueryParams = {
				workspaceId,
				year,
				month,
			};

			usageSummary.value = await billingApi.getUsageSummary(rootStore.restApiContext, params);
			currentWorkspaceId.value = workspaceId;
		} catch (error) {
			toast.showError(error, 'Failed to fetch usage summary');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Initiate recharge
	 */
	async function initiateRecharge(workspaceId: string, amount: number, paymentMethod: string) {
		loading.value = true;
		try {
			const response = await billingApi.recharge(
				rootStore.restApiContext,
				workspaceId,
				amount,
				paymentMethod,
			);

			if (response.success) {
				toast.showMessage({
					title: 'Recharge Initiated',
					message: response.message,
					type: 'success',
				});

				// Refresh balance after successful recharge
				await fetchBalance(workspaceId);
			}

			return response;
		} catch (error) {
			toast.showError(error, 'Failed to initiate recharge');
			throw error;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Load more usage records
	 */
	async function loadMoreUsageRecords() {
		if (!currentWorkspaceId.value || !usagePagination.value.hasMore) {
			return;
		}

		await fetchUsageRecords(currentWorkspaceId.value, {
			skip: usagePagination.value.skip + usagePagination.value.limit,
		});
	}

	/**
	 * Load more recharge records
	 */
	async function loadMoreRechargeRecords() {
		if (!currentWorkspaceId.value || !rechargePagination.value.hasMore) {
			return;
		}

		await fetchRechargeRecords(currentWorkspaceId.value, {
			skip: rechargePagination.value.skip + rechargePagination.value.limit,
		});
	}

	/**
	 * Reset store state
	 */
	function reset() {
		balance.value = null;
		usageRecords.value = [];
		usagePagination.value = {
			total: 0,
			skip: 0,
			limit: 20,
			hasMore: false,
		};
		rechargeRecords.value = [];
		rechargePagination.value = {
			total: 0,
			skip: 0,
			limit: 20,
			hasMore: false,
		};
		usageSummary.value = null;
		loading.value = false;
		currentWorkspaceId.value = null;
	}

	// #endregion

	return {
		// State
		balance,
		usageRecords,
		usagePagination,
		rechargeRecords,
		rechargePagination,
		usageSummary,
		loading,
		currentWorkspaceId,

		// Computed
		hasLowBalance,
		formattedBalance,
		currencySymbol,

		// Actions
		fetchBalance,
		refreshBalance,
		fetchUsageRecords,
		fetchRechargeRecords,
		fetchUsageSummary,
		initiateRecharge,
		loadMoreUsageRecords,
		loadMoreRechargeRecords,
		reset,
	};
});
