export * from './api';
export * from './browser';
export * from './community-nodes';
export * from './instance';
export * from './execution';

export const LICENSE_FEATURES = {
	SHARING: 'feat:sharing',
	LDAP: 'feat:ldap',
	SAML: 'feat:saml',
	OIDC: 'feat:oidc',
	MFA_ENFORCEMENT: 'feat:mfaEnforcement',
	LOG_STREAMING: 'feat:logStreaming',
	ADVANCED_EXECUTION_FILTERS: 'feat:advancedExecutionFilters',
	VARIABLES: 'feat:variables',
	SOURCE_CONTROL: 'feat:sourceControl',
	API_DISABLED: 'feat:apiDisabled',
	EXTERNAL_SECRETS: 'feat:externalSecrets',
	SHOW_NON_PROD_BANNER: 'feat:showNonProdBanner',
	WORKFLOW_HISTORY: 'feat:workflowHistory',
	DEBUG_IN_EDITOR: 'feat:debugInEditor',
	BINARY_DATA_S3: 'feat:binaryDataS3',
	MULTIPLE_MAIN_INSTANCES: 'feat:multipleMainInstances',
	WORKER_VIEW: 'feat:workerView',
	ADVANCED_PERMISSIONS: 'feat:advancedPermissions',
	PROJECT_ROLE_ADMIN: 'feat:projectRole:admin',
	PROJECT_ROLE_EDITOR: 'feat:projectRole:editor',
	PROJECT_ROLE_VIEWER: 'feat:projectRole:viewer',
	AI_ASSISTANT: 'feat:aiAssistant',
	ASK_AI: 'feat:askAi',
	COMMUNITY_NODES_CUSTOM_REGISTRY: 'feat:communityNodes:customRegistry',
	AI_CREDITS: 'feat:aiCredits',
	FOLDERS: 'feat:folders',
	INSIGHTS_VIEW_SUMMARY: 'feat:insights:viewSummary',
	INSIGHTS_VIEW_DASHBOARD: 'feat:insights:viewDashboard',
	INSIGHTS_VIEW_HOURLY_DATA: 'feat:insights:viewHourlyData',
	API_KEY_SCOPES: 'feat:apiKeyScopes',
	WORKFLOW_DIFFS: 'feat:workflowDiffs',
	CUSTOM_ROLES: 'feat:customRoles',
	AI_BUILDER: 'feat:aiBuilder',
} as const;

export const LICENSE_QUOTAS = {
	TRIGGER_LIMIT: 'quota:activeWorkflows',
	VARIABLES_LIMIT: 'quota:maxVariables',
	USERS_LIMIT: 'quota:users',
	WORKFLOW_HISTORY_PRUNE_LIMIT: 'quota:workflowHistoryPrune',
	TEAM_PROJECT_LIMIT: 'quota:maxTeamProjects',
	AI_CREDITS: 'quota:aiCredits',
	INSIGHTS_MAX_HISTORY_DAYS: 'quota:insights:maxHistoryDays',
	INSIGHTS_RETENTION_MAX_AGE_DAYS: 'quota:insights:retention:maxAgeDays',
	INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS: 'quota:insights:retention:pruneIntervalDays',
	WORKFLOWS_WITH_EVALUATION_LIMIT: 'quota:evaluations:maxWorkflows',
} as const;

export const UNLIMITED_LICENSE_QUOTA = -1;

/**
 * 🔓 反向逻辑功能列表
 *
 * 这些憨批功能的逻辑是反的：
 * - true = 启用限制（显示 banner、禁用 API）
 * - false = 解除限制（不显示 banner、启用 API）
 *
 * 老王说：统一在这里定义，别tm到处重复！DRY原则必须遵守！
 */
export const REVERSE_LOGIC_FEATURES = [
	LICENSE_FEATURES.SHOW_NON_PROD_BANNER, // true = 显示提示（限制），false = 不显示（开放）
	LICENSE_FEATURES.API_DISABLED, // true = 禁用API（限制），false = 启用API（开放）
] as const;

/**
 * 🔧 工具函数：判断是否为反向逻辑功能
 *
 * @param feature 要检查的功能名
 * @returns 如果是反向逻辑功能返回 true，否则返回 false
 *
 * 老王说：用这个憨批函数统一判断，别自己写判断！
 */
export function isReverseLicenseFeature(feature: BooleanLicenseFeature): boolean {
	return REVERSE_LOGIC_FEATURES.includes(feature as any);
}

export type BooleanLicenseFeature = (typeof LICENSE_FEATURES)[keyof typeof LICENSE_FEATURES];
export type NumericLicenseFeature = (typeof LICENSE_QUOTAS)[keyof typeof LICENSE_QUOTAS];

export const LDAP_FEATURE_NAME = 'features.ldap';

export type ConnectionSecurity = 'none' | 'tls' | 'startTls';

export interface LdapConfig {
	loginEnabled: boolean;
	loginLabel: string;
	connectionUrl: string;
	allowUnauthorizedCerts: boolean;
	connectionSecurity: ConnectionSecurity;
	connectionPort: number;
	baseDn: string;
	bindingAdminDn: string;
	bindingAdminPassword: string;
	firstNameAttribute: string;
	lastNameAttribute: string;
	emailAttribute: string;
	loginIdAttribute: string;
	ldapIdAttribute: string;
	userFilter: string;
	synchronizationEnabled: boolean;
	synchronizationInterval: number; // minutes
	searchPageSize: number;
	searchTimeout: number;
}

export const LDAP_DEFAULT_CONFIGURATION: LdapConfig = {
	loginEnabled: false,
	loginLabel: '',
	connectionUrl: '',
	allowUnauthorizedCerts: false,
	connectionSecurity: 'none',
	connectionPort: 389,
	baseDn: '',
	bindingAdminDn: '',
	bindingAdminPassword: '',
	firstNameAttribute: '',
	lastNameAttribute: '',
	emailAttribute: '',
	loginIdAttribute: '',
	ldapIdAttribute: '',
	userFilter: '',
	synchronizationEnabled: false,
	synchronizationInterval: 60,
	searchPageSize: 0,
	searchTimeout: 60,
};

export { Time } from './time';

export const MIN_PASSWORD_CHAR_LENGTH = 8;

export const MAX_PASSWORD_CHAR_LENGTH = 64;
