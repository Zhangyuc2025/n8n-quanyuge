import { Service } from '@n8n/di';
import { UserNodeConfigRepository, CustomNodeRepository } from '@n8n/db';
import { Cipher } from 'n8n-core';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UserError } from 'n8n-workflow';

/**
 * 节点配置未找到错误
 */
export class NodeConfigNotFoundError extends NotFoundError {
	constructor(nodeType: string) {
		super(`Node configuration not found for type: ${nodeType}`);
	}
}

/**
 * 用户节点配置管理服务
 *
 * 核心服务：替代凭证系统，管理用户的节点配置
 *
 * 核心功能：
 * - 获取用户的节点配置（解密）
 * - 保存/更新用户的节点配置（加密）
 * - 处理团队共享配置模式
 * - 测试节点连接
 */
@Service()
export class UserNodeConfigService {
	constructor(
		private readonly userNodeConfigRepository: UserNodeConfigRepository,
		private readonly customNodeRepository: CustomNodeRepository,
		private readonly cipher: Cipher,
	) {}

	/**
	 * 获取用户的节点配置（用于节点执行时注入）
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 * @returns 解密后的配置数据，如果不存在返回 null
	 */
	async getUserNodeConfig(
		userId: string,
		nodeType: string,
	): Promise<Record<string, unknown> | null> {
		const config = await this.userNodeConfigRepository.findOne({
			where: { userId, nodeType },
		});

		if (!config) {
			return null;
		}

		// 解密配置数据
		const decrypted = this.cipher.decrypt(config.configData);
		return JSON.parse(decrypted);
	}

	/**
	 * 保存用户的节点配置（从工作流或节点管理页面）
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 * @param configData - 配置数据（将被加密存储）
	 */
	async saveUserNodeConfig(userId: string, nodeType: string, configData: Record<string, unknown>) {
		// 加密配置数据
		const encrypted = this.cipher.encrypt(JSON.stringify(configData));

		// 查找是否已存在配置
		const existing = await this.userNodeConfigRepository.findOne({
			where: { userId, nodeType },
		});

		if (existing) {
			// 更新现有配置
			existing.configData = encrypted;
			existing.isConfigured = true;
			existing.lastUsedAt = new Date();
			await this.userNodeConfigRepository.save(existing);
		} else {
			// 创建新配置
			const newConfig = this.userNodeConfigRepository.create({
				userId,
				nodeType,
				configData: encrypted,
				isConfigured: true,
				lastUsedAt: new Date(),
			});
			await this.userNodeConfigRepository.save(newConfig);
		}
	}

	/**
	 * 获取节点配置（处理团队共享模式）
	 *
	 * 逻辑：
	 * 1. 检查是否是自定义节点
	 * 2. 如果是自定义节点且为团队共享模式，返回共享配置
	 * 3. 如果是自定义节点且为个人配置模式，返回用户配置
	 * 4. 如果是第三方节点，总是返回用户配置
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 * @param workspaceId - 工作空间 ID
	 * @returns 配置数据
	 * @throws {UserError} 当配置未找到时
	 */
	async getNodeConfig(
		userId: string,
		nodeType: string,
		workspaceId: string,
	): Promise<Record<string, unknown>> {
		// 1. 检查是否是自定义节点（自定义节点的 nodeType 格式：custom.{nodeKey}）
		if (nodeType.startsWith('custom.')) {
			const nodeKey = nodeType.replace('custom.', '');

			const customNode = await this.customNodeRepository.findOne({
				where: { nodeKey, workspaceId },
			});

			if (customNode) {
				// 2a. 团队共享模式：直接返回共享配置
				if (customNode.configMode === 'shared') {
					if (!customNode.sharedConfigData) {
						throw new UserError(`Please configure ${customNode.nodeName} in shared mode first`);
					}

					const decrypted = this.cipher.decrypt(customNode.sharedConfigData);
					return JSON.parse(decrypted);
				}

				// 2b. 个人配置模式：获取用户自己的配置
				const userConfig = await this.getUserNodeConfig(userId, nodeType);
				if (!userConfig) {
					throw new UserError(`Please configure ${customNode.nodeName} first`);
				}
				return userConfig;
			}
		}

		// 3. 第三方节点：总是使用个人配置
		const userConfig = await this.getUserNodeConfig(userId, nodeType);
		if (!userConfig) {
			throw new UserError(`Please configure this node first`);
		}

		return userConfig;
	}

