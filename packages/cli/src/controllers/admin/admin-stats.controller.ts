import {
	UsageRecordRepository,
	WorkspaceBalanceRepository,
	ProjectRepository,
	UserRepository,
	AuthenticatedRequest,
} from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { assertPlatformAdmin } from '@/auth/platform-admin.guard';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Query DTOs for AdminStatsController
 */
class DateRangeQueryDto {
	startDate?: string; // ISO 8601 格式日期字符串
	endDate?: string; // ISO 8601 格式日期字符串
}

class TopServicesQueryDto extends DateRangeQueryDto {
	limit?: number; // 返回的服务数量，默认 10
}

class ActiveWorkspacesQueryDto extends DateRangeQueryDto {
	limit?: number; // 返回的工作空间数量，默认 10
}

/**
 * AdminStatsController
 *
 * 管理员统计数据控制器
 *
 * 功能：
 * 1. 平台概览统计（总工作空间数、总用户数、总余额、今日消费）
 * 2. 热门服务排行（按调用次数和营收）
 * 3. 营收统计（按日期范围）
 * 4. 活跃工作空间排行（按消费金额）
 *
 * 权限要求：
 * - 所有接口都需要 global:admin 权限
 */
@RestController('/admin/stats')
export class AdminStatsController {
	constructor(
		private readonly usageRecordRepository: UsageRecordRepository,
		private readonly workspaceBalanceRepository: WorkspaceBalanceRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * 验证管理员权限
	 * @param req - 认证请求
	 * @throws ForbiddenError 如果不是管理员
	 */
	private checkAdminPermission(req: AuthenticatedRequest): void {
		assertPlatformAdmin(req.user);
	}

	/**
	 * 解析日期字符串，返回 Date 对象
	 * @param dateStr - ISO 8601 日期字符串
	 * @returns Date 对象
	 * @throws BadRequestError 如果日期格式无效
	 */
	private parseDate(dateStr: string): Date {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) {
			throw new BadRequestError(`无效的日期格式: ${dateStr}`);
		}
		return date;
	}

	/**
	 * GET /admin/stats/overview
	 * 获取平台概览统计
	 *
	 * 返回数据：
	 * - totalWorkspaces: 总工作空间数
	 * - totalUsers: 总用户数
	 * - totalBalance: 所有工作空间余额总和（CNY）
	 * - todayRevenue: 今日消费总额（CNY）
	 * - activeWorkspaces: 有消费记录的工作空间数
	 * - totalRevenue: 平台累计总营收（CNY）
	 *
	 * @param req - 认证请求
	 * @returns 平台概览数据
	 */
	@Get('/overview')
	async getOverview(req: AuthenticatedRequest, _res: Response) {
		this.checkAdminPermission(req);

		// 获取总工作空间数（排除 personal 类型）
		const totalWorkspaces = await this.projectRepository.count({
			where: { type: 'team' },
		});

		// 获取总用户数
		const totalUsers = await this.userRepository.count();

		// 获取所有工作空间余额总和
		const balanceResult = await this.workspaceBalanceRepository
			.createQueryBuilder('balance')
			.select('SUM(balance.balanceCny)', 'total')
			.getRawOne<{ total: string | null }>();

		const totalBalance = balanceResult?.total ? parseFloat(balanceResult.total) : 0;

		// 获取今日消费总额
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const todayRevenueResult = await this.usageRecordRepository
			.createQueryBuilder('record')
			.select('SUM(record.amountCny)', 'revenue')
			.where('record.createdAt >= :today', { today })
			.andWhere('record.createdAt < :tomorrow', { tomorrow })
			.getRawOne<{ revenue: string | null }>();

		const todayRevenue = todayRevenueResult?.revenue ? parseFloat(todayRevenueResult.revenue) : 0;

		// 获取有消费记录的工作空间数（去重）
		const activeWorkspacesResult = await this.usageRecordRepository
			.createQueryBuilder('record')
			.select('COUNT(DISTINCT record.workspaceId)', 'count')
			.getRawOne<{ count: string }>();

		const activeWorkspaces = activeWorkspacesResult?.count
			? parseInt(activeWorkspacesResult.count, 10)
			: 0;

		// 获取平台累计总营收
		const totalRevenueResult = await this.usageRecordRepository
			.createQueryBuilder('record')
			.select('SUM(record.amountCny)', 'revenue')
			.getRawOne<{ revenue: string | null }>();

		const totalRevenue = totalRevenueResult?.revenue ? parseFloat(totalRevenueResult.revenue) : 0;

		return {
			totalWorkspaces,
			totalUsers,
			totalBalance,
			todayRevenue,
			activeWorkspaces,
			totalRevenue,
		};
	}

