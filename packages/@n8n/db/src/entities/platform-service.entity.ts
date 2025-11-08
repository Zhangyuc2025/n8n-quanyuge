import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { datetimeColumnType, WithTimestamps } from './abstract-entity';
import type { Project } from './project';
import type { User } from './user';

/**
 * 平台服务表（扩展支持插件管理）
 * Platform service entity for storing AI models, RAG services, and plugins with pricing configuration
 *
 * 支持三种服务类型：
 * 1. AI 模型服务（serviceType: 'ai_model'）- 按 token 计费
 * 2. RAG 服务（serviceType: 'rag_service'）- 按查询次数计费
 * 3. 插件服务（serviceType: 'plugin'）- 平台插件按量计费，第三方插件和自定义插件不计费
 *
 * 插件分为三层：
 * 1. 🏢 平台插件（visibility: 'global', serviceMode: 'platform_managed'）- 管理员配置，按量计费
 * 2. 🔌 第三方插件（visibility: 'global', serviceMode: 'user_managed'）- 用户配置 API Key，不计费
 * 3. 🛠️ 自定义插件（visibility: 'workspace'）- 用户上传，工作空间可见，可提交审核
 *
 * @example pricingConfig structure for AI models:
 * {
 *   "pricePerToken": 0.00001,  // Price per token for AI models (CNY)
 *   "currency": "CNY",
 *   "inputTokenPrice": 0.00001,  // Optional: different price for input tokens
 *   "outputTokenPrice": 0.00003  // Optional: different price for output tokens
 * }
 *
 * @example userConfigSchema structure for third-party plugins:
 * {
 *   "type": "object",
 *   "properties": {
 *     "apiKey": { "type": "string", "description": "API Key" },
 *     "baseUrl": { "type": "string", "description": "Base URL (optional)" }
 *   },
 *   "required": ["apiKey"]
 * }
 */
@Entity()
export class PlatformService extends WithTimestamps {
	/**
	 * 服务标识（如：openai-gpt4、anthropic-claude-3.5-sonnet、github-plugin）
	 * Service key (e.g., openai-gpt4, anthropic-claude-3.5-sonnet, github-plugin)
	 */
	@PrimaryColumn({ type: 'varchar', length: 100, name: 'service_key' })
	serviceKey: string;

	/**
	 * 服务类型（如：ai_model、rag_service、plugin）
	 * Service type (e.g., ai_model, rag_service, plugin)
	 */
	@Column({ type: 'varchar', length: 50, name: 'service_type' })
	serviceType: string;

	/**
	 * 服务名称
	 * Service display name
	 */
	@Column({ type: 'varchar', length: 200 })
	name: string;

	/**
	 * 定价配置（JSON格式）
	 * Pricing configuration in JSON format
	 * 仅用于 AI 模型和平台托管的插件
	 */
	@Column({ type: 'json', name: 'pricing_config' })
	pricingConfig: Record<string, unknown>;

	/**
	 * 是否激活
	 * Whether the service is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive: boolean;

	// ==================== 插件相关字段 ====================

	/**
	 * 可见性：'global'（全局可见）或 'workspace'（工作空间可见）
	 * Visibility: 'global' (visible to all) or 'workspace' (visible to specific workspace only)
	 * 默认 'global' 用于 AI 模型、RAG 服务、平台插件、第三方插件
	 * 'workspace' 仅用于自定义插件
	 */
	@Column({ type: 'varchar', length: 50, default: 'global' })
	visibility: 'global' | 'workspace';

	/**
	 * 所属工作空间 ID（仅自定义插件）
	 * Owner workspace ID (only for custom plugins with visibility: 'workspace')
	 */
	@Column({ type: 'uuid', nullable: true, name: 'owner_workspace_id' })
	ownerWorkspaceId: string | null;

	/**
	 * 所属工作空间关系
	 * Owner workspace relation
	 */
	@ManyToOne('Project', { nullable: true })
	@JoinColumn({ name: 'owner_workspace_id' })
	ownerWorkspace: Project | null;

	/**
	 * 插件代码（TypeScript）
	 * Plugin code (TypeScript source code)
	 * 仅自定义插件使用
	 */
	@Column({ type: 'text', nullable: true, name: 'plugin_code' })
	pluginCode: string | null;

	/**
	 * 插件版本号
	 * Plugin version number
	 */
	@Column({ type: 'varchar', length: 50, nullable: true, name: 'plugin_version' })
	pluginVersion: string | null;

	/**
	 * 服务模式
	 * Service mode:
	 * - 'platform_managed': 平台托管（平台提供 API Key 并计费）
	 * - 'user_managed': 用户托管（用户提供 API Key，不计费）
	 */
	@Column({ type: 'varchar', length: 50, nullable: true, name: 'service_mode' })
	serviceMode: 'platform_managed' | 'user_managed' | null;

	/**
	 * 用户配置字段的 JSON Schema
	 * JSON Schema for user configuration fields
	 * 用于 user_managed 模式，定义用户需要填写的字段（如 API Key、App ID 等）
	 */
	@Column({ type: 'json', nullable: true, name: 'user_config_schema' })
	userConfigSchema: Record<string, unknown> | null;

	/**
	 * 提交审核状态
	 * Submission status:
	 * - 'pending': 待审核
	 * - 'approved': 已通过
	 * - 'rejected': 已拒绝
	 */
	@Column({ type: 'varchar', length: 50, nullable: true, name: 'submission_status' })
	submissionStatus: 'pending' | 'approved' | 'rejected' | null;

	/**
	 * 提交审核时间
	 * Submission timestamp
	 */
	@Column({ type: datetimeColumnType, nullable: true, name: 'submitted_at' })
	submittedAt: Date | null;

	/**
	 * 审核完成时间
	 * Review completed timestamp
	 */
	@Column({ type: datetimeColumnType, nullable: true, name: 'reviewed_at' })
	reviewedAt: Date | null;

	/**
	 * 审核人 ID
	 * Reviewer user ID
	 */
	@Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
	reviewedBy: string | null;

	/**
	 * 审核人关系
	 * Reviewer user relation
	 */
	@ManyToOne('User', { nullable: true })
	@JoinColumn({ name: 'reviewed_by' })
	reviewer: User | null;

	/**
	 * 审核备注
	 * Review notes
	 */
	@Column({ type: 'text', nullable: true, name: 'review_notes' })
	reviewNotes: string | null;

	/**
	 * 插件分类
	 * Plugin category (e.g., messaging, cloud, ai, database, analytics)
	 */
	@Column({ type: 'varchar', length: 100, nullable: true })
	category: string | null;

	/**
	 * 插件描述
	 * Plugin or service description
	 */
	@Column({ type: 'text', nullable: true })
	description: string | null;

	/**
	 * 插件图标 URL
	 * Plugin icon URL
	 */
	@Column({ type: 'varchar', length: 500, nullable: true, name: 'icon_url' })
	iconUrl: string | null;

	/**
	 * 是否启用
	 * Whether the service/plugin is enabled
	 * 管理员可以禁用某个插件
	 */
	@Column({ type: 'boolean', default: true })
	enabled: boolean;
}
