import SourceControlInitializationErrorMessage from '@/features/integrations/sourceControl.ee/components/SourceControlInitializationErrorMessage.vue';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import type { UserManagementAuthenticationMethod } from '@/Interface';
import {
	registerModuleModals,
	registerModuleProjectTabs,
	registerModuleResources,
	registerModuleSettingsPages,
} from '@/moduleInitializer/moduleInitializer';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { usePostHog } from '@/stores/posthog.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRBACStore } from '@/stores/rbac.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useVersionsStore } from '@/stores/versions.store';
import { useBannersStore } from '@/stores/banners.store';
import type { BannerName } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { h } from 'vue';
import { useRolesStore } from './stores/roles.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

export const state = {
	initialized: false,
};
let authenticatedFeaturesInitialized = false;

/**
 * Initializes the core application stores and hooks
 * This is called once, when the first route is loaded.
 */
export async function initializeCore() {
	if (state.initialized) {
		return;
	}

	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const versionsStore = useVersionsStore();
	const ssoStore = useSSOStore();
	const bannersStore = useBannersStore();

	const toast = useToast();
	const i18n = useI18n();

	registerAuthenticationHooks();

	/**
	 * Initialize stores
	 */

	try {
		await settingsStore.initialize();
	} catch (error) {
		toast.showToast({
			title: i18n.baseText('startupError'),
			message: i18n.baseText('startupError.message'),
			type: 'error',
			duration: 0,
		});
	}

	ssoStore.initialize({
		authenticationMethod: settingsStore.userManagement
			.authenticationMethod as UserManagementAuthenticationMethod,
		config: settingsStore.settings.sso,
		features: {
			saml: settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Saml],
			ldap: settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Ldap],
			oidc: settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Oidc],
		},
	});

	const banners: BannerName[] = [];
	if (settingsStore.isEnterpriseFeatureEnabled.showNonProdBanner) {
		banners.push('NON_PRODUCTION_LICENSE');
	}
	if (
		!(settingsStore.settings.banners?.dismissed || []).includes('V1') &&
		settingsStore.settings.versionCli.startsWith('1.')
	) {
		banners.push('V1');
	}
	bannersStore.initialize({
		banners,
	});

	versionsStore.initialize(settingsStore.settings.versionNotifications);

	void useExternalHooks().run('app.mount');

	if (!settingsStore.isPreviewMode) {
		await usersStore.initialize({
			quota: settingsStore.userManagement.quota,
		});
	}

	state.initialized = true;
}

/**
 * Initializes the features of the application that require an authenticated user
 */
export async function initializeAuthenticatedFeatures(
	initialized: boolean = authenticatedFeaturesInitialized,
	routeName?: string,
) {
	if (initialized) {
		return;
	}

	const usersStore = useUsersStore();
	if (!usersStore.currentUser) {
		return;
	}

	const i18n = useI18n();
	const toast = useToast();
	const sourceControlStore = useSourceControlStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();
	const cloudPlanStore = useCloudPlanStore();
	const projectsStore = useProjectsStore();
	const rolesStore = useRolesStore();
	const insightsStore = useInsightsStore();
	const bannersStore = useBannersStore();
	const versionsStore = useVersionsStore();
	const dataTableStore = useDataTableStore();

	if (sourceControlStore.isEnterpriseSourceControlEnabled) {
		try {
			await sourceControlStore.getPreferences();
		} catch (e) {
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.connection.error'),
				message: h(SourceControlInitializationErrorMessage),
				type: 'error',
				duration: 0,
			});
			console.error('Failed to initialize source control store', e);
		}
	}

	if (rootStore.defaultLocale !== 'en') {
		await nodeTypesStore.getNodeTranslationHeaders();
	}

	if (settingsStore.isCloudDeployment) {
		void cloudPlanStore
			.initialize()
			.then(() => {
				if (cloudPlanStore.userIsTrialing) {
					if (cloudPlanStore.trialExpired) {
						bannersStore.pushBannerToStack('TRIAL_OVER');
					} else {
						bannersStore.pushBannerToStack('TRIAL');
					}
				} else if (cloudPlanStore.currentUserCloudInfo?.confirmed === false) {
					bannersStore.pushBannerToStack('EMAIL_CONFIRMATION');
				}
			})
			.catch((error) => {
				console.error('Failed to initialize cloud plan store:', error);
			});
	}

	if (settingsStore.isDataTableFeatureEnabled) {
		void dataTableStore
			.fetchDataTableSize()
			.then(({ quotaStatus }) => {
				if (quotaStatus === 'error') {
					bannersStore.pushBannerToStack('DATA_TABLE_STORAGE_LIMIT_ERROR');
				} else if (quotaStatus === 'warn') {
					bannersStore.pushBannerToStack('DATA_TABLE_STORAGE_LIMIT_WARNING');
				}
			})
			.catch((error) => {
				console.error('Failed to fetch data table limits:', error);
			});
	}

	if (insightsStore.isSummaryEnabled) {
		void insightsStore.weeklySummary.execute();
	}

	// Don't check for new versions in preview mode or demo view (ex: executions iframe)
	if (!settingsStore.isPreviewMode && routeName !== VIEWS.DEMO) {
		void versionsStore.checkForNewVersions();
	}

	await Promise.all([
		projectsStore.getMyProjects(),
		projectsStore.getPersonalProject(),
		projectsStore.getProjectsCount(),
		rolesStore.fetchRoles(),
	]);

	// [多租户改造] 自动恢复上次选择的工作区
	// 如果 localStorage 中存在 activeProjectId，则尝试加载该工作区
	if (projectsStore.activeProjectId) {
		try {
			// 验证该工作区是否还存在于用户的项目列表中
			const projectExists =
				projectsStore.myProjects.some((p) => p.id === projectsStore.activeProjectId) ||
				projectsStore.personalProject?.id === projectsStore.activeProjectId;

			if (projectExists) {
				await projectsStore.fetchAndSetProject(projectsStore.activeProjectId);
			} else {
				// 如果工作区不存在（可能已被删除），清除持久化状态
				console.warn('Saved active project no longer exists, clearing localStorage');
				await projectsStore.setActiveProject(null);
			}
		} catch (error) {
			console.error('Failed to restore active project:', error);
			// 恢复失败时清除持久化状态，避免一直尝试加载无效的工作区
			await projectsStore.setActiveProject(null);
		}
	}

	// Initialize modules
	registerModuleResources();
	registerModuleProjectTabs();
	registerModuleModals();
	registerModuleSettingsPages();

	authenticatedFeaturesInitialized = true;
}

function registerAuthenticationHooks() {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const postHogStore = usePostHog();
	const bannersStore = useBannersStore();
	const npsSurveyStore = useNpsSurveyStore();
	const telemetry = useTelemetry();
	const RBACStore = useRBACStore();
	const settingsStore = useSettingsStore();

	usersStore.registerLoginHook(async (user) => {
		await settingsStore.getSettings();

		RBACStore.setGlobalScopes(user.globalScopes ?? []);
		telemetry.identify(rootStore.instanceId, user.id, rootStore.versionCli);
		postHogStore.init(user.featureFlags);
		npsSurveyStore.setupNpsSurveyOnLogin(user.id, user.settings);
		void settingsStore.getModuleSettings();
	});

	usersStore.registerLogoutHook(() => {
		bannersStore.clearBannerStack();
		npsSurveyStore.resetNpsSurveyOnLogOut();
		postHogStore.reset();
		cloudPlanStore.reset();
		telemetry.reset();
		RBACStore.setGlobalScopes([]);
	});
}
