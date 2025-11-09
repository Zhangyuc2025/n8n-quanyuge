import { AuthenticatedRequest, GLOBAL_ADMIN_ROLE } from '@n8n/db';
import { RestController, Get, Post, Patch, Delete, Param, Body, Query } from '@n8n/decorators';
import type { Response } from 'express';

import { PlatformNodeService, NodeType } from '@/services/platform-node.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Query DTOs for PlatformNodesController
 */
interface ListNodesQueryDto {
	category?: string;
	nodeType?: NodeType;
	enabled?: boolean;
	submissionStatus?: 'pending' | 'approved' | 'rejected';
}

interface SearchNodesQueryDto {
	q: string;
}

interface AdminListNodesQueryDto {
	category?: string;
	nodeType?: NodeType;
	enabled?: boolean;
	submissionStatus?: 'pending' | 'approved' | 'rejected';
	isActive?: boolean;
}

/**
 * PlatformNodesController
 *
 * 平台节点管理控制器
 *
 * 功能：
 * 1. 获取所有平台节点（支持筛选：category, nodeType）
 * 2. 获取节点详情
 * 3. 搜索节点
 * 4. 管理员端点：审核通过/拒绝第三方节点、启用/禁用节点
 *
 * 权限要求：
 * - 查看权限：所有登录用户
 * - 管理权限：global:admin
 */
@RestController('/platform-nodes')
export class PlatformNodesController {
	constructor(private readonly platformNodeService: PlatformNodeService) {}

	/**
	 * GET /platform-nodes
	 * 获取所有平台节点（支持筛选）
	 *
	 * @param query - 查询参数
	 * @returns 节点列表
	 */
	@Get('/')
	async getAllNodes(_req: AuthenticatedRequest, _res: Response, @Query query: ListNodesQueryDto) {
		const filters: {
			nodeType?: NodeType;
			category?: string;
			enabled?: boolean;
			isActive?: boolean;
		} = {};

		if (query.category) {
			filters.category = query.category;
		}

		if (query.nodeType) {
			filters.nodeType = query.nodeType;
		}

		if (query.enabled !== undefined) {
			filters.enabled = query.enabled;
		}

		// 普通用户只能看到激活且启用的节点
		filters.isActive = true;
		filters.enabled = true;

		return await this.platformNodeService.getAllNodes(filters);
	}

	/**
	 * GET /platform-nodes/search
	 * 搜索节点
	 *
	 * @param query - 搜索关键词
	 * @returns 匹配的节点列表
	 */
	@Get('/search')
	async searchNodes(_req: AuthenticatedRequest, _res: Response, @Query query: SearchNodesQueryDto) {
		if (!query.q) {
			throw new BadRequestError('Search query is required');
		}

		return await this.platformNodeService.searchNodes(query.q);
	}

	/**
	 * GET /platform-nodes/:nodeKey
	 * 获取节点详情
	 *
	 * @param nodeKey - 节点标识
	 * @returns 节点详情
	 */
	@Get('/:nodeKey')
	async getNode(_req: AuthenticatedRequest, _res: Response, @Param('nodeKey') nodeKey: string) {
		return await this.platformNodeService.getNodeByKey(nodeKey);
	}