	/**
	 * 检查节点是否已配置
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 * @param workspaceId - 工作空间 ID（用于检查自定义节点的共享配置）
	 * @returns 是否已配置
	 */
	async isNodeConfigured(userId: string, nodeType: string, workspaceId?: string): Promise<boolean> {
		// 检查是否是自定义节点
		if (nodeType.startsWith('custom.') && workspaceId) {
			const nodeKey = nodeType.replace('custom.', '');

			const customNode = await this.customNodeRepository.findOne({
				where: { nodeKey, workspaceId },
			});

			if (customNode) {
				// 团队共享模式：检查是否有共享配置
				if (customNode.configMode === 'shared') {
					return !!customNode.sharedConfigData;
				}
			}
		}

		// 个人配置模式或第三方节点：检查用户配置
		const config = await this.userNodeConfigRepository.findOne({
			where: { userId, nodeType, isConfigured: true },
		});

		return !!config;
	}

	/**
	 * 删除用户的节点配置
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 * @throws {NodeConfigNotFoundError} 当配置不存在时
	 */
	async deleteUserNodeConfig(userId: string, nodeType: string) {
		const config = await this.userNodeConfigRepository.findOne({
			where: { userId, nodeType },
		});

		if (!config) {
			throw new NodeConfigNotFoundError(nodeType);
		}

		await this.userNodeConfigRepository.remove(config);
	}

	/**
	 * 获取用户的所有节点配置列表（用于节点管理页面）
	 *
	 * @param userId - 用户 ID
	 * @returns 配置列表（不包含实际配置数据，只包含元信息）
	 */
	async getAllUserNodeConfigs(userId: string) {
		const configs = await this.userNodeConfigRepository.find({
			where: { userId },
			order: { lastUsedAt: 'DESC' },
		});

		return configs.map((config) => ({
			nodeType: config.nodeType,
			isConfigured: config.isConfigured,
			lastUsedAt: config.lastUsedAt,
			createdAt: config.createdAt,
			updatedAt: config.updatedAt,
		}));
	}

	/**
	 * 更新最后使用时间
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 */
	async updateLastUsed(userId: string, nodeType: string) {
		const config = await this.userNodeConfigRepository.findOne({
			where: { userId, nodeType },
		});

		if (config) {
			config.lastUsedAt = new Date();
			await this.userNodeConfigRepository.save(config);
		}
	}

	/**
	 * 测试节点连接（可选功能，需要节点定义中的 test 方法）
	 *
	 * @param userId - 用户 ID
	 * @param nodeType - 节点类型
	 * @returns 测试结果
	 * @throws {NodeConfigNotFoundError} 当配置不存在时
	 */
	async testNodeConnection(
		userId: string,
		nodeType: string,
	): Promise<{ success: boolean; message?: string }> {
		const config = await this.getUserNodeConfig(userId, nodeType);

		if (!config) {
			throw new NodeConfigNotFoundError(nodeType);
		}

		// TODO: 根据节点类型调用相应的测试方法
		// 这需要节点定义中提供 test 方法
		// 这里只是一个占位实现

		return {
			success: true,
			message: 'Configuration is valid',
		};
	}

	/**
	 * 批量删除过期的节点配置（清理功能）
	 *
	 * @param daysInactive - 超过多少天未使用的配置将被删除
	 * @returns 删除的配置数量
	 */
	async cleanupInactiveConfigs(daysInactive: number = 90): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

		const inactiveConfigs = await this.userNodeConfigRepository
			.createQueryBuilder('config')
			.where('config.lastUsedAt < :cutoffDate', { cutoffDate })
			.orWhere('config.lastUsedAt IS NULL AND config.createdAt < :cutoffDate', { cutoffDate })
			.getMany();

		if (inactiveConfigs.length > 0) {
			await this.userNodeConfigRepository.remove(inactiveConfigs);
		}

		return inactiveConfigs.length;
	}

	/**
	 * 获取节点类型的配置字段定义（用于前端渲染配置表单）
	 *
	 * @param nodeType - 节点类型
	 * @param workspaceId - 工作空间 ID（用于自定义节点）
	 * @returns 配置字段定义
	 */
	async getNodeConfigSchema(
		nodeType: string,
		workspaceId?: string,
	): Promise<Record<string, unknown> | null> {
		// 检查是否是自定义节点
		if (nodeType.startsWith('custom.') && workspaceId) {
			const nodeKey = nodeType.replace('custom.', '');

			const customNode = await this.customNodeRepository.findOne({
				where: { nodeKey, workspaceId },
			});

			if (customNode && customNode.configSchema) {
				return customNode.configSchema;
			}
		}

		// TODO: 对于平台节点，从节点定义中提取配置字段
		// 这需要访问节点注册表或节点定义
		// 这里返回 null 表示未找到

		return null;
	}
}
