import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Query } from '@n8n/decorators';
import type { Response } from 'express';

import { PlatformNodeService } from '@/services/platform-node.service';
import { CustomNodeService } from '@/services/custom-node.service';
import { UserNodeConfigService } from '@/services/user-node-config.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Query DTOs for AvailableNodesController
 */
interface WorkspaceQueryDto {
	workspaceId: string;
}

/**
 * AvailableNodesController
 *
 * 可用节点列表控制器
 *
 * 功能：
 * 1. 获取当前工作空间可用的所有节点（平台节点 + 自定义节点）
 * 2. 标注每个节点的配置状态
 * 3. 按分类分组返回
 *
 * 权限要求：
 * - 所有接口都需要用户登录
 * - 需要提供 workspaceId
 *
 * 设计说明：
 * 此controller替代了旧的 PluginsController 中的 GET /plugins/available 端点
 * 整合了平台节点和自定义节点，提供统一的可用节点视图
 */
@RestController('/available-nodes')
export class AvailableNodesController {
	constructor(
		private readonly platformNodeService: PlatformNodeService,
		private readonly customNodeService: CustomNodeService,
		private readonly userNodeConfigService: UserNodeConfigService,
	) {}

	/**
	 * GET /available-nodes
	 * 获取当前工作空间可用的所有节点
	 *
	 * 返回：
	 * - 平台节点（全局可见，已启用）
	 * - 当前工作空间的自定义节点
	 * - 每个节点的配置状态（是否已配置）
	 *
	 * @param query - 查询参数
	 * @returns 可用节点列表
	 */
	@Get('/')
	async getAvailableNodes(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		// 1. 获取平台节点（全局可见，已启用）
		const platformNodes = await this.platformNodeService.getAllNodes({
			enabled: true,
			isActive: true,
		});

		// 2. 获取当前工作空间的自定义节点
		const customNodes = await this.customNodeService.getWorkspaceNodes(workspaceId);

		// 3. 合并所有节点
		const allNodes = [
			...platformNodes.map((node) => ({
				nodeKey: node.nodeKey,
				nodeName: node.nodeName,
				nodeType: node.nodeType,
				category: node.category,
				description: node.description,
				iconUrl: node.iconUrl,
				version: node.version,
				source: 'platform' as const,
				// Platform nodes don't have configMode in the entity
				// We'll determine it based on whether it's billable or needs user config
				needsConfig: node.isBillable || false,
			})),
			...customNodes.map((node) => ({
				nodeKey: node.nodeKey,
				nodeName: node.nodeName,
				nodeType: 'custom' as const,
				category: node.category,
				description: node.description,
				iconUrl: node.iconUrl,
				version: node.version,
				source: 'custom' as const,
				needsConfig: true, // Custom nodes always need config
			})),
		];

		// 4. 获取用户的配置状态
		const configStatusPromises = allNodes.map(async (node) => {
			// 检查节点是否需要配置
			if (!node.needsConfig) {
				return { nodeKey: node.nodeKey, isConfigured: true };
			}

			// 检查用户是否已配置
			const isConfigured = await this.userNodeConfigService.isNodeConfigured(
				req.user.id,
				node.nodeKey,
				workspaceId,
			);

			return { nodeKey: node.nodeKey, isConfigured };
		});

		const configStatuses = await Promise.all(configStatusPromises);
		const configStatusMap = new Map(configStatuses.map((s) => [s.nodeKey, s.isConfigured]));

		// 5. 标注配置状态
		const nodesWithStatus = allNodes.map((node) => ({
			...node,
			isConfigured: configStatusMap.get(node.nodeKey) ?? false,
		}));

		return nodesWithStatus;
	}

	/**
	 * GET /available-nodes/by-category
	 * 获取按分类分组的可用节点
	 *
	 * @param query - 查询参数
	 * @returns 按分类分组的节点映射
	 */
	@Get('/by-category')
	async getNodesByCategory(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		// 获取所有可用节点
		const nodes = await this.getAvailableNodes(req, _res, query);

		// 按分类分组
		const nodesByCategory = nodes.reduce(
			(acc, node) => {
				const category = node.category || 'uncategorized';
				if (!acc[category]) {
					acc[category] = [];
				}
				acc[category].push(node);
				return acc;
			},
			{} as Record<string, typeof nodes>,
		);

		return nodesByCategory;
	}

	/**
	 * GET /available-nodes/unconfigured
	 * 获取需要配置但尚未配置的节点列表
	 *
	 * @param query - 查询参数
	 * @returns 未配置节点列表
	 */
	@Get('/unconfigured')
	async getUnconfiguredNodes(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		// 获取所有可用节点
		const nodes = await this.getAvailableNodes(req, _res, query);

		// 筛选出需要配置但尚未配置的节点
		const unconfiguredNodes = nodes.filter((node) => node.needsConfig && !node.isConfigured);

		return unconfiguredNodes;
	}

	/**
	 * GET /available-nodes/stats
	 * 获取节点统计信息
	 *
	 * @param query - 查询参数
	 * @returns 节点统计
	 */
	@Get('/stats')
	async getStats(req: AuthenticatedRequest, _res: Response, @Query query: WorkspaceQueryDto) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		// 获取所有可用节点
		const nodes = await this.getAvailableNodes(req, _res, query);

		// 统计信息
		const stats = {
			total: nodes.length,
			platform: nodes.filter((n) => n.source === 'platform').length,
			custom: nodes.filter((n) => n.source === 'custom').length,
			configured: nodes.filter((n) => n.isConfigured).length,
			needsConfig: nodes.filter((n) => n.needsConfig && !n.isConfigured).length,
			byCategory: {} as Record<string, number>,
		};

		// 按分类统计
		nodes.forEach((node) => {
			const category = node.category || 'uncategorized';
			stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
		});

		return stats;
	}
}
