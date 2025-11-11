/**
 * Admin panel local type definitions
 */

export interface AdminCredentials {
	rememberMe?: boolean;
	email: string;
	password: string;
}

export interface AdminInfo {
	id: string;
	email: string;
	name: string;
	role?: string;
	isActive?: boolean;
	lastLoginAt?: string;
}

export interface AdminAuthState {
	admin: AdminInfo | null;
	isAuthenticated: boolean;
	sessionExpiry: Date | null;
}

/**
 * AI Provider types
 */
export interface ModelConfig {
	id: string;
	name: string;
	description?: string;
	pricePerToken: number;
	currency: string;
	contextWindow: number;
	maxOutputTokens: number;
	supportsFunctions: boolean;
	supportsVision: boolean;
}

export interface AIProvider {
	providerKey: string;
	providerName: string;
	apiEndpoint: string;
	apiKeyEncrypted?: string;
	enabled: boolean;
	modelsConfig: {
		models: ModelConfig[];
	};
	quotaConfig?: {
		monthlyTokens?: number;
		currentUsed?: number;
	};
	createdAt: string;
	updatedAt: string;
}

export interface AIProviderFormData {
	providerKey: string;
	providerName: string;
	apiEndpoint: string;
	apiKey: string;
	enabled?: boolean;
	modelsConfig?: {
		models: ModelConfig[];
	};
	quotaConfig?: {
		monthlyTokens?: number;
		currentUsed?: number;
	};
}

/**
 * Statistics types
 */
export interface StatisticsOverview {
	totalWorkspaces: number;
	totalUsers: number;
	totalBalance: number;
	todayRevenue: number;
	activeWorkspaces: number;
	totalRevenue: number;
	trends?: {
		workspaces: number; // 百分比
		users: number;
		revenue: number;
	};
}

export interface RevenueData {
	totalRevenue: number;
	totalCalls: number;
	totalTokens: number;
	avgRevenuePerCall: number;
	avgRevenuePerDay: number;
	dateRange: {
		startDate: string;
		endDate: string;
		days: number;
	};
}

export interface PopularService {
	serviceKey: string;
	serviceType: string;
	calls: number;
	revenue: number;
	avgRevenuePerCall: number;
}

export interface ActiveWorkspace {
	workspaceId: string;
	workspaceName: string;
	totalSpent: number;
	currentBalance: number;
	totalCalls: number;
	avgSpentPerCall: number;
}

export interface StatisticsState {
	overview: StatisticsOverview | null;
	revenueData: RevenueData | null;
	popularServices: PopularService[];
	activeWorkspaces: ActiveWorkspace[];
	loading: boolean;
}

/**
 * 平台节点类型定义
 */
export interface PlatformNode {
	id: string;
	nodeKey: string;
	name: string;
	description: string;
	category: string;
	version: string;
	icon?: string;
	isActive: boolean;
	submissionStatus: 'pending' | 'approved' | 'rejected';
	submittedBy?: string;
	submittedAt?: string;
	reviewedBy?: string;
	reviewedAt?: string;
	usageCount?: number;
	errorRate?: number;
	enabled?: boolean;
	nodeType?: 'platform' | 'third_party';
	nodeDefinition?: Record<string, unknown>;
	nodeCode?: string;
	configMode?: 'none' | 'user' | 'team';
	configSchema?: Record<string, unknown>;
	iconUrl?: string;
}

export interface PlatformNodesState {
	nodes: PlatformNode[];
	loading: boolean;
	currentNode: PlatformNode | null;
}

/**
 * Workspace Management Types
 */
export interface Workspace {
	id: string;
	name: string;
	type: 'personal' | 'team';
	status: 'active' | 'suspended';
	createdAt: string;
	updatedAt: string;
	balance: number;
	currency: string;
	lowBalanceThreshold: number;
	isLowBalance: boolean;
	memberCount: number;
}

export interface WorkspaceDetail {
	id: string;
	name: string;
	type: 'personal' | 'team';
	createdAt: string;
	updatedAt: string;
}

export interface WorkspaceBalance {
	current: number;
	currency: string;
	lowBalanceThreshold: number;
	isLowBalance: boolean;
}

export interface WorkspaceMember {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	role?: string;
}

export interface UsageRecord {
	id: string;
	workspaceId: string;
	serviceType: string;
	serviceKey: string;
	amountCny: number;
	tokens?: number;
	calls?: number;
	metadata?: Record<string, any>;
	timestamp: string;
}

export interface RechargeRecord {
	id: string;
	amount: number;
	paymentMethod: string;
	transactionId?: string;
	status: 'pending' | 'completed' | 'failed';
	createdAt: string;
	completedAt?: string;
	isAdminRecharge: boolean;
}

export interface WorkspaceWithDetails {
	workspace: WorkspaceDetail;
	balance: WorkspaceBalance;
	members: WorkspaceMember[];
	recentRecharges: RechargeRecord[];
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListWorkspacesParams {
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: 'name' | 'createdAt' | 'balance';
	sortOrder?: 'ASC' | 'DESC';
}

export interface UsageQueryParams {
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
}

export interface RechargeParams {
	amount: number;
	reason?: string;
}

export interface WorkspacesState {
	workspaces: Workspace[];
	loading: boolean;
	currentWorkspace: WorkspaceWithDetails | null;
	usageRecords: UsageRecord[];
	rechargeRecords: RechargeRecord[];
	pagination: PaginationInfo | null;
}
