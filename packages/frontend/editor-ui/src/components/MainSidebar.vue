<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick, type Ref, useTemplateRef } from 'vue';
import { onClickOutside, type VueInstance } from '@vueuse/core';
import { useRouter } from 'vue-router';

import { useI18n } from '@n8n/i18n';
import {
	N8nNavigationDropdown,
	N8nTooltip,
	N8nLink,
	N8nIconButton,
	N8nMenuItem,
	isCustomMenuItem,
	N8nLogo,
	N8nPopoverReka,
	N8nScrollArea,
	N8nText,
	N8nIcon,
	N8nButton,
} from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import {
	ABOUT_MODAL_KEY,
	AUTH_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	RELEASE_NOTES_URL,
	VIEWS,
	WHATS_NEW_MODAL_KEY,
} from '@/constants';
import { EXTERNAL_LINKS } from '@/constants/externalLinks';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { hasPermission } from '@/utils/rbac/permissions';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useVersionsStore } from '@/stores/versions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useDebounce } from '@/composables/useDebounce';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useBugReporting } from '@/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import { useBecomeTemplateCreatorStore } from '@/components/BecomeTemplateCreatorCta/becomeTemplateCreatorStore';
import BecomeTemplateCreatorCta from '@/components/BecomeTemplateCreatorCta/BecomeTemplateCreatorCta.vue';
import VersionUpdateCTA from '@/components/VersionUpdateCTA.vue';
import { TemplateClickSource, trackTemplatesClick } from '@/utils/experiments';
import { I18nT } from 'vue-i18n';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';
import TemplateTooltip from '@/experiments/personalizedTemplatesV3/components/TemplateTooltip.vue';
import { useKeybindings } from '@/composables/useKeybindings';
import { useCalloutHelpers } from '@/composables/useCalloutHelpers';
import ProjectNavigation from '@/features/collaboration/projects/components/ProjectNavigation.vue';
import MainSidebarSourceControl from './MainSidebarSourceControl.vue';
import MainSidebarUserArea from '@/components/MainSidebarUserArea.vue';

const router = useRouter();
const becomeTemplateCreatorStore = useBecomeTemplateCreatorStore();
const cloudPlanStore = useCloudPlanStore();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const versionsStore = useVersionsStore();
const workflowsStore = useWorkflowsStore();
const sourceControlStore = useSourceControlStore();
const personalizedTemplatesV2Store = usePersonalizedTemplatesV2Store();
const personalizedTemplatesV3Store = usePersonalizedTemplatesV3Store();

// [多租户改造] 检查是否已登录
const isAuthenticated = computed(() => usersStore.currentUserId !== null);

// [多租户改造] 未登录状态下不访问settings，避免报错
const releaseChannel = computed(() =>
	isAuthenticated.value ? settingsStore.settings.releaseChannel : undefined,
);

const { callDebounced } = useDebounce();
const externalHooks = useExternalHooks();
const i18n = useI18n();
const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();
const { getReportingURL } = useBugReporting();
const calloutHelpers = useCalloutHelpers();

useKeybindings({
	ctrl_alt_o: () => handleSelect('about'),
});

// Template refs
const user = useTemplateRef('user');

// Component data
const basePath = ref('');
const fullyExpanded = ref(false);

// [多租户改造] 延迟检查 What's New 通知，避免未登录时访问数据
const showWhatsNewNotification = computed(() => {
	if (!isAuthenticated.value) return false;
	return (
		versionsStore.hasVersionUpdates ||
		versionsStore.whatsNewArticles.some(
			(article) => !versionsStore.isWhatsNewArticleRead(article.id),
		)
	);
});

