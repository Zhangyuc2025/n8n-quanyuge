import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { datetimeColumnType, WithTimestampsAndStringId } from './abstract-entity';
import type { User } from './user';

/**
 * 用户节点配置表
 * User node configuration entity for storing user-specific node configurations
 *
 * 职责：
 * - 存储用户的节点配置（替代 credentials_entity 和 workspace_plugin_credentials）
 * - 按节点类型存储，实现配置自动复用
 * - 加密存储配置数据（如 API Key、App ID 等敏感信息）
 * - 支持配置状态管理和过期清理
 *
 * 配置复用逻辑：
 * - 同一用户对同一节点类型只需配置一次
 * - 工作流中所有使用该节点类型的节点自动复用配置
 *
 * @example
 * 用户配置了 GitHub 节点的 API Key：
 * {
 *   userId: 'user-123',
 *   nodeType: 'n8n-nodes-base.github',
 *   configData: '{"apiKey": "ghp_xxx", "baseUrl": "..."}' (encrypted)
 * }
 *
 * 工作流中所有 GitHub 节点自动使用该配置
 */
@Entity()
@Index(['userId', 'nodeType'], { unique: true })
export class UserNodeConfig extends WithTimestampsAndStringId {
	/**
	 * 用户 ID（哪个用户的配置）
	 * User ID (owner of this configuration)
	 */
	@Column({ type: 'uuid', name: 'user_id' })
	userId: string;

	/**
	 * 用户关系
	 * User relation
	 */
	@ManyToOne('User', {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'user_id' })
	user: User;

	/**
	 * 节点类型（按节点类型存储，实现自动复用）
	 * Node type identifier for configuration reuse
	 *
	 * @example
	 * - 'n8n-nodes-base.github' (平台内置节点)
	 * - 'n8n-nodes-base.slack' (平台内置节点)
	 * - 'custom.company-api' (自定义节点)
	 */
	@Column({ type: 'varchar', length: 100, name: 'node_type' })
	nodeType: string;

	/**
	 * 加密的配置数据（JSON 格式）
	 * Encrypted configuration data in JSON format
	 *
	 * @example
	 * 加密前的数据格式：
	 * {
	 *   "apiKey": "ghp_xxxxxxxxxxxxx",
	 *   "baseUrl": "https://api.github.com",
	 *   "appId": "12345"
	 * }
	 */
	@Column({ type: 'text', name: 'config_data' })
	configData: string;

	/**
	 * 配置状态（是否已配置）
	 * Whether the configuration is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_configured' })
	isConfigured: boolean;

	/**
	 * 最后使用时间（用于清理过期配置）
	 * Last used timestamp (for cleanup of unused configurations)
	 */
	@Column({ type: datetimeColumnType, nullable: true, name: 'last_used_at' })
	lastUsedAt: Date | null;
}
