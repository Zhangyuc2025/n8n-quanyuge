import { Service } from '@n8n/di';
import { CustomNodeRepository } from '@n8n/db';
import { Cipher } from 'n8n-core';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UserError } from 'n8n-workflow';

/**
 * 自定义节点未找到错误
 */
export class CustomNodeNotFoundError extends NotFoundError {
	constructor(nodeKey: string) {
		super(`Custom node not found: ${nodeKey}`);
	}
}

/**
 * 配置模式类型
 */
export type ConfigMode = 'personal' | 'shared';

/**
 * 提交状态类型
 */
export type CustomNodeSubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/**
 * 自定义节点管理服务
 *
 * 负责管理用户上传的自定义节点
 */
@Service()
export class CustomNodeService {
	constructor(
		private readonly customNodeRepository: CustomNodeRepository,
		private readonly cipher: Cipher,
	) {}

	/**
	 * 获取工作空间的自定义节点列表
	 *
	 * @param workspaceId - 工作空间 ID
	 * @param activeOnly - 是否只返回激活的节点（默认 true）
	 * @returns 自定义节点列表
	 */
	async getWorkspaceNodes(workspaceId: string, activeOnly: boolean = true) {
		const where: Record<string, unknown> = { workspaceId };

		if (activeOnly) {
			where.isActive = true;
		}

		return await this.customNodeRepository.find({
			where,
			relations: ['creator', 'sharedConfigUser'],
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * 获取自定义节点详情
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @returns 节点实体
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当用户无权访问节点时
	 */
	async getNodeById(nodeId: string, workspaceId: string) {
		const node = await this.customNodeRepository.findOne({
			where: { id: nodeId },
			relations: ['creator', 'sharedConfigUser'],
		});

		if (!node) {
			throw new CustomNodeNotFoundError(nodeId);
		}

		// 验证节点属于当前工作空间
		if (node.workspaceId !== workspaceId) {
			throw new UserError('You do not have permission to access this node');
		}

		return node;
	}

	/**
	 * 获取自定义节点（通过 nodeKey）
	 *
	 * @param workspaceId - 工作空间 ID
	 * @param nodeKey - 节点标识
	 * @returns 节点实体
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 */
	async getNodeByKey(workspaceId: string, nodeKey: string) {
		const node = await this.customNodeRepository.findOne({
			where: { workspaceId, nodeKey },
			relations: ['creator', 'sharedConfigUser'],
		});

		if (!node) {
			throw new CustomNodeNotFoundError(nodeKey);
		}

		return node;
	}

	/**
	 * 创建自定义节点
	 *
	 * @param data - 节点数据
	 * @returns 创建的节点
	 * @throws {UserError} 当节点已存在时
	 */
	async createNode(data: {
		workspaceId: string;
		userId: string;
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
	}) {
		// 检查节点是否已存在
		const existing = await this.customNodeRepository.findOne({
			where: {
				workspaceId: data.workspaceId,
				nodeKey: data.nodeKey,
			},
		});

		if (existing) {
			throw new UserError(`Node with key '${data.nodeKey}' already exists in this workspace`);
		}

		const node = this.customNodeRepository.create({
			workspaceId: data.workspaceId,
			nodeKey: data.nodeKey,
			nodeName: data.nodeName,
			nodeDefinition: data.nodeDefinition,
			nodeCode: data.nodeCode,
			configMode: data.configMode || 'personal',
			configSchema: data.configSchema || null,
			category: data.category || null,
			description: data.description || null,
			iconUrl: data.iconUrl || null,
			version: data.version || '1.0.0',
			visibility: 'workspace',
			isActive: true,
			createdBy: data.userId,
			submissionStatus: 'draft',
		});

		return await this.customNodeRepository.save(node);
	}

	/**
	 * 创建自定义节点（管理员功能版本）
	 * 允许管理员为任意工作空间创建节点
	 *
	 * @param workspaceId - 工作空间 ID
	 * @param userId - 创建者 ID
	 * @param data - 节点数据
	 * @returns 创建的节点
	 * @throws {UserError} 当节点已存在时
	 */
	async createCustomNode(
		workspaceId: string,
		userId: string,
		data: {
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
		},
	) {
		return await this.createNode({
			workspaceId,
			userId,
			...data,
		});
	}

	/**
	 * 更新自定义节点（管理员功能版本）
	 * 允许管理员更新任意节点，不验证工作空间权限
	 *
	 * @param nodeId - 节点 ID
	 * @param data - 更新内容
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 */
	async updateCustomNode(
		nodeId: string,
		data: {
			nodeName?: string;
			nodeDefinition?: Record<string, unknown>;
			nodeCode?: string;
			configMode?: ConfigMode;
			configSchema?: Record<string, unknown>;
			category?: string;
			description?: string;
			iconUrl?: string;
			version?: string;
		},
	) {
		const node = await this.customNodeRepository.findOne({
			where: { id: nodeId },
			relations: ['creator', 'sharedConfigUser'],
		});

		if (!node) {
			throw new CustomNodeNotFoundError(nodeId);
		}

		if (data.nodeName !== undefined) node.nodeName = data.nodeName;
		if (data.nodeDefinition !== undefined) node.nodeDefinition = data.nodeDefinition;
		if (data.nodeCode !== undefined) node.nodeCode = data.nodeCode;
		if (data.configMode !== undefined) node.configMode = data.configMode;
		if (data.configSchema !== undefined) node.configSchema = data.configSchema;
		if (data.category !== undefined) node.category = data.category;
		if (data.description !== undefined) node.description = data.description;
		if (data.iconUrl !== undefined) node.iconUrl = data.iconUrl;
		if (data.version !== undefined) node.version = data.version;

		await this.customNodeRepository.save(node);
	}

	/**
	 * 删除自定义节点（管理员功能版本）
	 * 允许管理员删除任意节点，不验证工作空间权限
	 *
	 * @param nodeId - 节点 ID
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 */
	async deleteCustomNode(nodeId: string) {
		const node = await this.customNodeRepository.findOne({
			where: { id: nodeId },
		});

		if (!node) {
			throw new CustomNodeNotFoundError(nodeId);
		}

		await this.customNodeRepository.remove(node);
	}

	/**
	 * 更新团队共享配置（管理员功能版本）
	 * 允许管理员更新任意节点的共享配置
	 *
	 * @param nodeId - 节点 ID
	 * @param config - 配置数据（将被加密存储）
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当节点不是共享模式时
	 */
	async updateSharedConfig(nodeId: string, config: Record<string, unknown>) {
		const node = await this.customNodeRepository.findOne({
			where: { id: nodeId },
		});

		if (!node) {
			throw new CustomNodeNotFoundError(nodeId);
		}

		if (node.configMode !== 'shared') {
			throw new UserError('Node must be in shared config mode');
		}

		// 加密配置数据
		const encrypted = this.cipher.encrypt(JSON.stringify(config));

		node.sharedConfigData = encrypted;

		await this.customNodeRepository.save(node);
	}

	/**
	 * 更新自定义节点
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @param updates - 更新内容
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当用户无权访问节点时
	 */
	async updateNode(
		nodeId: string,
		workspaceId: string,
		updates: {
			nodeName?: string;
			nodeDefinition?: Record<string, unknown>;
			nodeCode?: string;
			configMode?: ConfigMode;
			configSchema?: Record<string, unknown>;
			category?: string;
			description?: string;
			iconUrl?: string;
			version?: string;
		},
	) {
		const node = await this.getNodeById(nodeId, workspaceId);

		if (updates.nodeName !== undefined) node.nodeName = updates.nodeName;
		if (updates.nodeDefinition !== undefined) node.nodeDefinition = updates.nodeDefinition;
		if (updates.nodeCode !== undefined) node.nodeCode = updates.nodeCode;
		if (updates.configMode !== undefined) node.configMode = updates.configMode;
		if (updates.configSchema !== undefined) node.configSchema = updates.configSchema;
		if (updates.category !== undefined) node.category = updates.category;
		if (updates.description !== undefined) node.description = updates.description;
		if (updates.iconUrl !== undefined) node.iconUrl = updates.iconUrl;
		if (updates.version !== undefined) node.version = updates.version;

		await this.customNodeRepository.save(node);
	}

	/**
	 * 删除自定义节点
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当用户无权访问节点时
	 */
	async deleteNode(nodeId: string, workspaceId: string) {
		const node = await this.getNodeById(nodeId, workspaceId);
		await this.customNodeRepository.remove(node);
	}

	/**
	 * 配置团队共享模式
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @param userId - 配置者 ID
	 * @param configData - 配置数据（将被加密存储）
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当节点不是共享模式时
	 */
	async setSharedConfig(
		nodeId: string,
		workspaceId: string,
		userId: string,
		configData: Record<string, unknown>,
	) {
		const node = await this.getNodeById(nodeId, workspaceId);

		if (node.configMode !== 'shared') {
			throw new UserError('Node must be in shared config mode');
		}

		// 加密配置数据
		const encrypted = this.cipher.encrypt(JSON.stringify(configData));

		node.sharedConfigData = encrypted;
		node.sharedConfigBy = userId;

		await this.customNodeRepository.save(node);
	}

	/**
	 * 获取团队共享配置
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @returns 解密后的配置数据
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当节点不是共享模式或未配置时
	 */
	async getSharedConfig(nodeId: string, workspaceId: string): Promise<Record<string, unknown>> {
		const node = await this.getNodeById(nodeId, workspaceId);

		if (node.configMode !== 'shared') {
			throw new UserError('Node is not in shared config mode');
		}

		if (!node.sharedConfigData) {
			throw new UserError('Shared configuration not set');
		}

		// 解密配置数据
		const decrypted = this.cipher.decrypt(node.sharedConfigData);
		return JSON.parse(decrypted);
	}

	/**
	 * 切换配置模式
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @param mode - 新的配置模式
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 */
	async switchConfigMode(nodeId: string, workspaceId: string, mode: ConfigMode) {
		const node = await this.getNodeById(nodeId, workspaceId);

		node.configMode = mode;

		// 如果切换到个人模式，清除共享配置
		if (mode === 'personal') {
			node.sharedConfigData = null;
			node.sharedConfigBy = null;
		}

		await this.customNodeRepository.save(node);
	}

	/**
	 * 提交节点审核（可选功能）
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当节点已提交时
	 */
	async submitForReview(nodeId: string, workspaceId: string) {
		const node = await this.getNodeById(nodeId, workspaceId);

		if (node.submissionStatus && node.submissionStatus !== 'draft') {
			throw new UserError('Node has already been submitted');
		}

		node.submissionStatus = 'pending';
		node.submittedAt = new Date();

		await this.customNodeRepository.save(node);
	}

	/**
	 * 审核自定义节点（管理员功能）
	 *
	 * @param nodeId - 节点 ID
	 * @param reviewerId - 审核人 ID
	 * @param approved - 是否通过
	 * @param reviewNotes - 审核备注
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 */
	async reviewNode(nodeId: string, reviewerId: string, approved: boolean, reviewNotes?: string) {
		const node = await this.customNodeRepository.findOne({
			where: { id: nodeId },
		});

		if (!node) {
			throw new CustomNodeNotFoundError(nodeId);
		}

		node.submissionStatus = approved ? 'approved' : 'rejected';
		node.reviewedBy = reviewerId;
		node.reviewedAt = new Date();
		node.reviewNotes = reviewNotes || null;

		await this.customNodeRepository.save(node);
	}

	/**
	 * 获取所有待审核的自定义节点（管理员功能）
	 *
	 * @returns 待审核的节点列表
	 */
	async getPendingNodes() {
		return await this.customNodeRepository.find({
			where: { submissionStatus: 'pending' },
			relations: ['creator', 'workspace'],
			order: { submittedAt: 'DESC' },
		});
	}

	/**
	 * 启用/禁用节点
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID（用于权限验证）
	 * @param isActive - 是否激活
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 */
	async toggleNode(nodeId: string, workspaceId: string, isActive: boolean) {
		const node = await this.getNodeById(nodeId, workspaceId);
		node.isActive = isActive;
		await this.customNodeRepository.save(node);
	}

	/**
	 * 获取节点执行代码（带权限验证）
	 * 用于节点执行时获取代码
	 *
	 * @param nodeId - 节点 ID
	 * @param workspaceId - 工作空间 ID
	 * @returns 节点代码
	 * @throws {CustomNodeNotFoundError} 当节点不存在时
	 * @throws {UserError} 当用户无权访问节点时
	 */
	async getNodeCode(nodeId: string, workspaceId: string): Promise<string> {
		const node = await this.getNodeById(nodeId, workspaceId);
		return node.nodeCode;
	}

	/**
	 * 搜索自定义节点（在工作空间内）
	 *
	 * @param workspaceId - 工作空间 ID
	 * @param query - 搜索关键词
	 * @returns 匹配的节点列表
	 */
	async searchWorkspaceNodes(workspaceId: string, query: string) {
		const allNodes = await this.getWorkspaceNodes(workspaceId);
		const lowerQuery = query.toLowerCase();

		return allNodes.filter(
			(node: { nodeName: string; nodeKey: string; description: string | null }) =>
				node.nodeName.toLowerCase().includes(lowerQuery) ||
				node.nodeKey.toLowerCase().includes(lowerQuery) ||
				(node.description && node.description.toLowerCase().includes(lowerQuery)),
		);
	}

	/**
	 * 按分类分组获取工作空间节点
	 *
	 * @param workspaceId - 工作空间 ID
	 * @returns 按分类分组的节点映射
	 */
	async getNodesByCategory(workspaceId: string) {
		const nodes = await this.getWorkspaceNodes(workspaceId);

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
}
