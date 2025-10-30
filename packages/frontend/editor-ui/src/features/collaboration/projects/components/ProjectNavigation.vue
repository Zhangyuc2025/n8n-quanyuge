<script lang="ts" setup>
import { VIEWS } from '@/constants';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount, onBeforeUnmount } from 'vue';
import { useProjectsStore } from '../projects.store';

import { N8nMenuItem } from '@n8n/design-system';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();

const projectsStore = useProjectsStore();
const usersStore = useUsersStore();

// [多租户改造] 方案A：简化导航菜单
const workflows = computed<IMenuItem>(() => ({
	id: 'workflows',
	label: locale.baseText('workspace.menu.workflows'),
	icon: 'network',
	route: {
		to: { name: VIEWS.WORKFLOWS_HOME },
	},
}));

const credentials = computed<IMenuItem>(() => {
	const projectId = projectsStore.currentProjectId;

	return {
		id: 'credentials',
		label: locale.baseText('workspace.menu.credentials'),
		icon: 'key-round',
		route: {
			to: projectId
				? {
						name: VIEWS.PROJECTS_CREDENTIALS,
						params: { projectId },
					}
				: {
						name: VIEWS.CREDENTIALS,
					},
		},
	};
});

const activeTabId = computed(() => {
	return (
		(Array.isArray(projectsStore.projectNavActiveId)
			? projectsStore.projectNavActiveId[0]
			: projectsStore.projectNavActiveId) ?? undefined
	);
});

async function onSourceControlPull() {
	// Update myProjects for the sidebar display
	await projectsStore.getMyProjects();
}

onBeforeMount(async () => {
	await usersStore.fetchUsers();
	sourceControlEventBus.on('pull', onSourceControlPull);
});

onBeforeUnmount(() => {
	sourceControlEventBus.off('pull', onSourceControlPull);
});
</script>

<template>
	<!-- [多租户改造] 方案A：精简导航 - 工作流 + 凭证 -->
	<div :class="$style.navigation">
		<div class="menu-items">
			<!-- 工作流 -->
			<N8nMenuItem
				:item="workflows"
				:compact="props.collapsed"
				:active="activeTabId === 'workflows'"
				data-test-id="workspace-workflows-menu-item"
			/>
			<!-- 凭证 -->
			<N8nMenuItem
				:item="credentials"
				:compact="props.collapsed"
				:active="activeTabId === 'credentials'"
				data-test-id="workspace-credentials-menu-item"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
/* [多租户改造] 简化样式：只保留基本导航布局 */
.navigation {
	width: 100%;
	align-items: start;
	gap: var(--spacing--3xs);
}
</style>

<style lang="scss" scoped>
.menu-items {
	padding: 0 var(--spacing--xs);
}
</style>
