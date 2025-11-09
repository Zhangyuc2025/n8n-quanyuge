import { Service } from '@n8n/di';
import { PlatformNodeRepository } from '@n8n/db';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UserError } from 'n8n-workflow';

/**
 * 平台节点未找到错误
 */
export class PlatformNodeNotFoundError extends NotFoundError {
	constructor(nodeKey: string) {
		super(`Platform node not found: ${nodeKey}`);
	}
}

/**
 * 节点类型
 */
export type NodeType = 'platform_official' | 'third_party_approved';

/**
 * 审核状态
 */
export type SubmissionStatus = 'approved' | 'rejected';

/**
 * 平台节点管理服务
 *
 * 负责管理平台官方节点和第三方审核通过的节点
 */
@Service()
export class PlatformNodeService {
	constructor(private readonly platformNodeRepository: PlatformNodeRepository) {}

	/**
	 * 获取所有平台节点
	 *
	 * @param filters - 过滤条件
	 * @returns 节点列表
	 */
	async getAllNodes(filters?: {
		nodeType?: NodeType;
		category?: string;
		enabled?: boolean;
		isActive?: boolean;
		submissionStatus?: 'pending' | 'approved' | 'rejected';
	}) {
		const where: Record<string, unknown> = {};

		if (filters?.nodeType !== undefined) {
			where.nodeType = filters.nodeType;
		}

		if (filters?.category !== undefined) {
			where.category = filters.category;
		}

		if (filters?.enabled !== undefined) {
			where.enabled = filters.enabled;
		}

		if (filters?.isActive !== undefined) {
			where.isActive = filters.isActive;
		}

		if (filters?.submissionStatus !== undefined) {
			where.submissionStatus = filters.submissionStatus;
		}

		return await this.platformNodeRepository.find({
			where,
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * 获取活跃的平台节点（用户可见）
	 *
	 * @param category - 分类过滤（可选）
	 * @returns 活跃的节点列表
	 */
	async getActiveNodes(category?: string) {
		const where: Record<string, unknown> = {
			isActive: true,
			enabled: true,
		};

		if (category) {
			where.category = category;
		}

		return await this.platformNodeRepository.find({
			where,
			order: { nodeName: 'ASC' },
		});
	}

	/**
	 * 获取节点详情
	 *
	 * @param nodeKey - 节点标识
	 * @returns 节点实体
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async getNodeByKey(nodeKey: string) {
		const node = await this.platformNodeRepository.findOne({
			where: { nodeKey },
		});

		if (!node) {
			throw new PlatformNodeNotFoundError(nodeKey);
		}

		return node;
	}

	/**
	 * 创建平台官方节点（管理员功能）
	 *
	 * @param data - 节点数据
	 * @returns 创建的节点
	 */
	async createOfficialNode(data: {
		nodeKey: string;
		nodeName: string;
		nodeDefinition: Record<string, unknown>;
		nodeCode?: string;
		category?: string;
		description?: string;
		iconUrl?: string;
		version?: string;
		isBillable?: boolean;
		pricePerRequest?: number;
	}) {
		// 检查节点是否已存在
		const existing = await this.platformNodeRepository.findOne({
			where: { nodeKey: data.nodeKey },
		});

		if (existing) {
			throw new UserError(`Node with key '${data.nodeKey}' already exists`);
		}

		const node = this.platformNodeRepository.create({
			nodeKey: data.nodeKey,
			nodeName: data.nodeName,
			nodeType: 'platform_official',
			nodeDefinition: data.nodeDefinition,
			nodeCode: data.nodeCode || null,
			category: data.category || null,
			description: data.description || null,
			iconUrl: data.iconUrl || null,
			version: data.version || '1.0.0',
			isBillable: data.isBillable || false,
			pricePerRequest: data.pricePerRequest || null,
			isActive: true,
			enabled: true,
		});

		return await this.platformNodeRepository.save(node);
	}

	/**
	 * 创建平台节点（管理员功能）
	 * 支持创建官方节点或第三方审核通过的节点
	 *
	 * @param data - 节点数据
	 * @returns 创建的节点
	 */
	async createNode(data: {
		nodeKey: string;
		nodeName: string;
		nodeType: NodeType;
		nodeDefinition: Record<string, unknown>;
		nodeCode?: string;
		category?: string;
		description?: string;
		iconUrl?: string;
		version?: string;
		isBillable?: boolean;
		pricePerRequest?: number;
		submittedBy?: string;
	}) {
		// 检查节点是否已存在
		const existing = await this.platformNodeRepository.findOne({
			where: { nodeKey: data.nodeKey },
		});

		if (existing) {
			throw new UserError(`Node with key '${data.nodeKey}' already exists`);
		}

		const node = this.platformNodeRepository.create({
			nodeKey: data.nodeKey,
			nodeName: data.nodeName,
			nodeType: data.nodeType,
			nodeDefinition: data.nodeDefinition,
			nodeCode: data.nodeCode || null,
			category: data.category || null,
			description: data.description || null,
			iconUrl: data.iconUrl || null,
			version: data.version || '1.0.0',
			isBillable: data.isBillable || false,
			pricePerRequest: data.pricePerRequest || null,
			isActive: true,
			enabled: true,
			submittedBy: data.submittedBy || null,
		});

		return await this.platformNodeRepository.save(node);
	}

	/**
	 * 审核通过第三方节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param reviewerId - 审核人 ID
	 * @param reviewNotes - 审核备注
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async approveNode(nodeKey: string, reviewerId: string, reviewNotes?: string) {
		await this.reviewThirdPartyNode(nodeKey, reviewerId, true, reviewNotes);
	}

	/**
	 * 拒绝第三方节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param reviewerId - 审核人 ID
	 * @param reason - 拒绝原因
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async rejectNode(nodeKey: string, reviewerId: string, reason: string) {
		await this.reviewThirdPartyNode(nodeKey, reviewerId, false, reason);
	}

	/**
	 * 更新平台节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param updates - 更新内容
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async updateNode(
		nodeKey: string,
		updates: {
			nodeName?: string;
			nodeDefinition?: Record<string, unknown>;
			nodeCode?: string;
			category?: string;
			description?: string;
			iconUrl?: string;
			version?: string;
			isBillable?: boolean;
			pricePerRequest?: number;
			enabled?: boolean;
			isActive?: boolean;
		},
	) {
		const node = await this.getNodeByKey(nodeKey);

		if (updates.nodeName !== undefined) node.nodeName = updates.nodeName;
		if (updates.nodeDefinition !== undefined) node.nodeDefinition = updates.nodeDefinition;
		if (updates.nodeCode !== undefined) node.nodeCode = updates.nodeCode;
		if (updates.category !== undefined) node.category = updates.category;
		if (updates.description !== undefined) node.description = updates.description;
		if (updates.iconUrl !== undefined) node.iconUrl = updates.iconUrl;
		if (updates.version !== undefined) node.version = updates.version;
		if (updates.isBillable !== undefined) node.isBillable = updates.isBillable;
		if (updates.pricePerRequest !== undefined) node.pricePerRequest = updates.pricePerRequest;
		if (updates.enabled !== undefined) node.enabled = updates.enabled;
		if (updates.isActive !== undefined) node.isActive = updates.isActive;

		await this.platformNodeRepository.save(node);
	}

	/**
	 * 删除平台节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async deleteNode(nodeKey: string) {
		const node = await this.getNodeByKey(nodeKey);
		await this.platformNodeRepository.remove(node);
	}

	/**
	 * 启用/禁用节点
	 *
	 * @param nodeKey - 节点标识
	 * @param enabled - 是否启用
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async toggleNode(nodeKey: string, enabled: boolean) {
		const node = await this.getNodeByKey(nodeKey);
		node.enabled = enabled;
		await this.platformNodeRepository.save(node);
	}

	/**
	 * 获取待审核的第三方节点
	 *
	 * @returns 待审核的节点列表
	 */
	async getPendingThirdPartyNodes() {
		return await this.platformNodeRepository
			.createQueryBuilder('node')
			.leftJoinAndSelect('node.submitter', 'submitter')
			.where('node.nodeType = :nodeType', { nodeType: 'third_party_approved' })
			.andWhere('node.submissionStatus IS NULL')
			.orderBy('node.submittedAt', 'DESC')
			.getMany();
	}

	/**
	 * 审核第三方节点（管理员功能）
	 *
	 * @param nodeKey - 节点标识
	 * @param reviewerId - 审核人 ID
	 * @param approved - 是否通过
	 * @param reviewNotes - 审核备注
	 * @throws {PlatformNodeNotFoundError} 当节点不存在时
	 */
	async reviewThirdPartyNode(
		nodeKey: string,
		reviewerId: string,
		approved: boolean,
		reviewNotes?: string,
	) {
		const node = await this.getNodeByKey(nodeKey);

		if (node.nodeType !== 'third_party_approved') {
			throw new UserError('Only third-party nodes can be reviewed');
		}

		node.submissionStatus = approved ? 'approved' : 'rejected';
		node.reviewedBy = reviewerId;
		node.reviewedAt = new Date();
		node.reviewNotes = reviewNotes || null;

		// 如果审核通过，自动启用节点
		if (approved) {
			node.isActive = true;
			node.enabled = true;
		}

		await this.platformNodeRepository.save(node);
	}

	/**
	 * 获取按分类分组的节点
	 *
	 * @returns 按分类分组的节点映射
	 */
	async getNodesByCategory() {
		const nodes = await this.getActiveNodes();

		const grouped = new Map<string, typeof nodes>();

		for (const node of nodes) {
			const category = node.category || 'other';
			if (!grouped.has(category)) {
				grouped.set(category, []);
			}
			grouped.get(category)!.push(node);
		}

		return Object.fromEntries(grouped);
	}

	/**
	 * 搜索节点
	 *
	 * @param query - 搜索关键词
	 * @returns 匹配的节点列表
	 */
	async searchNodes(query: string) {
		// 简单的搜索实现，实际项目中可能需要更复杂的全文搜索
		const allNodes = await this.getActiveNodes();

		const lowerQuery = query.toLowerCase();

		return allNodes.filter(
			(node) =>
				node.nodeName.toLowerCase().includes(lowerQuery) ||
				node.nodeKey.toLowerCase().includes(lowerQuery) ||
				(node.description && node.description.toLowerCase().includes(lowerQuery)),
		);
	}
}
