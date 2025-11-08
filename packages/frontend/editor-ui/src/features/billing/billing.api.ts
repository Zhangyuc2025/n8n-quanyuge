import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Billing API Types
 */

export interface WorkspaceBalanceDto {
	workspaceId: string;
	balance: number;
	currency: string;
}

export interface RechargeRequestDto {
	amount: number;
	paymentMethod: string;
}

export interface RechargeResponseDto {
	success: boolean;
	message: string;
	workspaceId: string;
	amount: number;
	paymentMethod: string;
}

export interface UsageRecord {
	id: string;
	workspaceId: string;
	serviceKey: string;
	serviceName: string;
	serviceType: string;
	amountCny: number;
	tokensUsed?: number;
	queriesUsed?: number;
	createdAt: string;
	metadata?: Record<string, unknown>;
}

export interface UsageQueryParams {
	workspaceId: string;
	startDate?: string;
	endDate?: string;
	skip?: number;
	limit?: number;
}

export interface UsageResponseDto {
	workspaceId: string;
	records: UsageRecord[];
	pagination: {
		total: number;
		skip: number;
		limit: number;
		hasMore: boolean;
	};
}

export interface RechargeRecord {
	id: string;
	workspaceId: string;
	amountCny: number;
	paymentMethod: string;
	transactionId?: string;
	status: string;
	createdAt: string;
}

export interface RechargeRecordsQueryParams {
	workspaceId: string;
	skip?: number;
	limit?: number;
}

export interface RechargeRecordsResponseDto {
	workspaceId: string;
	records: RechargeRecord[];
	pagination: {
		total: number;
		skip: number;
		limit: number;
		hasMore: boolean;
	};
}

export interface UsageSummaryQueryParams {
	workspaceId: string;
	year?: number;
	month?: number;
}

export interface UsageSummaryDto {
	workspaceId: string;
	year: number;
	month: number;
	period: {
		startDate: string;
		endDate: string;
	};
	summary: {
		totalAmount: number;
		totalTokens: number;
		recordCount: number;
		currency: string;
	};
}

export interface ConsumeServiceParams {
	workspaceId: string;
	serviceKey: string;
	amountCny: number;
	tokensUsed?: number;
	queriesUsed?: number;
	metadata?: Record<string, unknown>;
}

/**
 * Billing API Methods
 */

/**
 * GET /billing/balance
 * Get workspace balance
 */
export async function getWorkspaceBalance(
	context: IRestApiContext,
	workspaceId: string,
): Promise<WorkspaceBalanceDto> {
	return await makeRestApiRequest<WorkspaceBalanceDto>(
		context,
		'GET',
		`/billing/balance?workspaceId=${workspaceId}`,
	);
}

/**
 * POST /billing/recharge
 * Create a recharge order
 */
export async function recharge(
	context: IRestApiContext,
	workspaceId: string,
	amount: number,
	paymentMethod: string,
): Promise<RechargeResponseDto> {
	return await makeRestApiRequest<RechargeResponseDto>(
		context,
		'POST',
		`/billing/recharge?workspaceId=${workspaceId}`,
		{ amount, paymentMethod },
	);
}

/**
 * GET /billing/usage
 * Get usage records with pagination and date filtering
 */
export async function getUsageRecords(
	context: IRestApiContext,
	params: UsageQueryParams,
): Promise<UsageResponseDto> {
	const queryParams = new URLSearchParams();
	queryParams.append('workspaceId', params.workspaceId);

	if (params.startDate) queryParams.append('startDate', params.startDate);
	if (params.endDate) queryParams.append('endDate', params.endDate);
	if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
	if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

	return await makeRestApiRequest<UsageResponseDto>(
		context,
		'GET',
		`/billing/usage?${queryParams.toString()}`,
	);
}

/**
 * GET /billing/usage/summary
 * Get monthly usage summary
 */
export async function getUsageSummary(
	context: IRestApiContext,
	params: UsageSummaryQueryParams,
): Promise<UsageSummaryDto> {
	const queryParams = new URLSearchParams();
	queryParams.append('workspaceId', params.workspaceId);

	if (params.year !== undefined) queryParams.append('year', params.year.toString());
	if (params.month !== undefined) queryParams.append('month', params.month.toString());

	return await makeRestApiRequest<UsageSummaryDto>(
		context,
		'GET',
		`/billing/usage/summary?${queryParams.toString()}`,
	);
}

/**
 * GET /billing/recharge/records
 * Get recharge records with pagination
 */
export async function getRechargeRecords(
	context: IRestApiContext,
	params: RechargeRecordsQueryParams,
): Promise<RechargeRecordsResponseDto> {
	const queryParams = new URLSearchParams();
	queryParams.append('workspaceId', params.workspaceId);

	if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
	if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

	return await makeRestApiRequest<RechargeRecordsResponseDto>(
		context,
		'GET',
		`/billing/recharge/records?${queryParams.toString()}`,
	);
}

/**
 * POST /billing/consume
 * Consume service (internal use)
 * This is typically called internally by the backend when a service is used
 */
export async function consumeService(
	context: IRestApiContext,
	params: ConsumeServiceParams,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'POST',
		`/billing/consume?workspaceId=${params.workspaceId}`,
		{
			serviceKey: params.serviceKey,
			amountCny: params.amountCny,
			tokensUsed: params.tokensUsed,
			queriesUsed: params.queriesUsed,
			metadata: params.metadata,
		},
	);
}
