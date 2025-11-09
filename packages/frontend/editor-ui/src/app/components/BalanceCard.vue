<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useBillingStore } from '@/features/billing/billing.store';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import BillingModal from '@/app/components/BillingModal.vue';

const projectsStore = useProjectsStore();
const billingStore = useBillingStore();
const i18n = useI18n();

// Modal state
const isBillingModalOpen = ref(false);

// Fetch balance for current workspace
const fetchBalance = async () => {
	const workspaceId = projectsStore.currentWorkspaceId || projectsStore.personalProject?.id;
	if (workspaceId) {
		try {
			await billingStore.fetchBalance(workspaceId);
		} catch (error) {
			// Silently handle billing API errors
			console.log('[BalanceCard] Balance fetch skipped (billing not available)');
		}
	}
};

// Listen to workspace change events
const handleWorkspaceChange = () => {
	void fetchBalance();
};

// Load balance on mount
onMounted(async () => {
	await fetchBalance();
	window.addEventListener('workspace-changed', handleWorkspaceChange);
});

onBeforeUnmount(() => {
	window.removeEventListener('workspace-changed', handleWorkspaceChange);
});

// Balance display
const balanceDisplay = computed(() => {
	if (billingStore.loading) return '...';
	return billingStore.formattedBalance || '¥0.00';
});

const balancePercentage = computed(() => {
	// If there's a quota limit, calculate percentage
	// For now, we'll just return 100% if there's a balance
	if (billingStore.balance && billingStore.balance.balance > 0) {
		return 100;
	}
	return 0;
});

const isLowBalance = computed(() => {
	return billingStore.hasLowBalance;
});

// Handle card click to open billing modal
const onCardClick = () => {
	isBillingModalOpen.value = true;
};
</script>

<template>
	<div>
		<div class="balance-card" @click="onCardClick">
			<div class="header">
				<N8nText size="small" bold class="title">
					{{ i18n.baseText('workspace.balance') }}
				</N8nText>
			</div>
			<div class="content">
				<div class="amount-row">
					<N8nText size="large" bold :class="{ 'low-balance': isLowBalance }">
						{{ balanceDisplay }}
					</N8nText>
				</div>
				<div class="progress-bar">
					<div class="progress-track">
						<div class="progress-fill" :style="{ width: balancePercentage + '%' }"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Billing Modal -->
		<BillingModal v-model:isOpen="isBillingModalOpen" />
	</div>
</template>

<style lang="scss" scoped>
.balance-card {
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: all 0.15s ease-in-out;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 16px;
	width: 100%;
}

.title {
	flex-shrink: 0;
	white-space: nowrap;
}

.content {
	margin-top: var(--spacing--2xs);
}

.amount-row {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);

	.low-balance {
		color: var(--color--danger);
	}
}

.progress-bar {
	margin-top: var(--spacing--3xs);
	width: 100%;
}

.progress-track {
	height: 4px;
	background-color: var(--color--foreground--tint-2);
	border-radius: 2px;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background-color: var(--color--primary);
	transition: width 0.3s ease;
}
</style>