	/**
	 * POST /platform-nodes/:nodeKey/approve
	 * 审核通过第三方节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param body - 审核备注
	 * @returns 成功标志
	 */
	@Post('/:nodeKey/approve')
	async approveNode(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeKey') nodeKey: string,
		@Body body: { reviewNotes?: string },
	) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can approve nodes');
		}

		await this.platformNodeService.reviewThirdPartyNode(
			nodeKey,
			req.user.id,
			true,
			body.reviewNotes,
		);

		return { success: true, message: `Node '${nodeKey}' approved successfully` };
	}

	/**
	 * POST /platform-nodes/:nodeKey/reject
	 * 拒绝第三方节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param body - 审核备注
	 * @returns 成功标志
	 */
	@Post('/:nodeKey/reject')
	async rejectNode(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeKey') nodeKey: string,
		@Body body: { reviewNotes?: string },
	) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can reject nodes');
		}

		await this.platformNodeService.reviewThirdPartyNode(
			nodeKey,
			req.user.id,
			false,
			body.reviewNotes,
		);

		return { success: true, message: `Node '${nodeKey}' rejected successfully` };
	}

	/**
	 * PATCH /platform-nodes/:nodeKey/toggle
	 * 启用/禁用节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param body - 启用/禁用标志
	 * @returns 成功标志
	 */
	@Patch('/:nodeKey/toggle')
	async toggleNode(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeKey') nodeKey: string,
		@Body body: { enabled: boolean },
	) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can toggle nodes');
		}

		await this.platformNodeService.toggleNode(nodeKey, body.enabled);

		return {
			success: true,
			message: `Node '${nodeKey}' ${body.enabled ? 'enabled' : 'disabled'} successfully`,
		};
	}

	/**
	 * GET /platform-nodes/categories/grouped
	 * 获取按分类分组的节点
	 *
	 * @returns 按分类分组的节点映射
	 */
	@Get('/categories/grouped')
	async getNodesByCategory(_req: AuthenticatedRequest, _res: Response) {
		return await this.platformNodeService.getNodesByCategory();
	}

	// ==================== 管理员端点 ====================

	/**
	 * GET /platform-nodes/admin/all
	 * 获取所有节点（管理员视图，包含未激活和待审核的）
	 *
	 * @param query - 查询参数
	 * @returns 节点列表
	 */
	@Get('/admin/all')
	async getAllNodesAdmin(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: AdminListNodesQueryDto,
	) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can view all nodes');
		}

		const filters: {
			nodeType?: NodeType;
			category?: string;
			enabled?: boolean;
			isActive?: boolean;
			submissionStatus?: 'pending' | 'approved' | 'rejected';
		} = {};

		if (query.category) {
			filters.category = query.category;
		}

		if (query.nodeType) {
			filters.nodeType = query.nodeType;
		}

		if (query.enabled !== undefined) {
			filters.enabled = query.enabled;
		}

		if (query.isActive !== undefined) {
			filters.isActive = query.isActive;
		}

		if (query.submissionStatus) {
			filters.submissionStatus = query.submissionStatus;
		}

		return await this.platformNodeService.getAllNodes(filters);
	}

	/**
	 * GET /platform-nodes/admin/submissions
	 * 获取待审核的节点提交列表（管理员功能）
	 *
	 * @returns 待审核节点列表
	 */
	@Get('/admin/submissions')
	async getSubmissions(req: AuthenticatedRequest, _res: Response) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can view submissions');
		}

		// Note: In the new architecture, we don't have pending submissions anymore
		// All nodes are either approved or rejected
		return await this.platformNodeService.getAllNodes();
	}

	/**
	 * POST /platform-nodes/admin/create
	 * 创建平台节点或第三方节点（管理员功能）
	 *
	 * @param body - 节点数据
	 * @returns 创建的节点
	 */
	@Post('/admin/create')
	async createPlatformNode(
		req: AuthenticatedRequest,
		_res: Response,
		@Body
		body: {
			nodeKey: string;
			nodeName: string;
			nodeType: NodeType;
			nodeDefinition: Record<string, unknown>;
			nodeCode?: string;
			configMode?: 'none' | 'user' | 'team';
			configSchema?: Record<string, unknown>;
			category?: string;
			description?: string;
			iconUrl?: string;
			version?: string;
		},
	) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can create platform nodes');
		}

		// 验证必需字段
		if (!body.nodeKey) {
			throw new BadRequestError('nodeKey is required');
		}

		if (!body.nodeName) {
			throw new BadRequestError('nodeName is required');
		}

		if (!body.nodeType) {
			throw new BadRequestError('nodeType is required');
		}

		if (!body.nodeDefinition) {
			throw new BadRequestError('nodeDefinition is required');
		}

		// 调用 service 创建节点
		// 注意：这里需要在 PlatformNodeService 中实现 createPlatformNode 方法
		// 暂时抛出未实现错误
		throw new BadRequestError('Platform node creation not yet implemented in PlatformNodeService');
	}

	/**
	 * DELETE /platform-nodes/admin/:nodeKey
	 * 删除平台节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @returns 成功标志
	 */
	@Delete('/admin/:nodeKey')
	async deletePlatformNode(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeKey') _nodeKey: string,
	) {
		// 检查管理员权限
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can delete platform nodes');
		}

		// 调用 service 删除节点
		// 注意：这里需要在 PlatformNodeService 中实现 deleteNode 方法
		// 暂时抛出未实现错误
		throw new BadRequestError('Platform node deletion not yet implemented in PlatformNodeService');
	}
}
