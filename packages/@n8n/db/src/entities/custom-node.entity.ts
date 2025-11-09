import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { datetimeColumnType, JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { Project } from './project';
import type { User } from './user';

/**
 * 自定义节点表
 * Custom node entity for storing user-uploaded workspace-specific nodes
 *
 * 职责：
 * - 存储用户自定义节点（工作空间上传的节点）
 * - 管理节点定义和执行代码
 * - 支持两种配置模式：个人配置和团队共享配置
 * - 处理提交审核流程（可选）
 *
 * 配置模式：
 * - 'personal': 每个用户独立配置（存储在 user_node_config 表）
 * - 'shared': 团队共享配置（存储在本表的 shared_config_data 字段）
 *
 * 可见性：
 * - 始终为 'workspace'，仅工作空间成员可见
 */
@Entity()
@Index(['workspaceId', 'nodeKey'], { unique: true })
export class CustomNode extends WithTimestampsAndStringId {
	/**
	 * 节点标识（工作空间内唯一）
	 * Node key identifier (unique within workspace)
	 */
	@Column({ type: 'varchar', length: 100, name: 'node_key' })
	nodeKey: string;

	/**
	 * 节点名称
	 * Node display name
	 */
	@Column({ type: 'varchar', length: 200, name: 'node_name' })
	nodeName: string;

	/**
	 * 所属工作空间 ID
	 * Owner workspace ID
	 */
	@Column({ type: 'uuid', name: 'workspace_id' })
	workspaceId: string;

	/**
	 * 所属工作空间关系
	 * Owner workspace relation
	 */
	@ManyToOne('Project', {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'workspace_id' })
	workspace: Project;

	/**
	 * 节点定义（完整的 INodeTypeDescription）
	 * Complete node definition (INodeTypeDescription format)
	 */
	@JsonColumn({ name: 'node_definition' })
	nodeDefinition: Record<string, unknown>;

	/**
	 * 节点执行代码（TypeScript 代码）
	 * Node execution code (TypeScript source code)
	 */
	@Column({ type: 'text', name: 'node_code' })
	nodeCode: string;

	/**
	 * 配置模式
	 * Configuration mode: 'personal' | 'shared'
	 * - 'personal': 每个用户独立配置
	 * - 'shared': 团队共享配置
	 */
	@Column({ type: 'varchar', length: 20, default: 'personal', name: 'config_mode' })
	configMode: 'personal' | 'shared';

	/**
	 * 团队共享配置数据（仅 shared 模式，加密存储）
	 * Shared configuration data for team (only for shared mode, encrypted)
	 */
	@Column({ type: 'text', nullable: true, name: 'shared_config_data' })
	sharedConfigData: string | null;

	/**
	 * 共享配置设置者 ID（仅 shared 模式）
	 * User who configured the shared config
	 */
	@Column({ type: 'uuid', nullable: true, name: 'shared_config_by' })
	sharedConfigBy: string | null;

	/**
	 * 共享配置设置者关系
	 * User who configured the shared config relation
	 */
	@ManyToOne('User', { nullable: true })
	@JoinColumn({ name: 'shared_config_by' })
	sharedConfigUser: User | null;

	/**
	 * 配置字段定义（JSON Schema）
	 * Configuration schema (JSON Schema format)
	 * 定义用户需要填写的配置字段（如 API Key、App ID 等）
	 */
	@JsonColumn({ nullable: true, name: 'config_schema' })
	configSchema: Record<string, unknown> | null;

	/**
	 * 分类（如：messaging、cloud、ai、database）
	 * Category (e.g., messaging, cloud, ai, database)
	 */
	@Column({ type: 'varchar', length: 100, nullable: true })
	category: string | null;

	/**
	 * 节点描述
	 * Node description
	 */
	@Column({ type: 'text', nullable: true })
	description: string | null;

	/**
	 * 图标 URL
	 * Icon URL
	 */
	@Column({ type: 'varchar', length: 500, nullable: true, name: 'icon_url' })
	iconUrl: string | null;

	/**
	 * 版本号
	 * Version number
	 */
	@Column({ type: 'varchar', length: 50, default: '1.0.0' })
	version: string;

	/**
	 * 可见性（始终为 workspace）
	 * Visibility (always 'workspace')
	 */
	@Column({ type: 'varchar', length: 50, default: 'workspace' })
	visibility: string;

	// ==================== 提交审核相关字段（可选） ====================

	/**
	 * 提交审核状态
	 * Submission status: 'draft' | 'pending' | 'approved' | 'rejected'
	 */
	@Column({ type: 'varchar', length: 50, nullable: true, name: 'submission_status' })
	submissionStatus: 'draft' | 'pending' | 'approved' | 'rejected' | null;

	/**
	 * 提交时间
	 * Submission timestamp
	 */
	@Column({ type: datetimeColumnType, nullable: true, name: 'submitted_at' })
	submittedAt: Date | null;

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
	 * 审核时间
	 * Review completed timestamp
	 */
	@Column({ type: datetimeColumnType, nullable: true, name: 'reviewed_at' })
	reviewedAt: Date | null;

	/**
	 * 审核备注
	 * Review notes
	 */
	@Column({ type: 'text', nullable: true, name: 'review_notes' })
	reviewNotes: string | null;

	// ==================== 状态字段 ====================

	/**
	 * 是否激活
	 * Whether the node is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive: boolean;

	/**
	 * 创建者 ID
	 * Creator user ID
	 */
	@Column({ type: 'uuid', name: 'created_by' })
	createdBy: string;

	/**
	 * 创建者关系
	 * Creator user relation
	 */
	@ManyToOne('User', {
		nullable: false,
	})
	@JoinColumn({ name: 'created_by' })
	creator: User;
}