	/**
	 * GET /admin/stats/popular-services
	 * 获取热门服务排行
	 *
	 * 返回数据：按调用次数和营收排序的服务列表
	 * 每个服务包含：
	 * - serviceKey: 服务标识
	 * - serviceType: 服务类型
	 * - calls: 总调用次数
	 * - revenue: 总营收（CNY）
	 * - avgRevenuePerCall: 平均每次调用营收（CNY）
	 *
	 * @param req - 认证请求
	 * @param query - 查询参数（startDate, endDate, limit）
	 * @returns 热门服务列表
	 */
	@Get('/popular-services')
	async getPopularServices(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: TopServicesQueryDto,
	) {
		this.checkAdminPermission(req);

		const limit = query.limit ?? 10;

		// 构建查询
		let queryBuilder = this.usageRecordRepository
			.createQueryBuilder('record')
			.select('record.serviceKey', 'serviceKey')
			.addSelect('record.serviceType', 'serviceType')
			.addSelect('SUM(record.callsCount)', 'calls')
			.addSelect('SUM(record.amountCny)', 'revenue')
			.addSelect('SUM(record.amountCny) / SUM(record.callsCount)', 'avgRevenuePerCall')
			.groupBy('record.serviceKey')
			.addGroupBy('record.serviceType')
			.orderBy('calls', 'DESC')
			.limit(limit);

		// 添加日期范围过滤
		if (query.startDate && query.endDate) {
			const startDate = this.parseDate(query.startDate);
			const endDate = this.parseDate(query.endDate);
			queryBuilder = queryBuilder
				.where('record.createdAt >= :startDate', { startDate })
				.andWhere('record.createdAt <= :endDate', { endDate });
		}

		const results = await queryBuilder.getRawMany<{
			serviceKey: string;
			serviceType: string;
			calls: string;
			revenue: string;
			avgRevenuePerCall: string;
		}>();

		return results.map((r) => ({
			serviceKey: r.serviceKey,
			serviceType: r.serviceType,
			calls: parseInt(r.calls, 10),
			revenue: parseFloat(r.revenue),
			avgRevenuePerCall: parseFloat(r.avgRevenuePerCall),
		}));
	}

