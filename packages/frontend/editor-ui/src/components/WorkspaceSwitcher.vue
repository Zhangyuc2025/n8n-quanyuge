<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nSelect, N8nOption, N8nIcon } from '@n8n/design-system';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { VIEWS } from '@/constants';

type Props = {
	collapsed?: boolean;
};

const props = defineProps<Props>();

const i18n = useI18n();
const router = useRouter();
const projectsStore = useProjectsStore();

// 获取个人空间列表（个人项目）
const personalWorkspaces = computed(() => {
	const personal = projectsStore.personalProject;
	if (!personal) return [];
	return [
		{
			id: personal.id,
			name: i18n.baseText('workspace.myWorkspace'),
			type: ProjectTypes.Personal,
			icon: 'user' as const,
		},
	];
});

// 获取团队空间列表（团队项目）
const teamWorkspaces = computed(() => {
	return projectsStore.teamProjects.map((project) => ({
		id: project.id,
		name: project.name ?? i18n.baseText('projects.settings.newProjectName'),
		type: ProjectTypes.Team,
		icon: (project.icon as any) || ('users' as const),
	}));
});

// 所有工作区列表
const allWorkspaces = computed(() => [...personalWorkspaces.value, ...teamWorkspaces.value]);

// 当前选中的工作区ID
const currentWorkspaceId = computed(() => {
	return projectsStore.currentProjectId || projectsStore.personalProject?.id || null;
});

// 当前选中的工作区
const currentWorkspace = computed(() => {
	if (!currentWorkspaceId.value) return null;
	return allWorkspaces.value.find((ws) => ws.id === currentWorkspaceId.value);
});

// 切换工作区
const handleWorkspaceChange = async (workspaceId: string) => {
	if (!workspaceId) return;

	// 特殊处理：创建新团队
	if (workspaceId === '__create_team__') {
		// TODO: Phase 4 - 打开创建团队对话框
		console.log('[WorkspaceSwitcher] 创建新团队功能待实现');
		return;
	}

	// 导航到工作区首页
	await router.push({
		name: VIEWS.PROJECTS_WORKFLOWS,
		params: { projectId: workspaceId },
	});
};
</script>

<template>
	<div :class="[$style.workspaceSwitcher, { [$style.collapsed]: props.collapsed }]">
		<!-- 收起状态：只显示图标 -->
		<div v-if="props.collapsed" :class="$style.collapsedView">
			<N8nIcon
				:icon="currentWorkspace?.icon || 'user'"
				:class="$style.workspaceIcon"
				size="large"
			/>
		</div>

		<!-- 展开状态：显示选择器 -->
		<N8nSelect
			v-else
			:modelValue="currentWorkspaceId"
			:placeholder="i18n.baseText('workspace.switcher.placeholder')"
			:class="$style.select"
			size="large"
			@update:modelValue="handleWorkspaceChange"
		>
			<!-- 个人空间 -->
			<template v-if="personalWorkspaces.length">
				<div :class="$style.optionGroupLabel">
					{{ i18n.baseText('workspace.personal') }}
				</div>
				<N8nOption
					v-for="workspace in personalWorkspaces"
					:key="workspace.id"
					:value="workspace.id"
					:label="workspace.name"
				>
					<div :class="$style.optionContent">
						<N8nIcon :icon="workspace.icon" size="small" />
						<span>{{ workspace.name }}</span>
					</div>
				</N8nOption>
			</template>

			<!-- 团队空间 -->
			<template v-if="teamWorkspaces.length">
				<div :class="$style.optionGroupLabel">
					{{ i18n.baseText('workspace.teams') }}
				</div>
				<N8nOption
					v-for="workspace in teamWorkspaces"
					:key="workspace.id"
					:value="workspace.id"
					:label="workspace.name"
				>
					<div :class="$style.optionContent">
						<N8nIcon :icon="workspace.icon" size="small" />
						<span>{{ workspace.name }}</span>
					</div>
				</N8nOption>
			</template>

			<!-- 创建新团队 -->
			<N8nOption value="__create_team__" :class="$style.createOption">
				<div :class="$style.optionContent">
					<N8nIcon icon="plus" size="small" />
					<span>{{ i18n.baseText('workspace.createTeam') }}</span>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style lang="scss" module>
.workspaceSwitcher {
	padding: var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);

	&.collapsed {
		padding: var(--spacing--xs);
		display: flex;
		justify-content: center;
	}
}

.collapsedView {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xs);
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}

.workspaceIcon {
	color: var(--color--text--tint-1);
}

.select {
	width: 100%;
}

.optionGroupLabel {
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
}

.optionContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.createOption {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	margin-top: var(--spacing--xs);
	color: var(--color--primary);
}
</style>
