import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Delete, Param, Body } from '@n8n/decorators';
import type { Response } from 'express';

import { UserNodeConfigService } from '@/services/user-node-config.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Request DTOs for UserNodeConfigController
 */
interface SaveNodeConfigDto {
	configData: Record<string, unknown>;
}

/**
 * UserNodeConfigController
 *
 * 用户节点配置管理控制器
 *
 * 核心功能：替代凭证系统，管理用户的节点配置
 *
 * 功能：
 * 1. 获取用户的所有节点配置列表
 * 2. 获取特定节点的配置
 * 3. 保存/更新节点配置
 * 4. 删除节点配置
 * 5. 测试节点连接
 *
 * 权限要求：
 * - 所有接口都需要用户登录
 * - 用户只能访问自己的配置
 *
 * 设计原则：
 * - 用户级别隔离：每个用户的配置只有自己能看到
 * - 同类型自动复用：配置一次，所有同类型节点自动使用
 * - 支持团队共享：自定义节点可以配置为团队共享模式
 */
@RestController('/user-node-config')
export class UserNodeConfigController {
	constructor(private readonly userNodeConfigService: UserNodeConfigService) {}

	/**
	 * GET /user-node-config
	 * 获取用户的所有节点配置列表
	 *
	 * 返回用户已配置的节点列表（不包含实际配置数据，只包含元信息）
	 *
	 * @returns 配置列表
	 */
	@Get('/')
	async getAllConfigs(req: AuthenticatedRequest, _res: Response) {
		return await this.userNodeConfigService.getAllUserNodeConfigs(req.user.id);
	}

	/**
	 * GET /user-node-config/:nodeType
	 * 获取特定节点的配置
	 *
	 * 注意：出于安全考虑，此接口可能返回脱敏后的配置数据
	 *
	 * @param nodeType - 节点类型
	 * @returns 配置数据
	 */
	@Get('/:nodeType')
	async getConfig(req: AuthenticatedRequest, _res: Response, @Param('nodeType') nodeType: string) {
		const config = await this.userNodeConfigService.getUserNodeConfig(req.user.id, nodeType);

		if (!config) {
			return { isConfigured: false };
		}

		// 出于安全考虑，可能需要脱敏某些字段
		// 这里返回完整配置，前端负责安全显示
		return {
			isConfigured: true,
			config,
		};
	}

	/**
	 * POST /user-node-config/:nodeType
	 * 保存/更新节点配置
	 *
	 * 此接口将：
	 * 1. 加密存储配置数据
	 * 2. 如果配置已存在则更新，否则创建新配置
	 * 3. 更新最后使用时间
	 *
	 * @param nodeType - 节点类型
	 * @param body - 配置数据
	 * @returns 成功标志
	 */
	@Post('/:nodeType')
	async saveConfig(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
		@Body body: SaveNodeConfigDto,
	) {
		if (!body.configData) {
			throw new BadRequestError('configData is required');
		}

		await this.userNodeConfigService.saveUserNodeConfig(req.user.id, nodeType, body.configData);

		return {
			success: true,
			message:
				'Configuration saved successfully. All nodes of this type will use this configuration automatically.',
		};
	}

	/**
	 * DELETE /user-node-config/:nodeType
	 * 删除节点配置
	 *
	 * @param nodeType - 节点类型
	 * @returns 成功标志
	 */
	@Delete('/:nodeType')
	async deleteConfig(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
	) {
		await this.userNodeConfigService.deleteUserNodeConfig(req.user.id, nodeType);

		return { success: true, message: 'Configuration deleted successfully' };
	}

	/**
	 * POST /user-node-config/:nodeType/test
	 * 测试节点连接
	 *
	 * 用于验证配置是否正确，例如测试 API Key 是否有效
	 *
	 * @param nodeType - 节点类型
	 * @returns 测试结果
	 */
	@Post('/:nodeType/test')
	async testConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
	) {
		const result = await this.userNodeConfigService.testNodeConnection(req.user.id, nodeType);

		return result;
	}

	/**
	 * GET /user-node-config/:nodeType/schema
	 * 获取节点配置字段定义
	 *
	 * 返回节点需要用户配置的字段定义，用于前端渲染配置表单
	 *
	 * @param nodeType - 节点类型
	 * @returns 配置字段定义（JSON Schema 格式）
	 */
	@Get('/:nodeType/schema')
	async getConfigSchema(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
	) {
		// 获取当前用户的工作空间 ID（如果有）
		const workspaceId = (req.user as unknown as { currentWorkspaceId?: string }).currentWorkspaceId;

		const schema = await this.userNodeConfigService.getNodeConfigSchema(nodeType, workspaceId);

		if (!schema) {
			return { hasSchema: false };
		}

		return {
			hasSchema: true,
			schema,
		};
	}

	/**
	 * GET /user-node-config/:nodeType/status
	 * 检查节点是否已配置
	 *
	 * 此接口用于快速检查节点配置状态，不返回实际配置数据
	 *
	 * @param nodeType - 节点类型
	 * @returns 配置状态
	 */
	@Get('/:nodeType/status')
	async getConfigStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
	) {
		// 获取当前用户的工作空间 ID（如果有）
		const workspaceId = (req.user as unknown as { currentWorkspaceId?: string }).currentWorkspaceId;

		const isConfigured = await this.userNodeConfigService.isNodeConfigured(
			req.user.id,
			nodeType,
			workspaceId,
		);

		return {
			nodeType,
			isConfigured,
		};
	}
}
