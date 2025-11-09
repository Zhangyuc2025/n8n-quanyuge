<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBillingStore } from '@/features/billing/billing.store';
import { N8nButton, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	isOpen: boolean;
}>();

const emit = defineEmits<{
	'update:isOpen': [value: boolean];
}>();

const i18n = useI18n();
const billingStore = useBillingStore();

// Tab management
type TabId = 'balance' | 'recharge' | 'consumption';
const activeTab = ref<TabId>('balance');

const tabs = computed(() => [
	{
		id: 'balance' as TabId,
		label: i18n.baseText('billing.tabs.balance'),
		icon: undefined,
	},
	{
		id: 'recharge' as TabId,
		label: i18n.baseText('billing.tabs.recharge'),
		icon: undefined,
	},
	{
		id: 'consumption' as TabId,
		label: i18n.baseText('billing.tabs.consumption'),
		icon: undefined,
	},
]);

// Balance display
const balanceDisplay = computed(() => {
	if (billingStore.loading) return '...';
	return billingStore.formattedBalance || '¥0.00';
});

const isLowBalance = computed(() => {
	return billingStore.hasLowBalance;
});

// Close modal
const closeModal = () => {
	emit('update:isOpen', false);
};

// Handle backdrop click
const handleBackdropClick = (event: MouseEvent) => {
	if (event.target === event.currentTarget) {
		closeModal();
	}
};

// Tab switching
const switchTab = (tabId: TabId) => {
	activeTab.value = tabId;
};
</script>

<template>
	<Teleport to="body">
		<Transition name="modal">
			<div v-if="isOpen" class="modal-backdrop" @click="handleBackdropClick">
				<div class="modal-container">
					<div class="modal-header">
						<N8nText size="large" bold>
							{{ i18n.baseText('billing.title') }}
						</N8nText>
						<button class="close-btn" @click="closeModal">
							<N8nIcon icon="x" size="medium" />
						</button>
					</div>

					<div class="modal-body">
						<!-- Left sidebar with tabs -->
						<div class="sidebar">
							<div
								v-for="tab in tabs"
								:key="tab.id"
								class="tab-item"
								:class="{ active: activeTab === tab.id }"
								@click="switchTab(tab.id)"
							>
								<N8nIcon :icon="tab.icon" size="medium" class="tab-icon" />
								<N8nText>{{ tab.label }}</N8nText>
							</div>
						</div>

						<!-- Right content area -->
						<div class="content">
							<!-- Balance Tab -->
							<div v-if="activeTab === 'balance'" class="tab-content">
								<div class="balance-section">
									<N8nText size="small" class="label">
										{{ i18n.baseText('billing.currentBalance') }}
									</N8nText>
									<N8nText size="xlarge" bold :class="{ 'low-balance': isLowBalance }">
										{{ balanceDisplay }}
									</N8nText>
									<div class="balance-actions">
										<N8nButton type="primary" size="large" @click="switchTab('recharge')">
											{{ i18n.baseText('workspace.recharge') }}
										</N8nButton>
									</div>
								</div>
							</div>

							<!-- Recharge Tab -->
							<div v-if="activeTab === 'recharge'" class="tab-content">
								<div class="recharge-section">
									<N8nText size="medium" bold class="section-title">
										{{ i18n.baseText('billing.recharge.title') }}
									</N8nText>
									<N8nText size="small" class="section-description">
										{{ i18n.baseText('billing.recharge.description') }}
									</N8nText>

									<!-- Recharge amount options would go here -->
									<div class="recharge-options">
										<div class="recharge-option">
											<N8nText>¥100</N8nText>
										</div>
										<div class="recharge-option">
											<N8nText>¥500</N8nText>
										</div>
										<div class="recharge-option">
											<N8nText>¥1000</N8nText>
										</div>
										<div class="recharge-option">
											<N8nText>¥5000</N8nText>
										</div>
									</div>

									<div class="recharge-actions">
										<N8nButton type="primary" size="large">
											{{ i18n.baseText('billing.recharge.confirm') }}
										</N8nButton>
									</div>
								</div>
							</div>

							<!-- Consumption Tab -->
							<div v-if="activeTab === 'consumption'" class="tab-content">
								<div class="consumption-section">
									<N8nText size="medium" bold class="section-title">
										{{ i18n.baseText('billing.consumption.title') }}
									</N8nText>
									<N8nText size="small" class="section-description">
										{{ i18n.baseText('billing.consumption.description') }}
									</N8nText>

									<!-- Consumption records would go here -->
									<div class="consumption-list">
										<N8nText size="small" class="empty-state">
											{{ i18n.baseText('billing.consumption.empty') }}
										</N8nText>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style lang="scss" scoped>
.modal-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}

.modal-container {
	background-color: var(--color--background);
	border-radius: var(--radius--xl);
	width: 90%;
	max-width: 900px;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--lg);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.close-btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--2xs);
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius);
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.modal-body {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.sidebar {
	width: 200px;
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.tab-item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}

	&.active {
		background-color: var(--color--primary--tint-3);
		color: var(--color--primary);

		.tab-icon {
			color: var(--color--primary);
		}
	}
}

.tab-icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.content {
	flex: 1;
	padding: var(--spacing--lg);
	overflow-y: auto;
}

.tab-content {
	height: 100%;
}

.balance-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	gap: var(--spacing--md);

	.label {
		color: var(--color--text--tint-1);
	}

	.low-balance {
		color: var(--color--danger);
	}
}

.balance-actions {
	margin-top: var(--spacing--lg);
}

.recharge-section,
.consumption-section {
	.section-title {
		margin-bottom: var(--spacing--xs);
	}

	.section-description {
		color: var(--color--text--tint-1);
		margin-bottom: var(--spacing--lg);
	}
}

.recharge-options {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--lg);
}

.recharge-option {
	padding: var(--spacing--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	text-align: center;
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
		background-color: var(--color--primary--tint-3);
	}
}

.consumption-list {
	.empty-state {
		color: var(--color--text--tint-1);
		text-align: center;
		padding: var(--spacing--2xl);
	}
}

// Modal transition
.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}
</style>
