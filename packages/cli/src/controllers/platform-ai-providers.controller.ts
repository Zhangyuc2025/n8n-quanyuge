import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Param, Body } from '@n8n/decorators';
import type { Response } from 'express';

import { PlatformAIProviderService } from '@/services/platform-ai-provider.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Request DTOs for PlatformAIProvidersController
 */
interface ChatCompletionRequestDto {
	model: string;
	messages: Array<{ role: string; content: string }>;
	temperature?: number;
	maxTokens?: number;
}

/**
 * PlatformAIProvidersController
 *
 * AI 服务提供商控制器
 *
 * 功能：
 * 1. 获取所有可用的 AI 服务提供商
 * 2. 获取某个提供商的模型列表
 * 3. 调用 AI 聊天接口（自动计费）
 *
 * 权限要求：
 * - 所有接口都需要用户登录
 */
@RestController('/platform-ai-providers')
export class PlatformAIProvidersController {
	constructor(private readonly providerService: PlatformAIProviderService) {}

	/**
	 * GET /platform-ai-providers
	 * 获取所有可用的 AI 服务提供商
	 *
	 * @returns 活跃的 AI 服务提供商列表
	 */
	@Get('/')
	async getProviders(_req: AuthenticatedRequest, _res: Response) {
		return await this.providerService.getActiveProviders();
	}

	/**
	 * GET /platform-ai-providers/:providerKey/models
	 * 获取某个提供商的模型列表
	 *
	 * @param providerKey - 提供商标识（如 openai、anthropic）
	 * @returns 模型列表
	 */
	@Get('/:providerKey/models')
	async getProviderModels(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	) {
		return await this.providerService.getProviderModels(providerKey);
	}

	/**
	 * POST /platform-ai-providers/:providerKey/chat/completions
	 * 调用 AI 聊天接口（自动计费）
	 *
	 * 此接口将：
	 * 1. 使用平台配置的 API Key 调用 AI 服务
	 * 2. 根据实际使用的 token 数量自动从工作空间余额扣费
	 * 3. 记录使用量到计费系统
	 *
	 * @param providerKey - 提供商标识
	 * @param body - 聊天请求参数
	 * @returns AI 响应
	 */
	@Post('/:providerKey/chat/completions')
	async chatCompletion(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
		@Body body: ChatCompletionRequestDto,
	) {
		// 从请求中获取当前用户和工作空间信息
		const userId = req.user.id;

		// 获取当前用户的工作空间 ID
		// 注意：这里需要根据实际的多租户实现获取 workspaceId
		// 假设用户有一个当前工作空间的属性
		const workspaceId = (req.user as unknown as { currentWorkspaceId?: string }).currentWorkspaceId;

		if (!workspaceId) {
			throw new BadRequestError('Workspace not found. Please select a workspace first.');
		}

		// 验证请求参数
		if (!body.model) {
			throw new BadRequestError('Model is required');
		}

		if (!body.messages || body.messages.length === 0) {
			throw new BadRequestError('Messages are required');
		}

		// 调用 AI 服务（自动计费）
		return await this.providerService.chatCompletion(
			providerKey,
			body.model,
			{
				messages: body.messages,
				temperature: body.temperature,
				maxTokens: body.maxTokens,
			},
			workspaceId,
			userId,
		);
	}

	/**
	 * GET /platform-ai-providers/:providerKey
	 * 获取提供商详情
	 *
	 * @param providerKey - 提供商标识
	 * @returns 提供商详情
	 */
	@Get('/:providerKey')
	async getProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	) {
		const provider = await this.providerService.getProvider(providerKey);

		// 不返回加密的 API Key
		return {
			providerKey: provider.providerKey,
			providerName: provider.providerName,
			apiEndpoint: provider.apiEndpoint,
			modelsConfig: provider.modelsConfig,
			quotaConfig: provider.quotaConfig,
			isActive: provider.isActive,
			enabled: provider.enabled,
		};
	}
}
