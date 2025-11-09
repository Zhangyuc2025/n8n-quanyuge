import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { datetimeColumnType, JsonColumn, WithTimestamps } from './abstract-entity';
import type { User } from './user';

/**
 * 平台节点表
 * Platform node entity for storing official and third-party approved nodes
 *
 * 职责：
 * - 存储平台官方节点和第三方审核通过的节点
 * - 管理节点定义（INodeTypeDescription）
 * - 管理节点执行代码
 * - 处理第三方节点的审核流程
 * - 配置计费信息（如果是平台托管服务）
 *
 * 节点类型：
 * - 'platform_official': 平台官方节点
 * - 'third_party_approved': 第三方审核通过的节点
 */
@Entity()
export class PlatformNode extends WithTimestamps {
	/**
	 * 节点标识（如：weather-query、ocr-service）
	 * Node key identifier (e.g., weather-query, ocr-service)
	 */
	@PrimaryColumn({ type: 'varchar', length: 100, name: 'node_key' })
	nodeKey: string;

	/**
	 * 节点名称（如：天气查询、OCR 识别）
	 * Node display name (e.g., Weather Query, OCR Service)
	 */
	@Column({ type: 'varchar', length: 200, name: 'node_name' })
	nodeName: string;

	/**
	 * 节点类型
	 * Node type: 'platform_official' | 'third_party_approved'
	 */
	@Column({ type: 'varchar', length: 50, name: 'node_type' })
	nodeType: string;

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
	@Column({ type: 'text', nullable: true, name: 'node_code' })
	nodeCode: string | null;

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
	 * 是否计费
	 * Whether the node is billable (for platform-hosted services)
	 */
	@Column({ type: 'boolean', default: false, name: 'is_billable' })
	isBillable: boolean;

	/**
	 * 每次请求价格（人民币）
	 * Price per request in CNY
	 */
	@Column({ type: 'double', nullable: true, name: 'price_per_request' })
	pricePerRequest: number | null;

	// ==================== 审核相关字段（仅第三方节点） ====================

	/**
	 * 提交审核状态
	 * Submission status: 'approved' | 'rejected'
	 */
	@Column({ type: 'varchar', length: 50, nullable: true, name: 'submission_status' })
	submissionStatus: 'approved' | 'rejected' | null;

	/**
	 * 提交者 ID
	 * Submitter user ID
	 */
	@Column({ type: 'uuid', nullable: true, name: 'submitted_by' })
	submittedBy: string | null;

	/**
	 * 提交者关系
	 * Submitter user relation
	 */
	@ManyToOne('User', { nullable: true })
	@JoinColumn({ name: 'submitted_by' })
	submitter: User | null;

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
	 * 是否启用
	 * Whether the node is enabled
	 */
	@Column({ type: 'boolean', default: true })
	enabled: boolean;
}