	/**
	 * GET /admin/stats/revenue
	 * 获取营收统计（按日期范围）
	 *
	 * 返回数据：
	 * - totalRevenue: 总营收（CNY）
	 * - totalCalls: 总调用次数
	 * - totalTokens: 总 token 消耗（仅 LLM 服务）
	 * - avgRevenuePerCall: 平均每次调用营收（CNY）
	 * - avgRevenuePerDay: 平均每日营收（CNY）
	 * - dateRange: 日期范围
	 *
	 * @param req - 认证请求
	 * @param query - 查询参数（startDate, endDate）
	 * @returns 营收统计数据
	 */
	@Get('/revenue')
	async getRevenue(req: AuthenticatedRequest, _res: Response, @Query query: DateRangeQueryDto) {
		this.checkAdminPermission(req);

		if (!query.startDate || !query.endDate) {
			throw new BadRequestError('必须提供 startDate 和 endDate 参数');
		}

		const startDate = this.parseDate(query.startDate);
		const endDate = this.parseDate(query.endDate);

		// 获取营收统计
		const result = await this.usageRecordRepository
			.createQueryBuilder('record')
			.select('SUM(record.amountCny)', 'totalRevenue')
			.addSelect('SUM(record.callsCount)', 'totalCalls')
			.addSelect('SUM(record.tokensUsed)', 'totalTokens')
			.where('record.createdAt >= :startDate', { startDate })
			.andWhere('record.createdAt <= :endDate', { endDate })
			.getRawOne<{
				totalRevenue: string | null;
				totalCalls: string | null;
				totalTokens: string | null;
			}>();

		const totalRevenue = result?.totalRevenue ? parseFloat(result.totalRevenue) : 0;
		const totalCalls = result?.totalCalls ? parseInt(result.totalCalls, 10) : 0;
		const totalTokens = result?.totalTokens ? parseInt(result.totalTokens, 10) : 0;

		// 计算日期范围（天数）
		const daysDiff =
			Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

		return {
			totalRevenue,
			totalCalls,
			totalTokens,
			avgRevenuePerCall: totalCalls > 0 ? totalRevenue / totalCalls : 0,
			avgRevenuePerDay: daysDiff > 0 ? totalRevenue / daysDiff : 0,
			dateRange: {
				startDate: query.startDate,
				endDate: query.endDate,
				days: daysDiff,
			},
		};
	}

	/**
	 * GET /admin/stats/active-workspaces
	 * 获取活跃工作空间排行（按消费金额）
	 *
	 * 返回数据：按消费金额排序的工作空间列表
	 * 每个工作空间包含：
	 * - workspaceId: 工作空间 ID
	 * - workspaceName: 工作空间名称
	 * - totalSpent: 总消费金额（CNY）
	 * - currentBalance: 当前余额（CNY）
	 * - totalCalls: 总调用次数
	 * - avgSpentPerCall: 平均每次调用消费（CNY）
	 *
	 * @param req - 认证请求
	 * @param query - 查询参数（startDate, endDate, limit）
	 * @returns 活跃工作空间列表
	 */
	@Get('/active-workspaces')
	async getActiveWorkspaces(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ActiveWorkspacesQueryDto,
	) {
		this.checkAdminPermission(req);

		const limit = query.limit ?? 10;

		// 构建查询
		let queryBuilder = this.usageRecordRepository
			.createQueryBuilder('record')
			.select('record.workspaceId', 'workspaceId')
			.addSelect('SUM(record.amountCny)', 'totalSpent')
			.addSelect('SUM(record.callsCount)', 'totalCalls')
			.addSelect('SUM(record.amountCny) / SUM(record.callsCount)', 'avgSpentPerCall')
			.groupBy('record.workspaceId')
			.orderBy('totalSpent', 'DESC')
			.limit(limit);

		// 添加日期范围过滤
		if (query.startDate && query.endDate) {
			const startDate = this.parseDate(query.startDate);
			const endDate = this.parseDate(query.endDate);
			queryBuilder = queryBuilder
				.where('record.createdAt >= :startDate', { startDate })
				.andWhere('record.createdAt <= :endDate', { endDate });
		}

		const results = await queryBuilder.getRawMany<{
			workspaceId: string;
			totalSpent: string;
			totalCalls: string;
			avgSpentPerCall: string;
		}>();

		// 获取工作空间名称和余额
		const workspaceIds = results.map((r) => r.workspaceId);
		const workspaces = await this.projectRepository.findByIds(workspaceIds);
		const balances = await this.workspaceBalanceRepository.findByIds(workspaceIds);

		const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));
		const balanceMap = new Map(balances.map((b) => [b.workspaceId, b]));

		return results.map((r) => {
			const workspace = workspaceMap.get(r.workspaceId);
			const balance = balanceMap.get(r.workspaceId);

			return {
				workspaceId: r.workspaceId,
				workspaceName: workspace?.name ?? '未知工作空间',
				totalSpent: parseFloat(r.totalSpent),
				currentBalance: balance?.balanceCny ?? 0,
				totalCalls: parseInt(r.totalCalls, 10),
				avgSpentPerCall: parseFloat(r.avgSpentPerCall),
			};
		});
	}
}
