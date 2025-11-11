import { AuthenticatedRequest, PlatformRagServiceRepository } from '@n8n/db';
import { RestController, Get, Post, Patch, Delete, Param, Body, Query } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { assertPlatformAdmin } from '@/auth/platform-admin.guard';

/**
 * Query DTOs for AdminRagServicesController
 */
interface ListRagServicesQueryDto {
	domain?: string;
	isActive?: boolean;
}

/**
 * AdminRagServicesController
 *
 * RAG 知识库服务管理控制器（管理员专用）
 *
 * 功能：
 * 1. 创建 RAG 知识库服务
 * 2. 更新 RAG 服务配置和定价
 * 3. 删除/禁用 RAG 服务
 * 4. 管理知识库元数据
 *
 * 权限要求：
 * - 所有接口都需要 global:admin 权限
 */
@RestController('/admin/rag-services')
export class AdminRagServicesController {
	constructor(private readonly platformRagServiceRepository: PlatformRagServiceRepository) {}

	/**
	 * 检查平台管理员权限
	 * @private
	 */
	private checkAdminPermission(req: AuthenticatedRequest): void {
		assertPlatformAdmin(req.user);
	}

	/**
	 * GET /admin/rag-services
	 * 获取所有 RAG 知识库服务列表
	 *
	 * @param query - 查询参数
	 * @returns RAG 服务列表
	 */
	@Get('/')
	async listServices(
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

		const services = await this.platformRagServiceRepository.find({
			where,
			order: { domain: 'ASC', createdAt: 'DESC' },
		});

		return services;
	}

	/**
	 * GET /admin/rag-services/:serviceKey
	 * 获取 RAG 服务详情
	 *
	 * @param serviceKey - 服务标识
	 * @returns RAG 服务详情
	 */
	@Get('/:serviceKey')
	async getService(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('serviceKey') serviceKey: string,
	) {
		this.checkAdminPermission(req);

		const service = await this.platformRagServiceRepository.findOne({
			where: { serviceKey },
		});

		if (!service) {
			throw new NotFoundError(`RAG service '${serviceKey}' not found`);
		}

		return service;
	}

	/**
	 * POST /admin/rag-services
	 * 创建 RAG 知识库服务
	 *
	 * @param body - RAG 服务数据
	 * @returns 创建的 RAG 服务
	 */
	@Post('/')
	async createService(
		req: AuthenticatedRequest,
		_res: Response,
		@Body
		body: {
			serviceKey: string;
			name: string;
			domain: string;
			pricePerQueryCny: number;
			metadata?: {
				knowledgeBaseSize?: number;
				lastUpdated?: string;
				coverageYears?: string;
				languages?: string[];
				updateFrequency?: string;
			};
			description?: string;
		},
	) {
		this.checkAdminPermission(req);

		// 验证必需字段
		if (!body.serviceKey) {
			throw new BadRequestError('serviceKey is required');
		}

		if (!body.name) {
			throw new BadRequestError('name is required');
		}

		if (!body.domain) {
			throw new BadRequestError('domain is required');
		}

		if (body.pricePerQueryCny === undefined || body.pricePerQueryCny < 0) {
			throw new BadRequestError('pricePerQueryCny is required and must be non-negative');
		}

		// 检查 serviceKey 是否已存在
		const existing = await this.platformRagServiceRepository.findOne({
			where: { serviceKey: body.serviceKey },
		});

		if (existing) {
			throw new BadRequestError(`RAG service '${body.serviceKey}' already exists`);
		}

		// 创建 RAG 服务
		const service = await this.platformRagServiceRepository.save({
			serviceKey: body.serviceKey,
			name: body.name,
			domain: body.domain,
			pricePerQueryCny: body.pricePerQueryCny,
			metadata: body.metadata ?? null,
			isActive: true,
		});

		return service;
	}

	/**
	 * PATCH /admin/rag-services/:serviceKey
	 * 更新 RAG 知识库服务
	 *
	 * @param serviceKey - 服务标识
	 * @param body - 更新数据
	 * @returns 更新后的 RAG 服务
	 */
	@Patch('/:serviceKey')
	async updateService(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('serviceKey') serviceKey: string,
		@Body
		body: {
			name?: string;
			domain?: string;
			pricePerQueryCny?: number;
			metadata?: Record<string, unknown>;
			isActive?: boolean;
			description?: string;
		},
	) {
		this.checkAdminPermission(req);

		const service = await this.platformRagServiceRepository.findOne({
			where: { serviceKey },
		});

		if (!service) {
			throw new NotFoundError(`RAG service '${serviceKey}' not found`);
		}

		// 更新字段
		if (body.name !== undefined) service.name = body.name;
		if (body.domain !== undefined) service.domain = body.domain;
		if (body.pricePerQueryCny !== undefined) {
			if (body.pricePerQueryCny < 0) {
				throw new BadRequestError('pricePerQueryCny must be non-negative');
			}
			service.pricePerQueryCny = body.pricePerQueryCny;
		}
		if (body.metadata !== undefined) service.metadata = body.metadata;
		if (body.isActive !== undefined) service.isActive = body.isActive;

		await this.platformRagServiceRepository.save(service);

		return service;
	}

	/**
	 * DELETE /admin/rag-services/:serviceKey
	 * 删除/禁用 RAG 服务（软删除）
	 *
	 * @param serviceKey - 服务标识
	 * @returns 成功标志
	 */
	@Delete('/:serviceKey')
	async deleteService(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('serviceKey') serviceKey: string,
	) {
		this.checkAdminPermission(req);

		const service = await this.platformRagServiceRepository.findOne({
			where: { serviceKey },
		});

		if (!service) {
			throw new NotFoundError(`RAG service '${serviceKey}' not found`);
		}

		// 软删除：设置为不活跃
		service.isActive = false;
		await this.platformRagServiceRepository.save(service);

		return { success: true, message: `RAG service '${serviceKey}' has been disabled` };
	}

	/**
	 * PATCH /admin/rag-services/:serviceKey/toggle
	 * 启用/禁用 RAG 服务
	 *
	 * @param serviceKey - 服务标识
	 * @param body - 启用/禁用标志
	 * @returns 成功标志
	 */
	@Patch('/:serviceKey/toggle')
	async toggleService(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('serviceKey') serviceKey: string,
		@Body body: { isActive: boolean },
	) {
		this.checkAdminPermission(req);

		const service = await this.platformRagServiceRepository.findOne({
			where: { serviceKey },
		});

		if (!service) {
			throw new NotFoundError(`RAG service '${serviceKey}' not found`);
		}

		service.isActive = body.isActive;
		await this.platformRagServiceRepository.save(service);

		return {
			success: true,
			message: `RAG service '${serviceKey}' ${body.isActive ? 'enabled' : 'disabled'} successfully`,
		};
	}

	/**
	 * GET /admin/rag-services/domains/list
	 * 获取所有知识库领域列表
	 *
	 * @returns 领域列表
	 */
	@Get('/domains/list')
	async listDomains(req: AuthenticatedRequest, _res: Response) {
		this.checkAdminPermission(req);

		const services = await this.platformRagServiceRepository.find({
			select: ['domain'],
		});

		// 去重并返回领域列表
		const domains = [...new Set(services.map((s) => s.domain))];

		return { domains };
	}
}