const mainMenuItems = computed<IMenuItem[]>(() => [
	{
		id: 'home',
		icon: 'home',
		label: i18n.baseText('mainSidebar.home'),
		position: 'top',
		route: { to: { name: VIEWS.HOMEPAGE } },
		available: true,
	},
	{
		id: 'cloud-admin',
		position: 'bottom',
		label: 'Admin Panel',
		icon: 'cloud',
		// [多租户改造] 始终显示，点击时再检查权限和认证
		available: true,
	},
	{
		id: 'chat',
		icon: 'message-circle',
		label: 'Chat',
		position: 'bottom',
		// [多租户改造] 移除 route，由 handleSelect 控制跳转
		// route: { to: { name: CHAT_VIEW } },
		available: true,
	},
	{
		// [多租户改造] 简化 Templates 菜单项，合并所有版本，延迟判断具体跳转逻辑
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available: true,
	},
	{
		id: 'insights',
		icon: 'chart-column-decreasing',
		label: 'Insights',
		position: 'bottom',
		// [多租户改造] 移除 route，由 handleSelect 控制跳转
		// route: { to: { name: VIEWS.INSIGHTS } },
		available: true,
	},
	{
		id: 'help',
		icon: 'circle-help',
		label: i18n.baseText('mainSidebar.help'),
		position: 'bottom',
		children: [
			{
				id: 'quickstart',
				icon: 'video',
				label: i18n.baseText('mainSidebar.helpMenuItems.quickstart'),
				link: {
					href: EXTERNAL_LINKS.QUICKSTART_VIDEO,
					target: '_blank',
				},
			},
			{
				id: 'docs',
				icon: 'book',
				label: i18n.baseText('mainSidebar.helpMenuItems.documentation'),
				link: {
					href: EXTERNAL_LINKS.DOCUMENTATION,
					target: '_blank',
				},
			},
			{
				id: 'forum',
				icon: 'users',
				label: i18n.baseText('mainSidebar.helpMenuItems.forum'),
				link: {
					href: EXTERNAL_LINKS.FORUM,
					target: '_blank',
				},
			},
			{
				id: 'examples',
				icon: 'graduation-cap',
				label: i18n.baseText('mainSidebar.helpMenuItems.course'),
				link: {
					href: EXTERNAL_LINKS.COURSES,
					target: '_blank',
				},
			},
			{
				// [多租户改造] Report Bug 始终显示，点击时再处理认证和获取 URL
				id: 'report-bug',
				icon: 'bug',
				label: i18n.baseText('mainSidebar.helpMenuItems.reportBug'),
			},
			{
				id: 'about',
				icon: 'info',
				label: i18n.baseText('mainSidebar.aboutN8n'),
				position: 'bottom',
			},
		],
	},
	{
		id: 'whats-new',
		icon: 'bell',
		notification: showWhatsNewNotification.value,
		label: i18n.baseText('mainSidebar.whatsNew'),
		position: 'bottom',
		// [多租户改造] 始终显示，延迟加载数据
		available: true,
		children: [
			// [多租户改造] 只在已登录时加载文章列表，避免未登录时访问 store
			...(isAuthenticated.value
				? versionsStore.whatsNewArticles.map(
						(article) =>
							({
								id: `whats-new-article-${article.id}`,
								label: article.title,
								size: 'small',
								customIconSize: 'small',
								icon: {
									type: 'emoji',
									value: '•',
									color: !versionsStore.isWhatsNewArticleRead(article.id)
										? 'primary'
										: 'text-light',
								},
							}) satisfies IMenuItem,
					)
				: []),
			{
				id: 'full-changelog',
				icon: 'external-link',
				label: i18n.baseText('mainSidebar.whatsNew.fullChangelog'),
				link: {
					href: RELEASE_NOTES_URL,
					target: '_blank',
				},
				size: 'small',
				customIconSize: 'small',
			},
			{
				id: 'version-upgrade-cta',
				component: VersionUpdateCTA,
				// [多租户改造] 只在已登录时检查更新状态
				available: isAuthenticated.value && versionsStore.hasVersionUpdates,
				props: {
					disabled: !usersStore.canUserUpdateVersion,
					tooltipText: !usersStore.canUserUpdateVersion
						? i18n.baseText('whatsNew.updateNudgeTooltip')
						: undefined,
				},
			},
		],
	},
]);

const visibleMenuItems = computed(() =>
	mainMenuItems.value.filter((item) => item.available !== false),
);

const createBtn = ref<InstanceType<typeof N8nNavigationDropdown>>();

const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed);

