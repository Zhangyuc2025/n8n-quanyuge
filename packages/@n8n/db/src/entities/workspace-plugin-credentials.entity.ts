import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { PlatformService } from './platform-service.entity';
import type { Project } from './project';

/**
 * 工作空间插件凭证表
 * Workspace plugin credentials entity for storing user-configured API keys and credentials
 *
 * 用于存储工作空间为第三方插件和自定义插件配置的凭证信息。
 * 每个工作空间可以为同一个插件配置不同的凭证。
 *
 * 使用场景：
 * - 第三方插件（user_managed 模式）需要用户自己提供 API Key
 * - 例如：GitHub 插件需要 personal access token
 * - 例如：Notion 插件需要 integration token
 * - 例如：Slack 插件需要 bot token
 *
 * 安全性：
 * - encryptedConfig 字段存储加密后的凭证数据
 * - 使用 n8n 的加密服务进行加密/解密
 * - 凭证数据不会在前端明文传输
 *
 * @example encryptedConfig structure (before encryption):
 * {
 *   "apiKey": "ghp_xxxxxxxxxxxxxxxxxxxx",
 *   "baseUrl": "https://api.github.com",
 *   "webhookSecret": "secret_xxxxxxxxxxxx"
 * }
 */
@Entity()
@Index(['workspaceId', 'serviceKey'], { unique: true }) // 每个工作空间对每个插件只能有一份配置
export class WorkspacePluginCredentials extends WithTimestampsAndStringId {
	/**
	 * 工作空间 ID
	 * Workspace (Project) ID
	 */
	@Column({ type: 'uuid', name: 'workspace_id' })
	workspaceId: string;

	/**
	 * 工作空间关系
	 * Workspace (Project) relation
	 */
	@ManyToOne('Project', { nullable: false })
	@JoinColumn({ name: 'workspace_id' })
	workspace: Project;

	/**
	 * 插件标识（引用 platform_service.service_key）
	 * Plugin service key (references platform_service.service_key)
	 */
	@Column({ type: 'varchar', length: 100, name: 'service_key' })
	serviceKey: string;

	/**
	 * 插件关系
	 * Plugin (PlatformService) relation
	 */
	@ManyToOne('PlatformService', { nullable: false })
	@JoinColumn({ name: 'service_key', referencedColumnName: 'serviceKey' })
	platformService: PlatformService;

	/**
	 * 加密后的配置数据
	 * Encrypted configuration data (JSON)
	 *
	 * 存储用户为该插件配置的 API Key、Token 等敏感信息
	 * 使用 n8n 加密服务加密后存储
	 *
	 * 解密后的数据结构由 platform_service.user_config_schema 定义
	 */
	@Column({ type: 'text', name: 'encrypted_config' })
	encryptedConfig: string;
}
