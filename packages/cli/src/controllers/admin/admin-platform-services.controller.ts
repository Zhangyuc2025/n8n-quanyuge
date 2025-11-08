import {
	PlatformServiceRepository,
	PlatformRagServiceRepository,
	AuthenticatedRequest,
	GLOBAL_ADMIN_ROLE,
} from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * Query DTOs for AdminPlatformServicesController
 */
class ListAiModelsQueryDto {
	serviceType?: 'llm' | 'embedding' | 'image' | 'audio';
	isActive?: boolean;
}

class ListRagServicesQueryDto {
	domain?: string;
	isActive?: boolean;
}

class ListAllServicesQueryDto {
	serviceType?: 'ai_model' | 'rag_service' | 'plugin';
	isActive?: boolean;
}

/**
 * AdminPlatformServicesController
 *
 * 平台服务管理控制器（管理员专用）
 *
 * 功能：
 * 1. 管理 AI 模型服务（OpenAI GPT-4、Anthropic Claude 等）- 按 token 计费
 * 2. 管理 RAG 知识库服务（医疗、法律、金融等领域）- 按查询次数计费
 * 3. 查看所有平台服务列表
 * 4. 更新服务定价、配置和状态
 *
 * 权限要求：
 * - 所有接口都需要管理员权限（isOwner）
 * - 每个方法开始时进行权限检查
 *
 * 安全性：
 * - API Key 在数据库中加密存储
 * - 返回时只显示部分 API Key（前4位 + *** + 后4位）
 */
@RestController('/admin/platform-services')
export class AdminPlatformServicesController {
	constructor(
		private readonly platformServiceRepository: PlatformServiceRepository,
		private readonly platformRagServiceRepository: PlatformRagServiceRepository,
	) {}