const showUserArea = computed(() => hasPermission(['authenticated']));
// [多租户改造] 只在已登录时检查试用状态，避免未登录时访问 cloudPlanStore
const userIsTrialing = computed(() => isAuthenticated.value && cloudPlanStore.userIsTrialing);

onMounted(async () => {
	window.addEventListener('resize', onResize);
	basePath.value = rootStore.baseUrl;
	if (user.value?.$el) {
		void externalHooks.run('mainSidebar.mounted', {
			userRef: user.value.$el,
		});
	}

	// [多租户改造] 只在已登录时启动 CTA 监控,避免未登录时的 401 错误
	if (isAuthenticated.value) {
		becomeTemplateCreatorStore.startMonitoringCta();
	}

	await nextTick(onResizeEnd);
});

onBeforeUnmount(() => {
	// [多租户改造] 只在已登录时停止 CTA 监控
	if (isAuthenticated.value) {
		becomeTemplateCreatorStore.stopMonitoringCta();
	}
	window.removeEventListener('resize', onResize);
});

const trackHelpItemClick = (itemType: string) => {
	telemetry.track('User clicked help resource', {
		type: itemType,
		workflow_id: workflowsStore.workflowId,
	});
};

const toggleCollapse = () => {
	uiStore.toggleSidebarMenuCollapse();
	// When expanding, delay showing some element to ensure smooth animation
	if (!isCollapsed.value) {
		setTimeout(() => {
			fullyExpanded.value = !isCollapsed.value;
		}, 300);
	} else {
		fullyExpanded.value = !isCollapsed.value;
	}
};

const handleSelect = (key: string) => {
	// [多租户改造] 需要认证的功能列表
	const requiresAuth = ['cloud-admin', 'chat', 'templates', 'insights'];

	// [多租户改造] 如果功能需要认证但用户未登录，打开登录弹窗
	if (requiresAuth.includes(key) && !isAuthenticated.value) {
		uiStore.openModal(AUTH_MODAL_KEY);
		return;
	}

	switch (key) {
		case 'templates': {
			// [多租户改造] 延迟判断 Templates 的具体跳转逻辑
			if (!isAuthenticated.value) {
				uiStore.openModal(AUTH_MODAL_KEY);
				return;
			}

			// 只在已登录时才访问 store 数据
			if (personalizedTemplatesV3Store.isFeatureEnabled()) {
				personalizedTemplatesV3Store.markTemplateRecommendationInteraction();
				uiStore.openModalWithData({
					name: EXPERIMENT_TEMPLATE_RECO_V3_KEY,
					data: {},
				});
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			} else if (personalizedTemplatesV2Store.isFeatureEnabled()) {
				uiStore.openModalWithData({
					name: EXPERIMENT_TEMPLATE_RECO_V2_KEY,
					data: {},
				});
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			} else if (settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost) {
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			}
			break;
		}
		case 'about': {
			trackHelpItemClick('about');
			uiStore.openModal(ABOUT_MODAL_KEY);
			break;
		}
		case 'cloud-admin': {
			// [多租户改造] 延迟检查权限
			if (!isAuthenticated.value) {
				uiStore.openModal(AUTH_MODAL_KEY);
				return;
			}
			if (!settingsStore.isCloudDeployment || !hasPermission(['instanceOwner'])) {
				// 没有权限，显示提示或静默处理
				return;
			}
			void pageRedirectionHelper.goToDashboard();
			break;
		}
		case 'chat': {
			// [多租户改造] 延迟检查权限和功能开关
			if (!isAuthenticated.value) {
				uiStore.openModal(AUTH_MODAL_KEY);
				return;
			}
			if (
				!settingsStore.isChatFeatureEnabled ||
				!hasPermission(['rbac'], { rbac: { scope: 'chatHub:message' } })
			) {
				// 功能未开启或无权限
				return;
			}
			// [多租户改造] 移除 route 配置后，手动进行路由跳转
			void router.push({ name: CHAT_VIEW });
			break;
		}
		case 'insights': {
			// [多租户改造] 延迟检查权限
			if (!isAuthenticated.value) {
				uiStore.openModal(AUTH_MODAL_KEY);
				return;
			}
			if (
				!settingsStore.isModuleActive('insights') ||
				!hasPermission(['rbac'], { rbac: { scope: 'insights:list' } })
			) {
				// 模块未激活或无权限
				return;
			}
			telemetry.track('User clicked insights link from side menu');
			// [多租户改造] 移除 route 配置后，手动进行路由跳转
			void router.push({ name: VIEWS.INSIGHTS });
			break;
		}
		case 'quickstart':
		case 'docs':
		case 'forum':
		case 'examples': {
			trackHelpItemClick(key);
			break;
		}
		case 'report-bug': {
			// [多租户改造] Report Bug 需要登录后才能获取正确的 URL
			trackHelpItemClick('report-bug');
			if (!isAuthenticated.value) {
				uiStore.openModal(AUTH_MODAL_KEY);
				return;
			}
			// 已登录时打开 Bug 报告页面
			window.open(getReportingURL(), '_blank');
			break;
		}
		default:
			if (key.startsWith('whats-new-article-')) {
				const articleId = Number(key.replace('whats-new-article-', ''));

				telemetry.track("User clicked on what's new section", {
					article_id: articleId,
				});
				uiStore.openModalWithData({
					name: WHATS_NEW_MODAL_KEY,
					data: {
						articleId,
					},
				});
			}

			break;
	}
};

