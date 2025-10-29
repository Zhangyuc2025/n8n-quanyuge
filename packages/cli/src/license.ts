import type { LicenseProvider } from '@n8n/backend-common';
import { LicenseState } from '@n8n/backend-common';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	LICENSE_FEATURES,
	LICENSE_QUOTAS,
	UNLIMITED_LICENSE_QUOTA,
	isReverseLicenseFeature,
	type BooleanLicenseFeature,
	type NumericLicenseFeature,
} from '@n8n/constants';
import { SettingsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { SelfHostedLicenseProvider } from '@/license/self-hosted-license-provider';
import { LicenseMetricsService } from '@/metrics/license-metrics.service';

import { SETTINGS_LICENSE_CERT_KEY } from './constants';

// 🔓 本地类型定义 - 替代 license-sdk 的类型
export type TLicenseBlock = string;
export interface TEntitlement {
	id?: string;
	productId?: string;
	validFrom: Date;
	productMetadata?: { terms?: { isMainPlan?: boolean } };
}

// 🔓 LicenseManager 类型定义（兼容性）
// 自托管模式下不使用，但保留类型定义以兼容现有代码
interface LicenseManager {
	hasFeatureEnabled(feature: string): boolean;
	getFeatureValue(feature: string): unknown;
	getCurrentEntitlements(): TEntitlement[];
	getManagementJwt(): string;
	getConsumerId(): string;
	initialize(): Promise<void>;
	activate(activationKey: string): Promise<void>;
	reload(): Promise<void>;
	renew(): Promise<void>;
	clear(): Promise<void>;
	shutdown(): Promise<void>;
	enableAutoRenewals(): void;
	disableAutoRenewals(): void;
}

export type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

@Service()
export class License implements LicenseProvider {
	private manager: LicenseManager | undefined;

	private isShuttingDown = false;

	private isSelfHostedMode = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly settingsRepository: SettingsRepository,
		private readonly _licenseMetricsService: LicenseMetricsService,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('license');
	}

	async init({
		forceRecreate = false,
		isCli: _isCli = false,
	}: { forceRecreate?: boolean; isCli?: boolean } = {}) {
		// 🔓 自托管企业版模式 - 直接使用 SelfHostedLicenseProvider
		// 老王说：直接写死！满血版本无需环境变量！
		if (true) {
			// process.env.N8N_SELF_HOSTED_ENTERPRISE === 'true'
			this.logger.info('🔓 Running in self-hosted enterprise mode - all features enabled');
			this.isSelfHostedMode = true;
			const selfHostedProvider = Container.get(SelfHostedLicenseProvider);
			const licenseState = Container.get(LicenseState);
			licenseState.setLicenseProvider(selfHostedProvider);
			this.logger.debug('Self-hosted license provider activated');
			return;
		}

		if (this.manager && !forceRecreate) {
			this.logger.warn('License manager already initialized or shutting down');
			return;
		}
		if (this.isShuttingDown) {
			this.logger.warn('License manager already shutting down');
			return;
		}

		// 🔓 以下代码已被禁用 - 自托管企业版模式不需要 LicenseManager
		// 如果需要使用官方 license，需要重新安装 @n8n_io/license-sdk 并取消注释以下代码
		this.logger.warn(
			'🔓 Official license manager is disabled. Set N8N_SELF_HOSTED_ENTERPRISE=true to enable self-hosted mode.',
		);

		/*
		const { instanceType } = this.instanceSettings;
		const isMainInstance = instanceType === 'main';
		const server = this.globalConfig.license.serverUrl;
		const offlineMode = !isMainInstance;
		const autoRenewOffset = 72 * Time.hours.toSeconds;
		const saveCertStr = isMainInstance
			? async (value: TLicenseBlock) => await this.saveCertStr(value)
			: async () => {};
		const onFeatureChange = isMainInstance
			? async () => await this.onFeatureChange()
			: async () => {};
		const onLicenseRenewed = isMainInstance
			? async () => await this.onLicenseRenewed()
			: async () => {};
		const collectUsageMetrics = isMainInstance
			? async () => await this.licenseMetricsService.collectUsageMetrics()
			: async () => [];
		const collectPassthroughData = isMainInstance
			? async () => await this.licenseMetricsService.collectPassthroughData()
			: async () => ({});
		const onExpirySoon = !this.instanceSettings.isLeader ? () => this.onExpirySoon() : undefined;
		const expirySoonOffsetMins = !this.instanceSettings.isLeader ? 120 : undefined;

		const { isLeader } = this.instanceSettings;
		const { autoRenewalEnabled } = this.globalConfig.license;
		const eligibleToRenew = isCli || isLeader;

		const shouldRenew = eligibleToRenew && autoRenewalEnabled;

		if (eligibleToRenew && !autoRenewalEnabled) {
			this.logger.warn(LICENSE_RENEWAL_DISABLED_WARNING);
		}
		*/

		/*
		try {
			this.manager = new LicenseManager({
				server,
				tenantId: this.globalConfig.license.tenantId,
				productIdentifier: `n8n-${N8N_VERSION}`,
				autoRenewEnabled: shouldRenew,
				renewOnInit: shouldRenew,
				autoRenewOffset,
				detachFloatingOnShutdown: this.globalConfig.license.detachFloatingOnShutdown,
				offlineMode,
				logger: this.logger,
				loadCertStr: async () => await this.loadCertStr(),
				saveCertStr,
				deviceFingerprint: () => this.instanceSettings.instanceId,
				collectUsageMetrics,
				collectPassthroughData,
				onFeatureChange,
				onLicenseRenewed,
				onExpirySoon,
				expirySoonOffsetMins,
			});

			await this.manager.initialize();

			this.logger.debug('License initialized');
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger.error('Could not initialize license manager sdk', { error });
			}
		}
		*/
	}

	async loadCertStr(): Promise<TLicenseBlock> {
		// if we have an ephemeral license, we don't want to load it from the database
		const ephemeralLicense = this.globalConfig.license.cert;
		if (ephemeralLicense) {
			return ephemeralLicense;
		}
		const databaseSettings = await this.settingsRepository.findOne({
			where: {
				key: SETTINGS_LICENSE_CERT_KEY,
			},
		});

		return databaseSettings?.value ?? '';
	}

	private async _onFeatureChange() {
		void this.broadcastReloadLicenseCommand();
	}

	private async _onLicenseRenewed() {
		void this.broadcastReloadLicenseCommand();
	}

	private async broadcastReloadLicenseCommand() {
		if (this.globalConfig.executions.mode === 'queue' && this.instanceSettings.isLeader) {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			await Container.get(Publisher).publishCommand({ command: 'reload-license' });
		}
	}

	async saveCertStr(value: TLicenseBlock): Promise<void> {
		// if we have an ephemeral license, we don't want to save it to the database
		if (this.globalConfig.license.cert) return;
		await this.settingsRepository.upsert(
			{
				key: SETTINGS_LICENSE_CERT_KEY,
				value,
				loadOnStartup: false,
			},
			['key'],
		);
	}

	async activate(activationKey: string): Promise<void> {
		if (!this.manager) {
			return;
		}

		await this.manager.activate(activationKey);
		this.logger.debug('License activated');
	}

	@OnPubSubEvent('reload-license')
	async reload(): Promise<void> {
		if (!this.manager) {
			return;
		}
		await this.manager.reload();
		this.logger.debug('License reloaded');
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		await this.manager.renew();
		this.logger.debug('License renewed');
	}

	async clear() {
		if (!this.manager) {
			return;
		}

		await this.manager.clear();
		this.logger.info('License cleared');
	}

	@OnShutdown()
	async shutdown() {
		// Shut down License manager to unclaim any floating entitlements
		// Note: While this saves a new license cert to DB, the previous entitlements are still kept in memory so that the shutdown process can complete
		this.isShuttingDown = true;

		if (!this.manager) {
			return;
		}

		await this.manager.shutdown();
		this.logger.debug('License shut down');
	}

	isLicensed(feature: BooleanLicenseFeature) {
		// 🔓 自托管企业版模式 - 所有功能都启用
		if (this.isSelfHostedMode) {
			// 老王说：用统一的工具函数判断反向逻辑，别tm写重复代码！
			return !isReverseLicenseFeature(feature);
		}
		return this.manager?.hasFeatureEnabled(feature) ?? false;
	}

	/** @deprecated Use `LicenseState.isSharingLicensed` instead. */
	isSharingEnabled() {
		return this.isLicensed(LICENSE_FEATURES.SHARING);
	}

	/** @deprecated Use `LicenseState.isLogStreamingLicensed` instead. */
	isLogStreamingEnabled() {
		return this.isLicensed(LICENSE_FEATURES.LOG_STREAMING);
	}

	/** @deprecated Use `LicenseState.isLdapLicensed` instead. */
	isLdapEnabled() {
		return this.isLicensed(LICENSE_FEATURES.LDAP);
	}

	/** @deprecated Use `LicenseState.isSamlLicensed` instead. */
	isSamlEnabled() {
		return this.isLicensed(LICENSE_FEATURES.SAML);
	}

	/** @deprecated Use `LicenseState.isApiKeyScopesLicensed` instead. */
	isApiKeyScopesEnabled() {
		return this.isLicensed(LICENSE_FEATURES.API_KEY_SCOPES);
	}

	/** @deprecated Use `LicenseState.isAiAssistantLicensed` instead. */
	isAiAssistantEnabled() {
		return this.isLicensed(LICENSE_FEATURES.AI_ASSISTANT);
	}

	/** @deprecated Use `LicenseState.isAskAiLicensed` instead. */
	isAskAiEnabled() {
		return this.isLicensed(LICENSE_FEATURES.ASK_AI);
	}

	/** @deprecated Use `LicenseState.isAiCreditsLicensed` instead. */
	isAiCreditsEnabled() {
		return this.isLicensed(LICENSE_FEATURES.AI_CREDITS);
	}

	/** @deprecated Use `LicenseState.isAdvancedExecutionFiltersLicensed` instead. */
	isAdvancedExecutionFiltersEnabled() {
		return this.isLicensed(LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS);
	}

	/** @deprecated Use `LicenseState.isAdvancedPermissionsLicensed` instead. */
	isAdvancedPermissionsLicensed() {
		return this.isLicensed(LICENSE_FEATURES.ADVANCED_PERMISSIONS);
	}

	/** @deprecated Use `LicenseState.isDebugInEditorLicensed` instead. */
	isDebugInEditorLicensed() {
		return this.isLicensed(LICENSE_FEATURES.DEBUG_IN_EDITOR);
	}

	/** @deprecated Use `LicenseState.isBinaryDataS3Licensed` instead. */
	isBinaryDataS3Licensed() {
		return this.isLicensed(LICENSE_FEATURES.BINARY_DATA_S3);
	}

	/** @deprecated Use `LicenseState.isMultiMainLicensed` instead. */
	isMultiMainLicensed() {
		return this.isLicensed(LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES);
	}

	/** @deprecated Use `LicenseState.isVariablesLicensed` instead. */
	isVariablesEnabled() {
		return this.isLicensed(LICENSE_FEATURES.VARIABLES);
	}

	/** @deprecated Use `LicenseState.isSourceControlLicensed` instead. */
	isSourceControlLicensed() {
		return this.isLicensed(LICENSE_FEATURES.SOURCE_CONTROL);
	}

	/** @deprecated Use `LicenseState.isExternalSecretsLicensed` instead. */
	isExternalSecretsEnabled() {
		return this.isLicensed(LICENSE_FEATURES.EXTERNAL_SECRETS);
	}

	/** @deprecated Use `LicenseState.isWorkflowHistoryLicensed` instead. */
	isWorkflowHistoryLicensed() {
		return this.isLicensed(LICENSE_FEATURES.WORKFLOW_HISTORY);
	}

	/** @deprecated Use `LicenseState.isAPIDisabled` instead. */
	isAPIDisabled() {
		return this.isLicensed(LICENSE_FEATURES.API_DISABLED);
	}

	/** @deprecated Use `LicenseState.isWorkerViewLicensed` instead. */
	isWorkerViewLicensed() {
		return this.isLicensed(LICENSE_FEATURES.WORKER_VIEW);
	}

	/** @deprecated Use `LicenseState.isProjectRoleAdminLicensed` instead. */
	isProjectRoleAdminLicensed() {
		return this.isLicensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN);
	}

	/** @deprecated Use `LicenseState.isProjectRoleEditorLicensed` instead. */
	isProjectRoleEditorLicensed() {
		return this.isLicensed(LICENSE_FEATURES.PROJECT_ROLE_EDITOR);
	}

	/** @deprecated Use `LicenseState.isProjectRoleViewerLicensed` instead. */
	isProjectRoleViewerLicensed() {
		return this.isLicensed(LICENSE_FEATURES.PROJECT_ROLE_VIEWER);
	}

	/** @deprecated Use `LicenseState.isCustomNpmRegistryLicensed` instead. */
	isCustomNpmRegistryEnabled() {
		return this.isLicensed(LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY);
	}

	/** @deprecated Use `LicenseState.isFoldersLicensed` instead. */
	isFoldersEnabled() {
		return this.isLicensed(LICENSE_FEATURES.FOLDERS);
	}

	getCurrentEntitlements() {
		return this.manager?.getCurrentEntitlements() ?? [];
	}

	getValue<T extends keyof FeatureReturnType>(feature: T): FeatureReturnType[T] {
		// 🔓 自托管企业版模式
		if (this.isSelfHostedMode) {
			// AI Credits 特殊处理
			if (feature === 'quota:aiCredits') {
				return 999999 as FeatureReturnType[T];
			}
			// planName 返回自托管企业版
			if (feature === 'planName') {
				return 'Self-Hosted Enterprise' as FeatureReturnType[T];
			}
			// 其他所有配额返回无限制
			return UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
		}
		return this.manager?.getFeatureValue(feature) as FeatureReturnType[T];
	}

	getManagementJwt(): string {
		if (!this.manager) {
			return '';
		}
		return this.manager.getManagementJwt();
	}

	/**
	 * Helper function to get the latest main plan for a license
	 */
	getMainPlan(): TEntitlement | undefined {
		if (!this.manager) {
			return undefined;
		}

		const entitlements = this.getCurrentEntitlements();
		if (!entitlements.length) {
			return undefined;
		}

		entitlements.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());

		return entitlements.find(
			(entitlement) => (entitlement.productMetadata?.terms as { isMainPlan?: boolean })?.isMainPlan,
		);
	}

	getConsumerId() {
		// 🔓 自托管企业版模式 - 返回固定 ID
		if (this.isSelfHostedMode) {
			return 'self-hosted-enterprise';
		}
		return this.manager?.getConsumerId() ?? 'unknown';
	}

	// Helper functions for computed data

	/** @deprecated Use `LicenseState` instead. */
	getUsersLimit() {
		return this.getValue(LICENSE_QUOTAS.USERS_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	/** @deprecated Use `LicenseState` instead. */
	getTriggerLimit() {
		return this.getValue(LICENSE_QUOTAS.TRIGGER_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	/** @deprecated Use `LicenseState` instead. */
	getVariablesLimit() {
		return this.getValue(LICENSE_QUOTAS.VARIABLES_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	/** @deprecated Use `LicenseState` instead. */
	getAiCredits() {
		return this.getValue(LICENSE_QUOTAS.AI_CREDITS) ?? 0;
	}

	/** @deprecated Use `LicenseState` instead. */
	getWorkflowHistoryPruneLimit() {
		return this.getValue(LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	/** @deprecated Use `LicenseState` instead. */
	getTeamProjectLimit() {
		return this.getValue(LICENSE_QUOTAS.TEAM_PROJECT_LIMIT) ?? 0;
	}

	getPlanName(): string {
		return this.getValue('planName') ?? 'Community';
	}

	getInfo(): string {
		if (!this.manager) {
			return 'n/a';
		}

		return this.manager.toString();
	}

	/** @deprecated Use `LicenseState` instead. */
	isWithinUsersLimit() {
		return this.getUsersLimit() === UNLIMITED_LICENSE_QUOTA;
	}

	@OnLeaderTakeover()
	enableAutoRenewals() {
		this.manager?.enableAutoRenewals();
	}

	@OnLeaderStepdown()
	disableAutoRenewals() {
		this.manager?.disableAutoRenewals();
	}

	private _onExpirySoon() {
		this.logger.info('License is about to expire soon, reloading license...');

		// reload in background to avoid blocking SDK

		void this.reload()
			.then(() => {
				this.logger.info('Reloaded license on expiry soon');
			})
			.catch((error) => {
				this.logger.error('Failed to reload license on expiry soon', {
					error: error instanceof Error ? error.message : error,
				});
			});
	}
}
