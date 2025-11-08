import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkspacePluginCredentials } from '../entities/workspace-plugin-credentials.entity';

/**
 * WorkspacePluginCredentialsRepository
 *
 * 工作空间插件凭证仓库，用于管理工作空间为第三方插件配置的 API Key 等凭证信息
 *
 * 主要功能：
 * - 保存/更新工作空间的插件凭证
 * - 查询工作空间的插件凭证
 * - 删除工作空间的插件凭证
 * - 批量查询工作空间的所有插件凭证
 */
@Service()
export class WorkspacePluginCredentialsRepository extends Repository<WorkspacePluginCredentials> {
	constructor(dataSource: DataSource) {
		super(WorkspacePluginCredentials, dataSource.manager);
	}

	/**
	 * 获取工作空间为某个插件配置的凭证
	 *
	 * @param workspaceId 工作空间 ID
	 * @param serviceKey 插件标识
	 * @returns 插件凭证记录，如果未配置则返回 null
	 */
	async findCredential(workspaceId: string, serviceKey: string) {
		return await this.findOne({
			where: { workspaceId, serviceKey },
			relations: ['workspace', 'platformService'],
		});
	}

	/**
	 * 保存或更新工作空间的插件凭证
	 *
	 * @param workspaceId 工作空间 ID
	 * @param serviceKey 插件标识
	 * @param encryptedConfig 加密后的配置数据
	 * @returns 保存后的凭证记录
	 */
	async upsertCredential(workspaceId: string, serviceKey: string, encryptedConfig: string) {
		const existing = await this.findOne({
			where: { workspaceId, serviceKey },
		});

		if (existing) {
			// 更新现有凭证
			existing.encryptedConfig = encryptedConfig;
			return await this.save(existing);
		} else {
			// 创建新凭证
			return await this.save({
				workspaceId,
				serviceKey,
				encryptedConfig,
			});
		}
	}

	/**
	 * 删除工作空间的插件凭证
	 *
	 * @param workspaceId 工作空间 ID
	 * @param serviceKey 插件标识
	 * @returns 是否成功删除
	 */
	async deleteCredential(workspaceId: string, serviceKey: string): Promise<boolean> {
		const result = await this.delete({ workspaceId, serviceKey });
		return (result.affected ?? 0) > 0;
	}

	/**
	 * 获取工作空间的所有插件凭证列表
	 *
	 * @param workspaceId 工作空间 ID
	 * @returns 插件凭证列表（包含插件信息）
	 */
	async findWorkspaceCredentials(workspaceId: string) {
		return await this.find({
			where: { workspaceId },
			relations: ['platformService'],
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * 检查工作空间是否已为某个插件配置凭证
	 *
	 * @param workspaceId 工作空间 ID
	 * @param serviceKey 插件标识
	 * @returns 是否已配置
	 */
	async hasCredential(workspaceId: string, serviceKey: string): Promise<boolean> {
		const count = await this.count({
			where: { workspaceId, serviceKey },
		});
		return count > 0;
	}

	/**
	 * 批量获取多个工作空间的插件配置状态
	 *
	 * @param workspaceId 工作空间 ID
	 * @param serviceKeys 插件标识列表
	 * @returns Map<serviceKey, boolean> 插件标识 -> 是否已配置
	 */
	async getConfiguredStatus(
		workspaceId: string,
		serviceKeys: string[],
	): Promise<Map<string, boolean>> {
		const credentials = await this.find({
			where: {
				workspaceId,
			},
			select: ['serviceKey'],
		});

		const configuredSet = new Set(credentials.map((c) => c.serviceKey));
		const statusMap = new Map<string, boolean>();

		for (const serviceKey of serviceKeys) {
			statusMap.set(serviceKey, configuredSet.has(serviceKey));
		}

		return statusMap;
	}
}