function onResize() {
	void callDebounced(onResizeEnd, { debounceTime: 250 });
}

async function onResizeEnd() {
	if (window.innerWidth < 900) {
		uiStore.sidebarMenuCollapsed = true;
	} else {
		uiStore.sidebarMenuCollapsed = uiStore.sidebarMenuCollapsedPreference;
	}

	void nextTick(() => {
		fullyExpanded.value = !isCollapsed.value;
	});
}

const {
	menu,
	handleSelect: handleMenuSelect,
	createProjectAppendSlotName,
	createWorkflowsAppendSlotName,
	createCredentialsAppendSlotName,
	projectsLimitReachedMessage,
	upgradeLabel,
	hasPermissionToCreateProjects,
} = useGlobalEntityCreation();
onClickOutside(createBtn as Ref<VueInstance>, () => {
	createBtn.value?.close();
});
</script>

<template>
	<div
		id="side-menu"
		:class="{
			['side-menu']: true,
			[$style.sideMenu]: true,
			[$style.sideMenuCollapsed]: isCollapsed,
		}"
	>
		<div
			id="collapse-change-button"
			:class="['clickable', $style.sideMenuCollapseButton]"
			@click="toggleCollapse"
		>
			<N8nIcon v-if="isCollapsed" icon="chevron-right" size="xsmall" class="ml-5xs" />
			<N8nIcon v-else icon="chevron-left" size="xsmall" class="mr-5xs" />
		</div>
		<div :class="$style.logo">
			<N8nLogo size="small" :collapsed="isCollapsed" :release-channel="releaseChannel">
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly && !isCollapsed"
					placement="bottom"
				>
					<template #content>
						<I18nT keypath="readOnlyEnv.tooltip" scope="global">
							<template #link>
								<N8nLink
									to="https://docs.n8n.io/source-control-environments/setup/#step-4-connect-n8n-and-configure-your-instance"
									size="small"
								>
									{{ i18n.baseText('readOnlyEnv.tooltip.link') }}
								</N8nLink>
							</template>
						</I18nT>
					</template>
					<N8nIcon
						data-test-id="read-only-env-icon"
						icon="lock"
						size="xsmall"
						:class="$style.readOnlyEnvironmentIcon"
					/>
				</N8nTooltip>
			</N8nLogo>
			<N8nNavigationDropdown
				v-if="isAuthenticated"
				ref="createBtn"
				data-test-id="universal-add"
				:menu="menu"
				@select="handleMenuSelect"
			>
				<N8nIconButton icon="plus" type="secondary" outline />
				<template #[createWorkflowsAppendSlotName]>
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.workflow')"
					>
						<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
					</N8nTooltip>
				</template>
				<template #[createCredentialsAppendSlotName]>
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.credential')"
					>
						<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
					</N8nTooltip>
				</template>
				<template #[createProjectAppendSlotName]="{ item }">
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.project')"
					>
						<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
					</N8nTooltip>
					<N8nTooltip
						v-else-if="item.disabled"
						placement="right"
						:content="projectsLimitReachedMessage"
					>
						<N8nIcon
							v-if="!hasPermissionToCreateProjects"
							style="margin-left: auto; margin-right: 5px"
							icon="lock"
							size="xsmall"
						/>
						<N8nButton
							v-else
							:size="'mini'"
							style="margin-left: auto"
							type="tertiary"
							@click="handleMenuSelect(item.id)"
						>
							{{ upgradeLabel }}
						</N8nButton>
					</N8nTooltip>
				</template>
			</N8nNavigationDropdown>
		</div>
		<N8nScrollArea as-child>
			<div :class="$style.scrollArea">
				<ProjectNavigation
					v-if="isAuthenticated"
					:collapsed="isCollapsed"
					:plan-name="cloudPlanStore.currentPlanData?.displayName"
				/>

				<div :class="$style.bottomMenu">
					<!-- [多租户改造] BecomeTemplateCreatorCta 只在已登录且非试用用户时显示 -->
					<BecomeTemplateCreatorCta v-if="isAuthenticated && fullyExpanded && !userIsTrialing" />
					<div :class="$style.bottomMenuItems">
						<template v-for="item in visibleMenuItems" :key="item.id">
							<N8nPopoverReka
								v-if="item.children"
								:key="item.id"
								side="right"
								align="end"
								:side-offset="16"
							>
								<template #content>
									<div :class="$style.popover">
										<N8nText :class="$style.popoverTitle" bold color="foreground-xdark">{{
											item.label
										}}</N8nText>
										<template v-for="child in item.children" :key="child.id">
											<component
												:is="child.component"
												v-if="isCustomMenuItem(child)"
												v-bind="child.props"
											/>
											<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
										</template>
									</div>
								</template>
								<template #trigger>
									<N8nMenuItem
										:item="item"
										:compact="isCollapsed"
										@click="() => handleSelect(item.id)"
									/>
								</template>
							</N8nPopoverReka>
							<N8nMenuItem
								v-else
								:item="item"
								:compact="isCollapsed"
								@click="() => handleSelect(item.id)"
							/>
						</template>
					</div>
				</div>
			</div>
		</N8nScrollArea>

		<MainSidebarSourceControl :is-collapsed="isCollapsed" />
		<MainSidebarUserArea
			v-if="showUserArea"
			ref="user"
			:fully-expanded="fullyExpanded"
			:is-collapsed="isCollapsed"
		/>

		<TemplateTooltip />
	</div>
