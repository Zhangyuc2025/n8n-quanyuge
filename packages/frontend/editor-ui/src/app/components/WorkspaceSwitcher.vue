<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { VIEWS } from '@/app/constants';
import { N8nPopoverReka, N8nMenuItem, N8nIcon, N8nText, type IMenuItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const router = useRouter();
const projectsStore = useProjectsStore();
const i18n = useI18n();

// Initialize workspace on mount
onMounted(async () => {
	console.log('[WorkspaceSwitcher] Mounted!');
	console.log('[WorkspaceSwitcher] personalProject:', projectsStore.personalProject);
	console.log('[WorkspaceSwitcher] currentProject:', projectsStore.currentProject);
	console.log('[WorkspaceSwitcher] currentWorkspaceId:', projectsStore.currentWorkspaceId);

	// If no current workspace is set, default to personal workspace
	if (!projectsStore.currentProject && projectsStore.personalProject) {
		projectsStore.setCurrentProject(projectsStore.personalProject);
	}
});

// Current workspace display
const currentWorkspace = computed(() => {
	return projectsStore.currentProject || projectsStore.personalProject;
});

const currentWorkspaceName = computed(() => {
	// If it's personal project, always show "Personal Space" translation
	if (currentWorkspace.value?.id === projectsStore.personalProject?.id) {
		return i18n.baseText('workspace.personal');
	}
	// For team workspaces, show the actual workspace name
	return currentWorkspace.value?.name || i18n.baseText('workspace.personal');
});

const currentWorkspaceIcon = computed(() => {
	// Personal workspace always uses home icon
	if (currentWorkspace.value?.id === projectsStore.personalProject?.id) {
		return { type: 'emoji', value: '🏠' };
	}
	// Team workspaces can have custom icons
	const icon = currentWorkspace.value?.icon;
	if (icon) {
		return icon;
	}
	return { type: 'emoji', value: '👥' };
});

// Menu items for workspace switching
const workspaceMenuItems = computed<IMenuItem[]>(() => {
	const items: IMenuItem[] = [];
	// Use currentWorkspace.value?.id for consistency with display logic
	const currentId = currentWorkspace.value?.id;

	// Personal workspace - only show if not current
	if (projectsStore.personalProject && projectsStore.personalProject.id !== currentId) {
		items.push({
			id: projectsStore.personalProject.id,
			label: i18n.baseText('workspace.personal'),
		});
	}

	// Team workspaces - only show workspaces that are not current
	projectsStore.teamProjects.forEach((project) => {
		if (project.id !== currentId) {
			items.push({
				id: project.id,
				label: project.name || 'Team Workspace',
			});
		}
	});

	// Create/Join team workspace
	items.push({
		id: 'create-join-team',
		label: i18n.baseText('workspace.createOrJoinTeam'),
		icon: 'users',
	});

	return items;
});

// Handle workspace selection
const onWorkspaceSelect = async (workspaceId: string) => {
	if (workspaceId === 'create-join-team') {
		// Navigate to team management page (create/join)
		await router.push({ name: VIEWS.PROJECT_SETTINGS });
		return;
	}

	// Check if it's personal workspace or team workspace
	const isPersonalWorkspace = workspaceId === projectsStore.personalProject?.id;

	// Switch workspace context without navigation
	if (isPersonalWorkspace) {
		// Switch to personal workspace
		projectsStore.setCurrentProject(projectsStore.personalProject);
	} else {
		// Switch to team workspace - fetch and set the project
		const project = await projectsStore.fetchProject(workspaceId);
		projectsStore.setCurrentProject(project);
	}

	// Emit event to notify other components about workspace change
	// This allows components to refresh their data for the new workspace (including BalanceCard)
	window.dispatchEvent(
		new CustomEvent('workspace-changed', {
			detail: { workspaceId },
		}),
	);
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
					<span v-if="currentWorkspaceIcon.type === 'emoji'" class="icon">
						{{ currentWorkspaceIcon.value }}
					</span>
					<N8nIcon
						v-else
						:icon="currentWorkspaceIcon.value as any"
						size="medium"
						class="icon-component"
					/>
					<N8nText size="medium" bold class="name">
						{{ currentWorkspaceName }}
					</N8nText>
					<N8nIcon icon="chevron-down" size="small" class="chevron" />
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" scoped>
.workspace-switcher {
	display: flex;
	align-items: center;
	width: 100%;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	height: 32px;
	cursor: pointer;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	transition: all 0.15s ease-in-out;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.icon,
.icon-component {
	flex-shrink: 0;
	font-size: 16px;
	line-height: 1;
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

.popover {
	padding: var(--spacing--xs);
	min-width: 240px;
	max-height: 400px;
	overflow-y: auto;
}
</style>
