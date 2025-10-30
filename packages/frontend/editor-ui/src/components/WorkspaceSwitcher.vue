<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { N8nPopoverReka, N8nInput, N8nText, N8nIcon, N8nButton } from '@n8n/design-system';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useUIStore } from '@/stores/ui.store';
import { VIEWS, CREATE_TEAM_MODAL_KEY } from '@/constants';

type Props = {
	collapsed?: boolean;
};

const props = defineProps<Props>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

// 控制popover开关
const isOpen = ref(false);
// 搜索关键词
const searchQuery = ref('');
// localStorage键名
const RECENT_WORKSPACES_KEY = 'n8n-recent-workspaces';

// 获取个人空间列表
const personalWorkspaces = computed(() => {
	const personal = projectsStore.personalProject;
	if (!personal) return [];
	return [
		{
			id: personal.id,
			name: i18n.baseText('workspace.myWorkspace'),
			type: ProjectTypes.Personal,
			icon: 'user',
			role: 'owner', // 个人空间永远是所有者
		},
	];
});

// 获取团队空间列表
const teamWorkspaces = computed(() => {
	return projectsStore.teamProjects.map((project) => {
		// 使用后端返回的真实角色，移除 'team:' 前缀以匹配前端显示
		const role = project.teamRole ? project.teamRole.replace('team:', '') : 'member';

		return {
			id: project.id,
			name: project.name ?? i18n.baseText('projects.settings.newProjectName'),
			type: ProjectTypes.Team,
			icon: (project.icon as any) || 'users',
			role, // 真实角色：'owner' | 'admin' | 'member' | 'viewer'
		};
	});
});

// 所有工作区列表
const allWorkspaces = computed(() => [...personalWorkspaces.value, ...teamWorkspaces.value]);

// 搜索过滤后的工作区
const filteredWorkspaces = computed(() => {
	if (!searchQuery.value.trim()) return allWorkspaces.value;
	const query = searchQuery.value.toLowerCase();
	return allWorkspaces.value.filter((ws) => ws.name.toLowerCase().includes(query));
});

// 最近使用的工作区（基于localStorage记录的访问时间）
const recentWorkspaces = computed(() => {
	try {
		const recentData = localStorage.getItem(RECENT_WORKSPACES_KEY);
		if (!recentData) return filteredWorkspaces.value.slice(0, 4);

		const recentMap = JSON.parse(recentData) as Record<string, number>;
		// 按访问时间倒序排序，只显示最近4个
		return filteredWorkspaces.value
			.filter((ws) => recentMap[ws.id])
			.sort((a, b) => (recentMap[b.id] || 0) - (recentMap[a.id] || 0))
			.slice(0, 4);
	} catch (error) {
		console.error('Failed to load recent workspaces:', error);
		return filteredWorkspaces.value.slice(0, 4);
	}
});

// 个人空间分组
const personalSpaceGroup = computed(() => {
	return filteredWorkspaces.value.filter((ws) => ws.type === ProjectTypes.Personal);
});

// 团队空间分组
const teamSpaceGroup = computed(() => {
	return filteredWorkspaces.value.filter((ws) => ws.type === ProjectTypes.Team);
});

// 当前选中的工作区ID
const currentWorkspaceId = computed(() => {
	return projectsStore.currentProjectId || projectsStore.personalProject?.id || null;
});

// 当前选中的工作区
const currentWorkspace = computed(() => {
	if (!currentWorkspaceId.value) return null;
	return allWorkspaces.value.find((ws) => ws.id === currentWorkspaceId.value);
});

// 获取角色文本
const getRoleText = (role: string) => {
	const roleMap: Record<string, string> = {
		owner: i18n.baseText('workspace.role.owner'),
		admin: i18n.baseText('workspace.role.admin'),
		member: i18n.baseText('workspace.role.member'),
	};
	return roleMap[role] || role;
};

