<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useBillingStore } from '../billing.store';
import {
	N8nCard,
	N8nButton,
	N8nText,
	N8nTabs,
	N8nDataTableServer,
	N8nBadge,
	N8nHeading,
	N8nLoading,
	N8nInput,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const projectsStore = useProjectsStore();
const billingStore = useBillingStore();

// State
const activeTab = ref<'usage' | 'recharge' | 'summary'>('usage');
const startDate = ref('');
const endDate = ref('');
const showRechargeDialog = ref(false);

// Table options
const usageTableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: 20,
	sortBy: [],
});

const rechargeTableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: 20,
	sortBy: [],
});

// Computed
const currentWorkspaceId = computed(() => projectsStore.currentWorkspaceId);

const balanceCardClass = computed(() => {
	const classes = ['balance-card'];
	if (billingStore.hasLowBalance) {
		classes.push('low-balance');
	}
	return classes.join(' ');
});

const tabs = computed(() => [
	{
		label: i18n.baseText('billing.tabs.usage'),
		value: 'usage',
	},
	{
		label: i18n.baseText('billing.tabs.recharge'),
		value: 'recharge',
	},
	{
		label: i18n.baseText('billing.tabs.summary'),
		value: 'summary',
	},
]);

// Usage records table
const usageHeaders = computed<Array<TableHeader<Record<string, any>>>>(() => [
	{
		title: i18n.baseText('billing.table.time'),
		key: 'createdAt',
		value: 'createdAt',
		width: 180,
	},
	{
		title: i18n.baseText('billing.table.service'),
		key: 'serviceName',
		value: 'serviceName',
		width: 150,
	},
	{
		title: i18n.baseText('billing.table.operation'),
		key: 'serviceType',
		value: 'serviceType',
		width: 150,
	},
	{
		title: i18n.baseText('billing.table.amount'),
		key: 'amountCny',
		value: 'amountCny',
		width: 120,
		align: 'end',
	},
	{
		title: i18n.baseText('billing.table.balance'),
		key: 'metadata',
		value: 'metadata',
		width: 120,
		align: 'end',
	},
]);

const usageData = computed(() => ({
	items: billingStore.usageRecords,
	count: billingStore.usagePagination.total,
}));

// Recharge records table
const rechargeHeaders = computed<Array<TableHeader<Record<string, any>>>>(() => [
	{
		title: i18n.baseText('billing.table.time'),
		key: 'createdAt',
		value: 'createdAt',
		width: 180,
	},
	{
		title: i18n.baseText('billing.table.rechargeAmount'),
		key: 'amountCny',
		value: 'amountCny',
		width: 150,
		align: 'end',
	},
	{
		title: i18n.baseText('billing.table.paymentMethod'),
		key: 'paymentMethod',
		value: 'paymentMethod',
		width: 150,
	},
	{
		title: i18n.baseText('billing.table.status'),
		key: 'status',
		value: 'status',
		width: 120,
		align: 'center',
	},
]);

const rechargeData = computed(() => ({
	items: billingStore.rechargeRecords,
	count: billingStore.rechargePagination.total,
}));

// Methods
const formatCurrency = (amount: number) => {
	return `${billingStore.currencySymbol}${amount.toFixed(2)}`;
};

const loadUsageRecords = async (options?: Partial<TableOptions>) => {
	if (!currentWorkspaceId.value) return;

	const skip = options?.page ? options.page * (options.itemsPerPage || 20) : 0;
	const limit = options?.itemsPerPage || 20;

	await billingStore.fetchUsageRecords(currentWorkspaceId.value, {
		skip,
		limit,
		startDate: startDate.value ? new Date(startDate.value).toISOString() : undefined,
		endDate: endDate.value ? new Date(endDate.value).toISOString() : undefined,
	});
};

const loadRechargeRecords = async (options?: Partial<TableOptions>) => {
	if (!currentWorkspaceId.value) return;

	const skip = options?.page ? options.page * (options.itemsPerPage || 20) : 0;
	const limit = options?.itemsPerPage || 20;

	await billingStore.fetchRechargeRecords(currentWorkspaceId.value, {
		skip,
		limit,
	});
};

const loadSummary = async () => {
	if (!currentWorkspaceId.value) return;

	const now = new Date();
	await billingStore.fetchUsageSummary(
		currentWorkspaceId.value,
		now.getFullYear(),
		now.getMonth() + 1,
	);
};

const onUsageTableUpdate = (options: TableOptions) => {
	usageTableOptions.value = options;
	void loadUsageRecords(options);
};

const onRechargeTableUpdate = (options: TableOptions) => {
	rechargeTableOptions.value = options;
	void loadRechargeRecords(options);
};

const onDateRangeChange = () => {
	void loadUsageRecords();
};

const onRecharge = () => {
	showRechargeDialog.value = true;
};

const onRefresh = async () => {
	if (!currentWorkspaceId.value) return;

	await billingStore.fetchBalance(currentWorkspaceId.value);

	if (activeTab.value === 'usage') {
		await loadUsageRecords();
	} else if (activeTab.value === 'recharge') {
		await loadRechargeRecords();
	} else {
		await loadSummary();
	}
};

const onTabChange = (tab: string) => {
	activeTab.value = tab as 'usage' | 'recharge' | 'summary';

	if (tab === 'usage') {
		void loadUsageRecords();
	} else if (tab === 'recharge') {
		void loadRechargeRecords();
	} else {
		void loadSummary();
	}
};

