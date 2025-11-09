import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Put, Delete, Param, Body, Query } from '@n8n/decorators';
import type { Response } from 'express';

import { CustomNodeService, ConfigMode } from '@/services/custom-node.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Query DTOs for CustomNodesController
 */
interface WorkspaceQueryDto {
	workspaceId: string;
}

/**
 * Request DTOs for CustomNodesController
 */
interface CreateCustomNodeDto {
	workspaceId: string;
	nodeKey: string;
	nodeName: string;
	nodeDefinition: Record<string, unknown>;
	nodeCode: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
}

interface UpdateCustomNodeDto {
	nodeName?: string;
	nodeDefinition?: Record<string, unknown>;
	nodeCode?: string;
	configMode?: ConfigMode;
	configSchema?: Record<string, unknown>;
	category?: string;
	description?: string;
	iconUrl?: string;
	version?: string;
}

interface SharedConfigDto {
	configData: Record<string, unknown>;
}

/**
 * CustomNodesController
 *
 * 自定义节点管理控制器
 *
 * 功能：
 * 1. 获取当前工作空间的自定义节点列表
 * 2. 获取节点详情
 * 3. 上传新的自定义节点
 * 4. 更新自定义节点
 * 5. 删除自定义节点
 * 6. 提交审核
 * 7. 配置团队共享配置
 *
 * 权限要求：
 * - 查看权限：工作空间 viewer 及以上
 * - 上传/删除权限：工作空间 admin
 */
@RestController('/custom-nodes')
export class CustomNodesController {
	constructor(private readonly customNodeService: CustomNodeService) {}

	/**
	 * GET /custom-nodes
	 * 获取当前工作空间的自定义节点列表
	 *
	 * @param query - 查询参数
	 * @returns 自定义节点列表
	 */
	@Get('/')
	async getCustomNodes(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		return await this.customNodeService.getWorkspaceNodes(query.workspaceId);
	}

	/**
	 * GET /custom-nodes/:nodeKey
	 * 获取节点详情（通过 nodeKey）
	 *
	 * @param nodeKey - 节点标识
	 * @param query - 查询参数
	 * @returns 节点详情
	 */
	@Get('/:nodeKey')
	async getNode(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeKey') nodeKey: string,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		return await this.customNodeService.getNodeByKey(query.workspaceId, nodeKey);
	}

	/**
	 * POST /custom-nodes
	 * 上传新的自定义节点
	 *
	 * @param body - 节点数据
	 * @returns 创建的节点
	 */
	@Post('/')
	async createNode(req: AuthenticatedRequest, _res: Response, @Body body: CreateCustomNodeDto) {
		// 验证必需字段
		if (!body.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		if (!body.nodeKey) {
			throw new BadRequestError('nodeKey is required');
		}

		if (!body.nodeName) {
			throw new BadRequestError('nodeName is required');
		}

		if (!body.nodeDefinition) {
			throw new BadRequestError('nodeDefinition is required');
		}

		if (!body.nodeCode) {
			throw new BadRequestError('nodeCode is required');
		}

		// TODO: 这里应该添加代码验证逻辑，确保 nodeCode 安全

		return await this.customNodeService.createNode({
			workspaceId: body.workspaceId,
			userId: req.user.id,
			nodeKey: body.nodeKey,
			nodeName: body.nodeName,
			nodeDefinition: body.nodeDefinition,
			nodeCode: body.nodeCode,
			configMode: body.configMode,
			configSchema: body.configSchema,
			category: body.category,
			description: body.description,
			iconUrl: body.iconUrl,
			version: body.version,
		});
	}

	/**
	 * PUT /custom-nodes/:id
	 * 更新自定义节点
	 *
	 * @param id - 节点 ID
	 * @param body - 更新数据
	 * @param query - 查询参数
	 * @returns 成功标志
	 */
	@Put('/:id')
	async updateNode(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body body: UpdateCustomNodeDto,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		await this.customNodeService.updateNode(id, query.workspaceId, body);

		return { success: true };
	}

	/**
	 * DELETE /custom-nodes/:id
	 * 删除自定义节点
	 *
	 * @param id - 节点 ID
	 * @param query - 查询参数
	 * @returns 成功标志
	 */
	@Delete('/:id')
	async deleteNode(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		await this.customNodeService.deleteNode(id, query.workspaceId);

		return { success: true };
	}

	/**
	 * POST /custom-nodes/:id/submit
	 * 提交审核
	 *
	 * @param id - 节点 ID
	 * @param query - 查询参数
	 * @returns 成功标志
	 */
	@Post('/:id/submit')
	async submitForReview(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		await this.customNodeService.submitForReview(id, query.workspaceId);

		return { success: true, message: 'Node submitted for review successfully' };
	}

	/**
	 * PUT /custom-nodes/:id/shared-config
	 * 配置团队共享配置
	 *
	 * @param id - 节点 ID
	 * @param body - 配置数据
	 * @param query - 查询参数
	 * @returns 成功标志
	 */
	@Put('/:id/shared-config')
	async setSharedConfig(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body body: SharedConfigDto,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		if (!body.configData) {
			throw new BadRequestError('configData is required');
		}

		await this.customNodeService.setSharedConfig(
			id,
			query.workspaceId,
			req.user.id,
			body.configData,
		);

		return { success: true, message: 'Shared configuration updated successfully' };
	}

	/**
	 * GET /custom-nodes/:id/shared-config
	 * 获取团队共享配置
	 *
	 * @param id - 节点 ID
	 * @param query - 查询参数
	 * @returns 配置数据
	 */
	@Get('/:id/shared-config')
	async getSharedConfig(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		const config = await this.customNodeService.getSharedConfig(id, query.workspaceId);

		return config;
	}

	/**
	 * POST /custom-nodes/:id/toggle
	 * 启用/禁用节点
	 *
	 * @param id - 节点 ID
	 * @param body - 启用/禁用标志
	 * @param query - 查询参数
	 * @returns 成功标志
	 */
	@Post('/:id/toggle')
	async toggleNode(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body body: { isActive: boolean },
		@Query query: WorkspaceQueryDto,
	) {
		if (!query.workspaceId) {
			throw new BadRequestError('workspaceId is required');
		}

		await this.customNodeService.toggleNode(id, query.workspaceId, body.isActive);

		return { success: true };
	}
}
