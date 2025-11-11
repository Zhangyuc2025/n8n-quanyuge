import {
	ProjectRepository,
	WorkspaceBalanceRepository,
	RechargeRecordRepository,
	AuthenticatedRequest,
} from '@n8n/db';
import { Body, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { Like } from '@n8n/typeorm';
import type { Response } from 'express';

import { assertPlatformAdmin } from '@/auth/platform-admin.guard';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { BillingService } from '@/services/billing.service';
import { WorkspaceContextService } from '@/services/workspace-context.service';

/**
 * Query DTOs for AdminWorkspacesController
 */

/**
 * 工作空间列表查询参数
 */
class ListWorkspacesQueryDto {
	/** 页码（从1开始） */
	page?: number;
	/** 每页数量 */
	limit?: number;
	/** 搜索关键词（匹配工作空间名称） */
	search?: string;
	/** 排序字段 */
	sortBy?: 'name' | 'createdAt' | 'balance';
	/** 排序方向 */
	sortOrder?: 'ASC' | 'DESC';
}

/**
 * 工作空间状态更新参数
 */
class UpdateWorkspaceStatusDto {
	/** 工作空间状态：active-活跃, suspended-暂停 */
	status: 'active' | 'suspended';
	/** 暂停/恢复原因 */
	reason?: string;
}

/**
 * 管理员充值参数
 */
class AdminRechargeDto {
	/** 充值金额（CNY，必须为正数） */
	amount: number;
	/** 充值原因/备注 */
	reason?: string;
}

/**
 * 使用记录查询参数
 */
class UsageQueryDto {
	/** 开始日期（ISO 8601格式） */
	startDate?: string;
	/** 结束日期（ISO 8601格式） */
	endDate?: string;
	/** 页码（从1开始） */
	page?: number;
	/** 每页数量 */
	limit?: number;
}

/**
 * AdminWorkspacesController
 *
 * 后台管理 - 工作空间管理控制器
 *
 * 功能：
 * 1. 查询所有工作空间（支持分页、搜索）
 * 2. 查看工作空间详情（含余额、成员）
 * 3. 管理员给工作空间充值
 * 4. 暂停/恢复工作空间
 * 5. 查看工作空间消费记录
 *
 * 权限要求：
 * - 所有接口都需要管理员权限（global:admin）
 */
@RestController('/admin/workspaces')
export class AdminWorkspacesController {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly workspaceBalanceRepository: WorkspaceBalanceRepository,
		private readonly rechargeRecordRepository: RechargeRecordRepository,
		private readonly billingService: BillingService,
		private readonly workspaceContextService: WorkspaceContextService,
	) {}

	/**
	 * 验证管理员权限
	 *
	 * @param req - 认证请求对象
	 * @throws {ForbiddenError} 当用户不是管理员时
	 */
	private verifyAdminAccess(req: AuthenticatedRequest): void {
		assertPlatformAdmin(req.user);
	}

	/**
	 * GET /admin/workspaces
	 * 获取所有工作空间列表（分页、搜索）
	 *
	 * 支持的查询功能：
	 * - 分页（page, limit）
	 * - 按名称搜索（search）
	 * - 按字段排序（sortBy, sortOrder）
	 *
	 * @param req - 认证请求
	 * @param _res - 响应对象
	 * @param query - 查询参数
	 * @returns 工作空间列表及分页信息
	 */
	@Get('/')
	async listWorkspaces(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkspacesQueryDto,
	) {
		// 验证管理员权限
		this.verifyAdminAccess(req);

		// 解析分页参数
		const page = Math.max(1, query.page ?? 1);
		const limit = Math.min(100, Math.max(1, query.limit ?? 20));
		const skip = (page - 1) * limit;

		// 构建查询条件
		const where: Record<string, unknown> = { type: 'team' };

		// 按名称搜索
		if (query.search) {
			where.name = Like(`%${query.search}%`);
		}

		// 排序配置
		const sortBy = query.sortBy ?? 'createdAt';
		const sortOrder = query.sortOrder ?? 'DESC';

		// 查询工作空间（仅查询 type='team' 的项目）
		const [workspaces, total] = await this.projectRepository.findAndCount({
			where,
			order: sortBy === 'balance' ? undefined : { [sortBy]: sortOrder },
			skip,
			take: limit,
			relations: ['projectRelations', 'projectRelations.user'],
		});

		// 获取每个工作空间的余额信息
		const workspacesWithBalance = await Promise.all(
			workspaces.map(async (workspace) => {
				const balance = await this.workspaceBalanceRepository.getBalance(workspace.id);
				const memberCount = workspace.projectRelations.length;

				return {
					id: workspace.id,
					name: workspace.name,
					type: workspace.type,
					createdAt: workspace.createdAt,
					updatedAt: workspace.updatedAt,
					balance: balance?.balanceCny ?? 0,
					currency: balance?.currency ?? 'CNY',
					lowBalanceThreshold: balance?.lowBalanceThresholdCny ?? 10.0,
					isLowBalance: balance ? balance.balanceCny < balance.lowBalanceThresholdCny : false,
					memberCount,
					// 状态信息（可以从 workspace 的其他字段获取，这里暂时简化）
					status: 'active' as const,
				};
			}),
		);

		// 如果按余额排序，在内存中排序
		if (sortBy === 'balance') {
			workspacesWithBalance.sort((a, b) => {
				const diff = a.balance - b.balance;
				return sortOrder === 'ASC' ? diff : -diff;
			});
		}

		return {
			workspaces: workspacesWithBalance,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * GET /admin/workspaces/:id
	 * 获取工作空间详情（含余额、成员列表）
	 *
	 * 返回信息：
	 * - 工作空间基本信息
	 * - 余额详情
	 * - 成员列表
	 * - 最近充值记录（最多5条）
	 *
	 * @param req - 认证请求
	 * @param _res - 响应对象
	 * @param workspaceId - 工作空间ID
	 * @returns 工作空间完整信息
	 */
	@Get('/:id')
	async getWorkspaceDetails(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') workspaceId: string,
	) {
		// 验证管理员权限
		this.verifyAdminAccess(req);

		// 获取工作空间（验证是否为 team 类型）
		const workspace = await this.workspaceContextService.getWorkspaceByProjectId(workspaceId);

		// 获取余额信息
		const balance = await this.workspaceBalanceRepository.getBalance(workspaceId);

		// 获取成员列表
		const members = await this.workspaceContextService.getWorkspaceMembers(workspaceId);

		// 获取最近的充值记录（最多5条）
		const rechargeRecords = await this.rechargeRecordRepository.find({
			where: { workspaceId },
			order: { createdAt: 'DESC' },
			take: 5,
		});

		return {
			workspace: {
				id: workspace.id,
				name: workspace.name,
				type: workspace.type,
				createdAt: workspace.createdAt,
				updatedAt: workspace.updatedAt,
			},
			balance: {
				current: balance?.balanceCny ?? 0,
				currency: balance?.currency ?? 'CNY',
				lowBalanceThreshold: balance?.lowBalanceThresholdCny ?? 10.0,
				isLowBalance: balance ? balance.balanceCny < balance.lowBalanceThresholdCny : false,
			},
			members: members.map((member) => ({
				id: member.id,
				email: member.email,
				firstName: member.firstName,
				lastName: member.lastName,
				role: member.role?.displayName,
			})),
			recentRecharges: rechargeRecords.map((record) => ({
				id: record.id,
				amount: record.amountCny,
				paymentMethod: record.paymentMethod,
				status: record.status,
				createdAt: record.createdAt,
				completedAt: record.completedAt,
			})),
		};
	}

	/**
	 * POST /admin/workspaces/:id/recharge
	 * 管理员给工作空间充值
	 *
	 * 管理员充值特点：
	 * - paymentMethod 设为 'admin_recharge'（管理员充值标记）
	 * - 自动完成充值（无需第三方支付）
	 * - 记录充值原因
	 *
	 * @param req - 认证请求
	 * @param _res - 响应对象
	 * @param workspaceId - 工作空间ID
	 * @param data - 充值数据
	 * @returns 充值结果及新余额
	 */
	@Post('/:id/recharge')
	async rechargeWorkspace(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') workspaceId: string,
		@Body data: AdminRechargeDto,
	) {
		// 验证管理员权限
		this.verifyAdminAccess(req);

		// 验证充值金额
		if (!data.amount || data.amount <= 0) {
			throw new BadRequestError('充值金额必须大于0');
		}

		// 验证工作空间存在
		await this.workspaceContextService.getWorkspaceByProjectId(workspaceId);

		// 执行充值
		// transactionId 使用格式: admin_recharge_{adminUserId}_{timestamp}
		const transactionId = `admin_recharge_${req.user.id}_${Date.now()}`;

		await this.billingService.recharge(
			workspaceId,
			data.amount,
			'admin_recharge', // 标记为管理员充值
			transactionId,
		);

		// 获取充值后的新余额
		const newBalance = await this.billingService.getBalance(workspaceId);

		return {
			success: true,
			message: '充值成功',
			workspaceId,
			amount: data.amount,
			newBalance,
			rechargedBy: req.user.id,
			reason: data.reason,
			transactionId,
		};
	}

	/**
	 * PATCH /admin/workspaces/:id/status
	 * 暂停/恢复工作空间
	 *
	 * 注意：
	 * - 此接口目前是占位实现
	 * - 实际暂停逻辑需要在工作流执行引擎中实现
	 * - 可能需要在 Project 实体中添加 status 字段
	 *
	 * @param req - 认证请求
	 * @param _res - 响应对象
	 * @param workspaceId - 工作空间ID
	 * @param data - 状态更新数据
	 * @returns 更新结果
	 */
	@Patch('/:id/status')
	async updateWorkspaceStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') workspaceId: string,
		@Body data: UpdateWorkspaceStatusDto,
	) {
		// 验证管理员权限
		this.verifyAdminAccess(req);

		// 验证工作空间存在
		const workspace = await this.workspaceContextService.getWorkspaceByProjectId(workspaceId);

		// TODO: 实现实际的暂停/恢复逻辑
		// 这可能需要：
		// 1. 在 Project 实体中添加 status 字段
		// 2. 在工作流执行前检查工作空间状态
		// 3. 暂停所有正在运行的工作流
		//
		// 目前这是一个占位实现，仅返回成功消息

		return {
			success: true,
			message: `工作空间已${data.status === 'suspended' ? '暂停' : '恢复'}`,
			workspaceId: workspace.id,
			workspaceName: workspace.name,
			status: data.status,
			reason: data.reason,
			updatedBy: req.user.id,
			updatedAt: new Date(),
			// TODO: 实际实现后，这里应该返回更新后的工作空间状态
		};
	}

	/**
	 * GET /admin/workspaces/:id/usage
	 * 获取工作空间消费记录
	 *
	 * 支持的查询功能：
	 * - 按日期范围查询（startDate, endDate）
	 * - 分页（page, limit）
	 *
	 * @param req - 认证请求
	 * @param _res - 响应对象
	 * @param workspaceId - 工作空间ID
	 * @param query - 查询参数
	 * @returns 消费记录列表及统计信息
	 */
	@Get('/:id/usage')
	async getWorkspaceUsage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') workspaceId: string,
		@Query query: UsageQueryDto,
	) {
		// 验证管理员权限
		this.verifyAdminAccess(req);

		// 验证工作空间存在
		await this.workspaceContextService.getWorkspaceByProjectId(workspaceId);

		// 解析日期参数
		const startDate = query.startDate ? new Date(query.startDate) : undefined;
		const endDate = query.endDate ? new Date(query.endDate) : undefined;

		// 验证日期格式
		if (
			(startDate && Number.isNaN(startDate.getTime())) ||
			(endDate && Number.isNaN(endDate.getTime()))
		) {
			throw new BadRequestError('日期格式无效，请使用 ISO 8601 格式');
		}

		// 查询使用记录
		const usageRecords = await this.billingService.getUsageHistory(workspaceId, startDate, endDate);

		// 计算统计信息（如果提供了日期范围）
		let stats = null;
		if (startDate && endDate) {
			stats = await this.billingService.getUsageStats(workspaceId, startDate, endDate);
		}

		// 分页处理
		const page = Math.max(1, query.page ?? 1);
		const limit = Math.min(100, Math.max(1, query.limit ?? 20));
		const skip = (page - 1) * limit;

		const paginatedRecords = usageRecords.slice(skip, skip + limit);
		const total = usageRecords.length;

		return {
			workspaceId,
			records: paginatedRecords,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
			stats: stats ?? null,
			dateRange: {
				startDate: startDate?.toISOString() ?? null,
				endDate: endDate?.toISOString() ?? null,
			},
		};
	}

	/**
	 * GET /admin/workspaces/:id/recharges
	 * 获取工作空间充值记录
	 *
	 * @param req - 认证请求
	 * @param _res - 响应对象
	 * @param workspaceId - 工作空间ID
	 * @returns 充值记录列表
	 */
	@Get('/:id/recharges')
	async getWorkspaceRecharges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') workspaceId: string,
	) {
		// 验证管理员权限
		this.verifyAdminAccess(req);

		// 验证工作空间存在
		await this.workspaceContextService.getWorkspaceByProjectId(workspaceId);

		// 查询充值记录
		const rechargeRecords = await this.rechargeRecordRepository.findByWorkspace(workspaceId);

		return {
			workspaceId,
			records: rechargeRecords.map((record) => ({
				id: record.id,
				amount: record.amountCny,
				paymentMethod: record.paymentMethod,
				transactionId: record.transactionId,
				status: record.status,
				createdAt: record.createdAt,
				completedAt: record.completedAt,
				// 标识是否为管理员充值
				isAdminRecharge: record.paymentMethod === 'admin_recharge',
			})),
			total: rechargeRecords.length,
		};
	}
}