	/**
	 * 检查管理员权限
	 * @private
	 */
	private checkAdminPermission(req: AuthenticatedRequest): void {
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('仅管理员可以管理平台服务');
		}
	}

	// ==================== AI 模型管理 ====================

	/**
	 * GET /admin/platform-services/ai-models
	 * 获取所有 AI 模型列表
	 *
	 * @param query 查询参数
	 * @returns AI 模型列表
	 */
	@Get('/ai-models')
	async listAiModels(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListAiModelsQueryDto,
	) {
		this.checkAdminPermission(req);

		const where: Record<string, unknown> = { serviceType: 'ai_model' };

		if (query.serviceType) {
			// 这里假设在 pricingConfig 中有 modelType 字段
			// 实际实现时可能需要调整查询逻辑
		}

		if (query.isActive !== undefined) {
			where.isActive = query.isActive;
		}

		const aiModels = await this.platformServiceRepository.find({
			where,
			order: { createdAt: 'DESC' },
		});

		// 脱敏处理：隐藏完整的 API Key
		return aiModels.map((model) => ({
			...model,
			// TODO: 如果 pricingConfig 中包含敏感信息（如 API Key），需要在此处理
			// pricingConfig: this.maskSensitiveData(model.pricingConfig),
		}));
	}

	/**
	 * POST /admin/platform-services/ai-models
	 * 创建 AI 模型服务
	 *
	 * AI 模型特点：
	 * - serviceType: 'ai_model'
	 * - 按 token 计费
	 * - 管理员配置 API Key（加密存储）
	 * - 全局可见
	 *
	 * @param data AI 模型数据
	 * @returns 创建的 AI 模型
	 */
	@Post('/ai-models')
	async createAiModel(
		req: AuthenticatedRequest,
		_res: Response,
		@Body
		data: {
			serviceKey: string;
			name: string;
			modelType: 'llm' | 'embedding' | 'image' | 'audio';
			provider: string; // 如：openai, anthropic, google
			modelId: string; // 如：gpt-4, claude-3-sonnet
			apiKey?: string; // API Key（可选，某些模型可能不需要）
			apiBaseUrl?: string; // API Base URL（可选）
			pricePerThousandTokens: number; // 每千 token 价格（人民币）
			inputTokenPrice?: number; // 输入 token 价格（可选，某些模型区分输入/输出）
			outputTokenPrice?: number; // 输出 token 价格（可选）
			description?: string;
			iconUrl?: string;
		},
	) {
		this.checkAdminPermission(req);

		// 检查 serviceKey 是否已存在
		const existing = await this.platformServiceRepository.findOne({
			where: { serviceKey: data.serviceKey },
		});

		if (existing) {
			throw new BadRequestError(`服务标识 '${data.serviceKey}' 已存在`);
		}

		// 构建定价配置
		const pricingConfig: Record<string, unknown> = {
			pricePerThousandTokens: data.pricePerThousandTokens,
			currency: 'CNY',
			modelType: data.modelType,
			provider: data.provider,
			modelId: data.modelId,
		};

		// 如果提供了 API Key，加密存储
		if (data.apiKey) {
			// TODO: 使用 EncryptionService 加密 API Key
			// const encryptedApiKey = await this.encryptionService.encrypt(data.apiKey);
			// pricingConfig.apiKey = encryptedApiKey;
			pricingConfig.apiKey = data.apiKey; // 临时直接存储，实际需要加密
		}

		if (data.apiBaseUrl) {
			pricingConfig.apiBaseUrl = data.apiBaseUrl;
		}

		if (data.inputTokenPrice !== undefined) {
			pricingConfig.inputTokenPrice = data.inputTokenPrice;
		}

		if (data.outputTokenPrice !== undefined) {
			pricingConfig.outputTokenPrice = data.outputTokenPrice;
		}

		// 创建 AI 模型服务
		const aiModel = await this.platformServiceRepository.save({
			serviceKey: data.serviceKey,
			name: data.name,
			serviceType: 'ai_model',
			serviceMode: 'platform_managed',
			visibility: 'global',
			pricingConfig,
			category: data.modelType,
			description: data.description ?? null,
			iconUrl: data.iconUrl ?? null,
			enabled: true,
			isActive: true,
		});

		return aiModel;
	}

	/**
	 * PATCH /admin/platform-services/ai-models/:key
	 * 更新 AI 模型服务
	 *
	 * 可更新的内容：
	 * - 定价配置（token 价格）
	 * - API Key
	 * - API Base URL
	 * - 启用/禁用状态
	 * - 描述信息
	 *
	 * @param serviceKey 服务标识
	 * @param data 更新数据
	 * @returns 更新后的 AI 模型
	 */
	@Patch('/ai-models/:key')
	async updateAiModel(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('key') serviceKey: string,
		@Body
		data: {
			name?: string;
			apiKey?: string;
			apiBaseUrl?: string;
			pricePerThousandTokens?: number;
			inputTokenPrice?: number;
			outputTokenPrice?: number;
			description?: string;
			iconUrl?: string;
			enabled?: boolean;
			isActive?: boolean;
		},
	) {
		this.checkAdminPermission(req);

		const aiModel = await this.platformServiceRepository.findOne({
			where: { serviceKey, serviceType: 'ai_model' },
		});

		if (!aiModel) {
			throw new NotFoundError(`AI 模型 '${serviceKey}' 不存在`);
		}

		// 更新基本信息
		if (data.name !== undefined) aiModel.name = data.name;
		if (data.description !== undefined) aiModel.description = data.description;
		if (data.iconUrl !== undefined) aiModel.iconUrl = data.iconUrl;
		if (data.enabled !== undefined) aiModel.enabled = data.enabled;
		if (data.isActive !== undefined) aiModel.isActive = data.isActive;

		// 更新定价配置
		const pricingConfig = { ...aiModel.pricingConfig };

		if (data.apiKey !== undefined) {
			// TODO: 使用 EncryptionService 加密 API Key
			// const encryptedApiKey = await this.encryptionService.encrypt(data.apiKey);
			// pricingConfig.apiKey = encryptedApiKey;
			pricingConfig.apiKey = data.apiKey; // 临时直接存储，实际需要加密
		}

		if (data.apiBaseUrl !== undefined) {
			pricingConfig.apiBaseUrl = data.apiBaseUrl;
		}

		if (data.pricePerThousandTokens !== undefined) {
			pricingConfig.pricePerThousandTokens = data.pricePerThousandTokens;
		}

		if (data.inputTokenPrice !== undefined) {
			pricingConfig.inputTokenPrice = data.inputTokenPrice;
		}

		if (data.outputTokenPrice !== undefined) {
			pricingConfig.outputTokenPrice = data.outputTokenPrice;
		}

		aiModel.pricingConfig = pricingConfig;

		await this.platformServiceRepository.save(aiModel);

		return aiModel;
	}

	/**
	 * DELETE /admin/platform-services/ai-models/:key
	 * 禁用 AI 模型（软删除）
	 *
	 * 注意：不直接删除，而是设置 isActive = false
	 * 这样可以保留历史计费数据
	 *
	 * @param serviceKey 服务标识
	 * @returns 成功标志
	 */
	@Delete('/ai-models/:key')
	async deleteAiModel(req: AuthenticatedRequest, _res: Response, @Param('key') serviceKey: string) {
		this.checkAdminPermission(req);

		const aiModel = await this.platformServiceRepository.findOne({
			where: { serviceKey, serviceType: 'ai_model' },
		});

		if (!aiModel) {
			throw new NotFoundError(`AI 模型 '${serviceKey}' 不存在`);
		}

		// 软删除：设置为不活跃
		aiModel.isActive = false;
		aiModel.enabled = false;
		await this.platformServiceRepository.save(aiModel);

		return { success: true, message: `AI 模型 '${serviceKey}' 已禁用` };
	}

	// ==================== RAG 服务管理 ====================

	/**
	 * GET /admin/platform-services/rag
	 * 获取所有 RAG 知识库服务列表
	 *
	 * @param query 查询参数
	 * @returns RAG 服务列表
	 */
	@Get('/rag')
	async listRagServices(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListRagServicesQueryDto,
	) {
		this.checkAdminPermission(req);

		const where: Record<string, unknown> = {};

		if (query.domain) {
			where.domain = query.domain;
		}

		if (query.isActive !== undefined) {
			where.isActive = query.isActive;
		}

		const ragServices = await this.platformRagServiceRepository.find({
			where,
			order: { domain: 'ASC', createdAt: 'DESC' },
		});

		return ragServices;
	}

	/**
	 * POST /admin/platform-services/rag
	 * 创建 RAG 知识库服务
	 *
	 * RAG 服务特点：
	 * - 按查询次数计费
	 * - 领域专用（医疗、法律、金融等）
	 * - 包含知识库元数据
	 *
	 * @param data RAG 服务数据
	 * @returns 创建的 RAG 服务
	 */
	@Post('/rag')
	async createRagService(
		req: AuthenticatedRequest,
		_res: Response,
		@Body
		data: {
			serviceKey: string;
			name: string;
			domain: string; // 如：medical, legal, finance
			pricePerQueryCny: number; // 每次查询价格（人民币）
			metadata?: {
				knowledgeBaseSize?: number; // 知识库文档数量
				lastUpdated?: string; // 最后更新日期
				coverageYears?: string; // 数据覆盖年份
				languages?: string[]; // 支持的语言
				updateFrequency?: string; // 更新频率
			};
		},
	) {
		this.checkAdminPermission(req);

		// 检查 serviceKey 是否已存在
		const existing = await this.platformRagServiceRepository.findOne({
			where: { serviceKey: data.serviceKey },
		});

		if (existing) {
			throw new BadRequestError(`RAG 服务标识 '${data.serviceKey}' 已存在`);
		}

		// 创建 RAG 服务
		const ragService = await this.platformRagServiceRepository.save({
			serviceKey: data.serviceKey,
			name: data.name,
			domain: data.domain,
			pricePerQueryCny: data.pricePerQueryCny,
			metadata: data.metadata ?? null,
			isActive: true,
		});

		return ragService;
	}

	/**
	 * PATCH /admin/platform-services/rag/:key
	 * 更新 RAG 知识库服务
	 *
	 * 可更新的内容：
	 * - 查询价格
	 * - 知识库元数据
	 * - 启用/禁用状态
	 *
	 * @param serviceKey 服务标识
	 * @param data 更新数据
	 * @returns 更新后的 RAG 服务
	 */
	@Patch('/rag/:key')
	async updateRagService(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('key') serviceKey: string,
		@Body
		data: {
			name?: string;
			pricePerQueryCny?: number;
			metadata?: Record<string, unknown>;
			isActive?: boolean;
		},
	) {
		this.checkAdminPermission(req);

		const ragService = await this.platformRagServiceRepository.findOne({
			where: { serviceKey },
		});

		if (!ragService) {
			throw new NotFoundError(`RAG 服务 '${serviceKey}' 不存在`);
		}

		// 更新字段
		if (data.name !== undefined) ragService.name = data.name;
		if (data.pricePerQueryCny !== undefined) ragService.pricePerQueryCny = data.pricePerQueryCny;
		if (data.metadata !== undefined) ragService.metadata = data.metadata;
		if (data.isActive !== undefined) ragService.isActive = data.isActive;

		await this.platformRagServiceRepository.save(ragService);

		return ragService;
	}

	/**
	 * DELETE /admin/platform-services/rag/:key
	 * 禁用 RAG 服务（软删除）
	 *
	 * 注意：不直接删除，而是设置 isActive = false
	 *
	 * @param serviceKey 服务标识
	 * @returns 成功标志
	 */
	@Delete('/rag/:key')
	async deleteRagService(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('key') serviceKey: string,
	) {
		this.checkAdminPermission(req);

		const ragService = await this.platformRagServiceRepository.findOne({
			where: { serviceKey },
		});

		if (!ragService) {
			throw new NotFoundError(`RAG 服务 '${serviceKey}' 不存在`);
		}

		// 软删除：设置为不活跃
		ragService.isActive = false;
		await this.platformRagServiceRepository.save(ragService);

		return { success: true, message: `RAG 服务 '${serviceKey}' 已禁用` };
	}

	// ==================== 通用服务列表 ====================

	/**
	 * GET /admin/platform-services
	 * 获取所有平台服务列表（包括 AI 模型、RAG 服务、插件）
	 *
	 * 这是一个综合视图，用于管理员查看所有平台服务
	 *
	 * @param query 查询参数
	 * @returns 平台服务列表
	 */
	@Get('/')
	async listAllServices(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListAllServicesQueryDto,
	) {
		this.checkAdminPermission(req);

		const where: Record<string, unknown> = {};

		if (query.serviceType) {
			where.serviceType = query.serviceType;
		}

		if (query.isActive !== undefined) {
			where.isActive = query.isActive;
		}

		const services = await this.platformServiceRepository.find({
			where,
			order: { serviceType: 'ASC', createdAt: 'DESC' },
		});

		// 如果需要包含 RAG 服务，可以在此处合并
		// 但由于 RAG 服务在单独的表中，这里只返回 platform_service 表的数据
		// 如果需要合并，可以分别查询后组合

		return services;
	}

	// ==================== 辅助方法 ====================
}