</template>

<style lang="scss" module>
.sideMenu {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	width: $sidebar-expanded-width;
	background-color: var(--menu-background, var(--color--background--light-3));

	.logo {
		display: flex;
		align-items: center;
		padding: var(--spacing--xs);
		justify-content: space-between;

		img {
			position: relative;
			left: 1px;
			height: 20px;
		}
	}

	&.sideMenuCollapsed {
		width: $sidebar-width;
		min-width: auto;

		.logo {
			flex-direction: column;
			gap: 12px;
		}
	}
}

.scrollArea {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.sideMenuCollapseButton {
	position: absolute;
	right: -10px;
	top: 50%;
	z-index: 999;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color--text);
	background-color: var(--color--foreground--tint-2);
	width: 20px;
	height: 20px;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: 50%;

	&:hover {
		color: var(--color--primary--shade-1);
	}
}

.bottomMenu {
	display: flex;
	flex-direction: column;
	margin-top: auto;
}

.bottomMenuItems {
	padding: var(--spacing--xs);
}

.popover {
	padding: var(--spacing--xs);
	min-width: 200px;
}

.popoverTitle {
	display: block;
	margin-bottom: var(--spacing--3xs);
}

@media screen and (max-height: 470px) {
	:global(#help) {
		display: none;
	}
}

.readOnlyEnvironmentIcon {
	display: inline-block;
	color: white;
	background-color: var(--color--warning);
	align-self: center;
	padding: 2px;
	border-radius: var(--radius--sm);
	margin: 7px 12px 0 5px;
}
</style>