// Lifecycle
onMounted(async () => {
	if (currentWorkspaceId.value) {
		await billingStore.fetchBalance(currentWorkspaceId.value);
		await loadUsageRecords();
	}
});

// Watch workspace changes
watch(currentWorkspaceId, async (newId) => {
	if (newId) {
		await billingStore.fetchBalance(newId);
		await loadUsageRecords();
	}
});
</script>

<template>
	<div class="billing-page">
		<!-- Page Header -->
		<div class="header">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('billing.title') }}
			</N8nHeading>
			<N8nButton
				icon="refresh-cw"
				type="secondary"
				:loading="billingStore.loading"
				@click="onRefresh"
			>
				{{ i18n.baseText('generic.refresh') }}
			</N8nButton>
		</div>

		<!-- Balance Card -->
		<N8nCard :class="balanceCardClass">
			<template #header>
				<div class="balance-header">
					<N8nText size="large" bold>
						{{ i18n.baseText('billing.currentBalance') }}
					</N8nText>
					<N8nBadge v-if="billingStore.hasLowBalance" theme="danger" size="medium">
						{{ i18n.baseText('billing.lowBalance') }}
					</N8nBadge>
				</div>
			</template>
			<div class="balance-content">
				<N8nHeading tag="h2" size="xlarge" class="balance-amount">
					{{ billingStore.formattedBalance }}
				</N8nHeading>
				<N8nButton type="primary" size="large" icon="plus" @click="onRecharge">
					{{ i18n.baseText('billing.recharge') }}
				</N8nButton>
			</div>
		</N8nCard>

		<!-- Tabs Section -->
		<N8nCard class="tabs-card">
			<N8nTabs :model-value="activeTab" :options="tabs" @update:model-value="onTabChange" />

			<div class="tab-content">
				<!-- Usage Records Tab -->
				<div v-if="activeTab === 'usage'" class="tab-pane">
					<div class="filters">
						<N8nInput
							v-model="startDate"
							:placeholder="i18n.baseText('billing.selectStartDate')"
							@update:model-value="onDateRangeChange"
						/>
						<N8nInput
							v-model="endDate"
							:placeholder="i18n.baseText('billing.selectEndDate')"
							@update:model-value="onDateRangeChange"
						/>
					</div>

					<N8nDataTableServer
						:headers="usageHeaders"
						:data="usageData"
						:loading="billingStore.loading"
						:table-options="usageTableOptions"
						@update:options="onUsageTableUpdate"
					/>
				</div>

				<!-- Recharge Records Tab -->
				<div v-if="activeTab === 'recharge'" class="tab-pane">
					<N8nDataTableServer
						:headers="rechargeHeaders"
						:data="rechargeData"
						:loading="billingStore.loading"
						:table-options="rechargeTableOptions"
						@update:options="onRechargeTableUpdate"
					>
						<template #item.status="{ item }">
							<N8nBadge
								:theme="
									item.status === 'completed'
										? 'success'
										: item.status === 'pending'
											? 'warning'
											: 'danger'
								"
							>
								{{
									item.status === 'completed'
										? i18n.baseText('billing.status.completed')
										: item.status === 'pending'
											? i18n.baseText('billing.status.pending')
											: i18n.baseText('billing.status.failed')
								}}
							</N8nBadge>
						</template>
					</N8nDataTableServer>
				</div>

				<!-- Monthly Summary Tab -->
				<div v-if="activeTab === 'summary'" class="tab-pane">
					<N8nLoading v-if="billingStore.loading" :loading="true" />
					<div v-else-if="billingStore.usageSummary" class="summary">
						<div class="summary-card">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('billing.summary.totalUsage') }}
							</N8nText>
							<N8nText size="xlarge" bold>
								{{ formatCurrency(billingStore.usageSummary.summary.totalAmount) }}
							</N8nText>
						</div>
						<div class="summary-card">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('billing.summary.totalOperations') }}
							</N8nText>
							<N8nText size="xlarge" bold>
								{{ billingStore.usageSummary.summary.recordCount }}
							</N8nText>
						</div>
						<div class="summary-card">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('billing.summary.period') }}
							</N8nText>
							<N8nText size="medium">
								{{ billingStore.usageSummary.year }}/{{ billingStore.usageSummary.month }}
							</N8nText>
						</div>
					</div>
					<N8nText v-else color="text-light">
						{{ i18n.baseText('billing.summary.noData') }}
					</N8nText>
				</div>
			</div>
		</N8nCard>
	</div>
</template>

<style lang="scss" scoped>
.billing-page {
	padding: var(--spacing--lg);
	max-width: 1400px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--lg);
}

.balance-card {
	margin-bottom: var(--spacing--lg);
	border-left: 4px solid var(--color--primary);

	&.low-balance {
		border-left-color: var(--color--danger);
	}
}

.balance-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.balance-content {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--md) 0;
}

.balance-amount {
	color: var(--color--primary);

	.low-balance & {
		color: var(--color--danger);
	}
}

.tabs-card {
	margin-bottom: var(--spacing--lg);
}

.tab-content {
	margin-top: var(--spacing--md);
}

.tab-pane {
	min-height: 400px;
}

.filters {
	margin-bottom: var(--spacing--md);
	display: flex;
	gap: var(--spacing--sm);
}

.summary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: var(--spacing--lg);
	padding: var(--spacing--lg) 0;
}

.summary-card {
	padding: var(--spacing--lg);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
