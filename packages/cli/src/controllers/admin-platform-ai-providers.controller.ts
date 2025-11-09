import { AuthenticatedRequest, GLOBAL_ADMIN_ROLE } from '@n8n/db';
import { RestController, Get, Post, Patch, Delete, Param, Body, Query } from '@n8n/decorators';
import type { Response } from 'express';

import { PlatformAIProviderService } from '@/services/platform-ai-provider.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * Query DTOs for AdminPlatformAIProvidersController
 */
interface ListProvidersQueryDto {
	isActive?: boolean;
	enabled?: boolean;
}

/**
 * AdminPlatformAIProvidersController
 *
 * AI 服务提供商管理控制器（管理员专用）
 *
 * 功能：
 * 1. 创建 AI 服务提供商
 * 2. 更新 AI 服务提供商配置
 * 3. 删除/禁用 AI 服务提供商
 * 4. 管理 API Key 和定价配置
 *
 * 权限要求：
 * - 所有接口都需要 global:admin 权限
 */
@RestController('/admin/platform-ai-providers')
export class AdminPlatformAIProvidersController {
	constructor(private readonly providerService: PlatformAIProviderService) {}

	/**
	 * 检查管理员权限
	 * @private
	 */
	private checkAdminPermission(req: AuthenticatedRequest): void {
		if (req.user.role.slug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only administrators can manage AI providers');
		}
	}

	/**
	 * GET /admin/platform-ai-providers
	 * 获取所有 AI 服务提供商列表（包括未激活的）
	 *
	 * @param query - 查询参数
	 * @returns AI 服务提供商列表
	 */
	@Get('/')
	async listProviders(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListProvidersQueryDto,
	) {
		this.checkAdminPermission(req);

		// 管理员可以看到所有提供商，包括未激活的
		const filters: { isActive?: boolean; enabled?: boolean } = {};

		if (query.isActive !== undefined) {
			filters.isActive = query.isActive;
		}

		if (query.enabled !== undefined) {
			filters.enabled = query.enabled;
		}

		return await this.providerService.getAllProviders(filters);
	}

	/**
	 * POST /admin/platform-ai-providers
	 * 创建 AI 服务提供商
	 *
	 * @param body - 提供商数据
	 * @returns 创建的提供商
	 */
	@Post('/')
	async createProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Body
		_body: {
			providerKey: string;
			providerName: string;
			apiEndpoint: string;
			apiKey: string;
			modelsConfig: {
				models: Array<{
					id: string;
					name: string;
					description: string;
					pricePerToken: number;
					currency: string;
					contextWindow: number;
					maxOutputTokens: number;
					supportsFunctions: boolean;
					supportsVision: boolean;
				}>;
			};
			quotaConfig?: {
				monthlyTokens?: number;
				currentUsed?: number;
			};
			enabled?: boolean;
		},
	) {
		this.checkAdminPermission(req);

		// 验证必需字段
		if (!_body.providerKey) {
			throw new BadRequestError('providerKey is required');
		}

		if (!_body.providerName) {
			throw new BadRequestError('providerName is required');
		}

		if (!_body.apiEndpoint) {
			throw new BadRequestError('apiEndpoint is required');
		}

		if (!_body.apiKey) {
			throw new BadRequestError('apiKey is required');
		}

		if (
			!_body.modelsConfig ||
			!_body.modelsConfig.models ||
			_body.modelsConfig.models.length === 0
		) {
			throw new BadRequestError('modelsConfig is required and must have at least one model');
		}

		return await this.providerService.createProvider({
			providerKey: _body.providerKey,
			providerName: _body.providerName,
			apiKey: _body.apiKey,
			apiEndpoint: _body.apiEndpoint,
			modelsConfig: _body.modelsConfig,
			quotaConfig: _body.quotaConfig,
			enabled: _body.enabled,
		});
	}

	/**
	 * PATCH /admin/platform-ai-providers/:providerKey
	 * 更新 AI 服务提供商
	 *
	 * @param providerKey - 提供商标识
	 * @param body - 更新数据
	 * @returns 更新后的提供商
	 */
	@Patch('/:providerKey')
	async updateProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
		@Body
		_body: {
			apiKey?: string;
			modelsConfig?: {
				models: Array<{
					id: string;
					name: string;
					description: string;
					pricePerToken: number;
					currency: string;
					contextWindow: number;
					maxOutputTokens: number;
					supportsFunctions: boolean;
					supportsVision: boolean;
				}>;
			};
			quotaConfig?: Record<string, unknown>;
			enabled?: boolean;
		},
	) {
		this.checkAdminPermission(req);

		// 获取提供商
		const provider = await this.providerService.getProvider(providerKey);

		if (!provider) {
			throw new NotFoundError(`AI provider '${providerKey}' not found`);
		}

		await this.providerService.updateProvider(providerKey, _body);

		// 返回更新后的提供商
		return await this.providerService.getProvider(providerKey);
	}

	/**
	 * DELETE /admin/platform-ai-providers/:providerKey
	 * 删除/禁用 AI 服务提供商
	 *
	 * @param providerKey - 提供商标识
	 * @returns 成功标志
	 */
	@Delete('/:providerKey')
	async deleteProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	) {
		this.checkAdminPermission(req);

		// 获取提供商
		const provider = await this.providerService.getProvider(providerKey);

		if (!provider) {
			throw new NotFoundError(`AI provider '${providerKey}' not found`);
		}

		await this.providerService.deleteProvider(providerKey);

		return { success: true };
	}

	/**
	 * PATCH /admin/platform-ai-providers/:providerKey/toggle
	 * 启用/禁用 AI 服务提供商
	 *
	 * @param providerKey - 提供商标识
	 * @param body - 启用/禁用标志
	 * @returns 成功标志
	 */
	@Patch('/:providerKey/toggle')
	async toggleProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
		@Body _body: { enabled: boolean },
	) {
		this.checkAdminPermission(req);

		// 获取提供商
		const provider = await this.providerService.getProvider(providerKey);

		if (!provider) {
			throw new NotFoundError(`AI provider '${providerKey}' not found`);
		}

		await this.providerService.toggleProvider(providerKey, _body.enabled);

		return { success: true, enabled: _body.enabled };
	}

	/**
	 * GET /admin/platform-ai-providers/:providerKey
	 * 获取 AI 服务提供商详情（包括敏感信息）
	 *
	 * @param providerKey - 提供商标识
	 * @returns 提供商详情
	 */
	@Get('/:providerKey')
	async getProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	) {
		this.checkAdminPermission(req);

		const provider = await this.providerService.getProvider(providerKey);

		if (!provider) {
			throw new NotFoundError(`AI provider '${providerKey}' not found`);
		}

		// 管理员可以看到完整信息（包括 API Key）
		return provider;
	}
}
