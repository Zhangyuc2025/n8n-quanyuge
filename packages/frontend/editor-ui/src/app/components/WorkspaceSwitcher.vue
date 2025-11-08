<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useBillingStore } from '@/features/billing/billing.store';
import {
	N8nPopoverReka,
	N8nMenuItem,
	N8nIcon,
	N8nText,
	N8nBadge,
	type IMenuItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const router = useRouter();
const projectsStore = useProjectsStore();
const billingStore = useBillingStore();
const i18n = useI18n();

// Load balance on mount
onMounted(async () => {
	if (projectsStore.currentWorkspaceId) {
		await billingStore.fetchBalance(projectsStore.currentWorkspaceId);
	}
});

// Current workspace display
const currentWorkspace = computed(() => {
	return projectsStore.currentProject || projectsStore.personalProject;
});

const currentWorkspaceName = computed(() => {
	return currentWorkspace.value?.name || i18n.baseText('workspace.personal');
});

const currentWorkspaceIcon = computed(() => {
	return currentWorkspace.value?.icon || '🏠';
});

// Balance display
const balanceDisplay = computed(() => {
	if (billingStore.loading) return '...';
	return billingStore.formattedBalance;
});

const balanceClass = computed(() => {
	const classes = ['balance'];
	if (billingStore.hasLowBalance) {
		classes.push('balance-low');
	}
	return classes.join(' ');
});

// Menu items for workspace switching
const workspaceMenuItems = computed<IMenuItem[]>(() => {
	const items: IMenuItem[] = [];

	// Personal workspace
	if (projectsStore.personalProject) {
		items.push({
			id: projectsStore.personalProject.id,
			label: `🏠 ${projectsStore.personalProject.name}`,
			disabled: projectsStore.currentProject?.id === projectsStore.personalProject.id,
		});
	}

	// Team workspaces
	projectsStore.teamProjects.forEach((project) => {
		items.push({
			id: project.id,
			label: `👥 ${project.name}`,
			disabled: projectsStore.currentProject?.id === project.id,
		});
	});

	// Create new workspace
	if (projectsStore.canCreateProjects && projectsStore.hasPermissionToCreateProjects) {
		items.push({
			id: 'create-workspace',
			label: i18n.baseText('workspace.createNew'),
			icon: 'plus',
		});
	}

	// Manage workspaces
	items.push({
		id: 'manage-workspaces',
		label: i18n.baseText('workspace.manage'),
		icon: 'cog',
	});

	return items;
});

// Handle workspace selection
const onWorkspaceSelect = async (workspaceId: string) => {
	if (workspaceId === 'create-workspace') {
		// Navigate to create workspace page
		await router.push({ name: 'ProjectsSettings', params: { tab: 'create' } });
		return;
	}

	if (workspaceId === 'manage-workspaces') {
		// Navigate to manage workspaces page
		await router.push({ name: 'ProjectsSettings' });
		return;
	}

	// Switch workspace by navigating with projectId
	await router.push({
		name: 'WorkflowsHome',
		params: { projectId: workspaceId },
	});

	// Fetch balance for new workspace
	await billingStore.fetchBalance(workspaceId);
};

// Handle recharge click
const onRechargeClick = () => {
	void router.push({ name: 'BillingPage' });
};
</script>

<template>
	<div class="workspace-switcher">
		<N8nPopoverReka side="bottom" align="start" :side-offset="8">
			<template #content>
				<div class="popover">
					<N8nMenuItem
						v-for="item in workspaceMenuItems"
						:key="item.id"
						:item="item"
						:data-test-id="`workspace-menu-item-${item.id}`"
						@click="() => onWorkspaceSelect(item.id)"
					/>
				</div>
			</template>
			<template #trigger>
				<div class="trigger">
					<div class="workspace-info">
						<span class="icon">{{ currentWorkspaceIcon }}</span>
						<N8nText size="medium" class="name">
							{{ currentWorkspaceName }}
						</N8nText>
						<N8nIcon icon="chevron-down" size="small" class="chevron" />
					</div>
					<div :class="balanceClass" @click.stop="onRechargeClick">
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('billing.balance') }}:
						</N8nText>
						<N8nText size="small" bold class="balance-amount">
							{{ balanceDisplay }}
						</N8nText>
						<N8nBadge
							v-if="billingStore.hasLowBalance"
							theme="danger"
							size="small"
							class="low-balance-badge"
						>
							{{ i18n.baseText('billing.lowBalance') }}
						</N8nBadge>
					</div>
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" scoped>
.workspace-switcher {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	cursor: pointer;
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.workspace-info {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
}

.icon {
	font-size: var(--font-size--lg);
	flex-shrink: 0;
}

.name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.balance {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}

	&.balance-low {
		background-color: var(--color--danger--tint-4);

		&:hover {
			background-color: var(--color--danger--tint-3);
		}
	}
}

.balance-amount {
	color: var(--color--primary);
}

.balance-low .balance-amount {
	color: var(--color--danger);
}

.low-balance-badge {
	margin-left: var(--spacing--3xs);
}

.popover {
	padding: var(--spacing--xs);
	min-width: 240px;
	max-height: 400px;
	overflow-y: auto;
}
</style>