// 切换工作区
const handleWorkspaceChange = async (workspaceId: string) => {
	if (!workspaceId) return;

	try {
		// 记录访问时间到localStorage
		try {
			const recentData = localStorage.getItem(RECENT_WORKSPACES_KEY);
			const recentMap = recentData ? JSON.parse(recentData) : {};
			recentMap[workspaceId] = Date.now();
			localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(recentMap));
		} catch (storageError) {
			console.warn('Failed to save recent workspace:', storageError);
		}

		// [多租户改造] 仅切换工作区上下文，不进行页面跳转（Coze风格）
		// 调用 setActiveProject 持久化工作区选择，刷新页面后仍能保持工作区状态
		// 后续用户点击 Workflows、Credentials 等导航时，会自动使用新工作区的数据
		await projectsStore.setActiveProject(workspaceId);

		// 关闭popover
		isOpen.value = false;
	} catch (error) {
		console.error('Failed to switch workspace:', error);
		toast.showError(error, i18n.baseText('workspace.switchError.title'));
	}
};

// 创建新团队
const handleCreateTeam = () => {
	isOpen.value = false;
	// [多租户改造] Phase 4 - 打开创建团队弹窗
	uiStore.openModal(CREATE_TEAM_MODAL_KEY);
};

// [多租户改造] 组件加载时确保项目数据已加载
onMounted(async () => {
	try {
		// 如果还没有加载个人项目，则加载
		if (!projectsStore.personalProject) {
			await projectsStore.getPersonalProject();
		}
		// 如果还没有加载所有项目（包括团队项目），则加载
		if (projectsStore.teamProjects.length === 0) {
			await projectsStore.getAllProjects();
		}
	} catch (error) {
		console.error('Failed to load workspaces:', error);
		toast.showError(error, i18n.baseText('workspace.loadError.title'));
	}
});
</script>

<template>
	<div :class="[$style.workspaceSwitcher, { [$style.collapsed]: props.collapsed }]">
		<!-- 收起状态：只显示图标 -->
		<div v-if="props.collapsed" :class="$style.collapsedTrigger" @click="isOpen = !isOpen">
			<N8nIcon
				:icon="(currentWorkspace?.icon as any) || 'user'"
				:class="$style.workspaceIcon"
				size="large"
			/>
		</div>

		<!-- 展开状态：显示下拉触发器 -->
		<N8nPopoverReka v-else v-model:open="isOpen" side="bottom" align="start" :side-offset="8">
			<!-- 触发器：当前工作区显示 -->
			<template #trigger>
				<div :class="$style.trigger">
					<N8nIcon
						:icon="(currentWorkspace?.icon as any) || 'user'"
						:class="$style.triggerIcon"
						size="medium"
					/>
					<N8nText :class="$style.triggerText" bold>
						{{ currentWorkspace?.name || i18n.baseText('workspace.noWorkspaces') }}
					</N8nText>
					<N8nIcon
						icon="chevron-down"
						:class="[$style.triggerArrow, { [$style.open]: isOpen }]"
						size="small"
					/>
				</div>
			</template>

			<!-- Popover内容 -->
			<template #content>
				<div :class="$style.popoverContent">
					<!-- 搜索框 -->
					<div :class="$style.searchBox">
						<N8nInput
							v-model="searchQuery"
							:placeholder="i18n.baseText('workspace.search.placeholder')"
							size="small"
						>
							<template #prefix>
								<N8nIcon icon="search" size="small" />
							</template>
						</N8nInput>
					</div>

					<!-- 最近使用 -->
					<div v-if="recentWorkspaces.length && !searchQuery" :class="$style.section">
						<N8nText :class="$style.sectionTitle" size="small" color="text-light" bold>
							{{ i18n.baseText('workspace.recent') }}
						</N8nText>
						<div :class="$style.workspaceList">
							<div
								v-for="workspace in recentWorkspaces"
								:key="'recent-' + workspace.id"
								:class="[
									$style.workspaceItem,
									{ [$style.active]: workspace.id === currentWorkspaceId },
								]"
								@click="handleWorkspaceChange(workspace.id)"
							>
								<N8nIcon
									:icon="workspace.icon as any"
									:class="$style.workspaceItemIcon"
									size="medium"
								/>
								<N8nText :class="$style.workspaceItemName">
									{{ workspace.name }}
								</N8nText>
								<N8nText :class="$style.workspaceItemRole" size="small" color="text-light">
									{{ getRoleText(workspace.role) }}
								</N8nText>
							</div>
						</div>
					</div>

					<!-- 个人空间 -->
					<div v-if="personalSpaceGroup.length" :class="$style.section">
						<N8nText :class="$style.sectionTitle" size="small" color="text-light" bold>
							{{ i18n.baseText('workspace.personal') }}
						</N8nText>
						<div :class="$style.workspaceList">
							<div
								v-for="workspace in personalSpaceGroup"
								:key="'personal-' + workspace.id"
								:class="[
									$style.workspaceItem,
									{ [$style.active]: workspace.id === currentWorkspaceId },
								]"
								@click="handleWorkspaceChange(workspace.id)"
							>
								<N8nIcon
									:icon="workspace.icon as any"
									:class="$style.workspaceItemIcon"
									size="medium"
								/>
								<N8nText :class="$style.workspaceItemName">
									{{ workspace.name }}
								</N8nText>
								<N8nText :class="$style.workspaceItemRole" size="small" color="text-light">
									{{ getRoleText(workspace.role) }}
								</N8nText>
							</div>
						</div>
					</div>

					<!-- 团队空间 -->
					<div v-if="teamSpaceGroup.length" :class="$style.section">
						<N8nText :class="$style.sectionTitle" size="small" color="text-light" bold>
							{{ i18n.baseText('workspace.teams') }}
						</N8nText>
						<div :class="$style.workspaceList">
							<div
								v-for="workspace in teamSpaceGroup"
								:key="'team-' + workspace.id"
								:class="[
									$style.workspaceItem,
									{ [$style.active]: workspace.id === currentWorkspaceId },
								]"
								@click="handleWorkspaceChange(workspace.id)"
							>
								<N8nIcon
									:icon="workspace.icon as any"
									:class="$style.workspaceItemIcon"
									size="medium"
								/>
								<N8nText :class="$style.workspaceItemName">
									{{ workspace.name }}
								</N8nText>
								<N8nText :class="$style.workspaceItemRole" size="small" color="text-light">
									{{ getRoleText(workspace.role) }}
								</N8nText>
							</div>
						</div>
					</div>

					<!-- 创建新工作空间 -->
					<div :class="$style.createSection">
						<N8nButton
							:class="$style.createButton"
							type="tertiary"
							size="small"
							icon="plus"
							@click="handleCreateTeam"
						>
							{{ i18n.baseText('workspace.createTeam') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" module>
.workspaceSwitcher {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);

	&.collapsed {
		padding: var(--spacing--xs);
		display: flex;
		justify-content: center;
	}
}

/* 收起状态的触发器 */
.collapsedTrigger {
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

/* 展开状态的触发器 */
.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.2s;
	min-height: 40px;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}

.triggerIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.triggerText {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.triggerArrow {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform 0.2s;

	&.open {
		transform: rotate(180deg);
	}
}

/* Popover内容 */
.popoverContent {
	width: 320px;
	max-height: 500px;
	overflow-y: auto;
	padding: var(--spacing--xs);
}

/* 搜索框 */
.searchBox {
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
}

/* 分组区域 */
.section {
	margin-bottom: var(--spacing--sm);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionTitle {
	padding: var(--spacing--xs) var(--spacing--sm);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

/* 工作区列表 */
.workspaceList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.workspaceItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--background--shade-1);
	}

	&.active {
		background-color: var(--color--primary--tint-3);

		.workspaceItemIcon {
			color: var(--color--primary);
		}

		.workspaceItemName {
			font-weight: var(--font-weight--bold);
			color: var(--color--primary);
		}
	}
}

.workspaceItemIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.workspaceItemName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.workspaceItemRole {
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--xs);
	background-color: var(--color--background--shade-1);
	border-radius: var(--radius--sm);
}

/* 创建按钮区域 */
.createSection {
	padding-top: var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.createButton {
	width: 100%;
	justify-content: flex-start;
}
</style>
