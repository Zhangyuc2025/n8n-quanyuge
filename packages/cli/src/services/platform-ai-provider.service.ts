import { Service } from '@n8n/di';
import { PlatformAIProviderRepository } from '@n8n/db';
import { Cipher } from 'n8n-core';
import { Logger } from '@n8n/backend-common';
import { BillingService } from './billing.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UserError } from 'n8n-workflow';
import {
	BaseAIProviderAdapter,
	OpenAIAdapter,
	AnthropicAdapter,
	GoogleAdapter,
	AzureOpenAIAdapter,
	QwenAdapter,
	ErnieAdapter,
	GLMAdapter,
	GiteeAIAdapter,
	InfiniAIAdapter,
	type ChatRequest,
} from './ai-provider-adapters';

/**
 * AI 服务提供商未找到错误
 */
export class ProviderNotFoundError extends NotFoundError {
	constructor(providerKey: string) {
		super(`AI provider not found: ${providerKey}`);
	}
}

/**
 * 模型未找到错误
 */
export class ModelNotFoundError extends NotFoundError {
	constructor(modelId: string) {
		super(`Model not found: ${modelId}`);
	}
}

/**
 * AI 服务调用错误
 */
export class AIProviderError extends UserError {
	constructor(message: string) {
		super(`AI provider error: ${message}`);
	}
}

/**
 * AI 模型信息接口
 */
export interface AIModel {
	id: string;
	name: string;
	description: string;
	pricePerToken: number;
	currency: string;
	contextWindow: number;
	maxOutputTokens: number;
	supportsFunctions: boolean;
	supportsVision: boolean;
}

/**
 * 模型配置接口
 */
interface ModelsConfig {
	models: AIModel[];
}

/**
 * 多模态内容类型
 */
type MessageContentPart =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/**
 * 消息内容（支持多模态）
 *
 * - 纯文本：string
 * - 多模态（文本 + 图片）：MessageContentPart[]
 */
type MessageContent = string | MessageContentPart[];

/**
 * AI 聊天请求接口（支持多模态）
 */
interface ChatCompletionRequest {
	messages: Array<{ role: string; content: MessageContent }>;
	temperature?: number;
	maxTokens?: number;
}

/**
 * AI 聊天响应接口
 */
export interface ChatCompletionResponse {
	id: string;
	choices: Array<{
		message: {
			role: string;
			content: string;
		};
		finishReason: string;
	}>;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * 平台 AI 服务提供商管理服务
 *
 * 负责管理平台托管的 AI 服务提供商（OpenAI、Anthropic 等）的配置、调用和计费
 */
@Service()
export class PlatformAIProviderService {
	/** Provider 适配器缓存 */
	private readonly adapters = new Map<string, BaseAIProviderAdapter>();

	constructor(
		private readonly logger: Logger,
		private readonly providerRepository: PlatformAIProviderRepository,
		private readonly cipher: Cipher,
		private readonly billingService: BillingService,
	) {
		// 初始化 Provider 适配器
		this.initializeAdapters();
	}

	/**
	 * 初始化所有 Provider 适配器
	 */
	private initializeAdapters() {
		this.adapters.set('openai', new OpenAIAdapter(this.logger));
		this.adapters.set('anthropic', new AnthropicAdapter(this.logger));
		this.adapters.set('google', new GoogleAdapter(this.logger));
		this.adapters.set('azure', new AzureOpenAIAdapter(this.logger));
		this.adapters.set('qwen', new QwenAdapter(this.logger));
		this.adapters.set('ernie', new ErnieAdapter(this.logger));
		this.adapters.set('glm', new GLMAdapter(this.logger));
		this.adapters.set('gitee-ai', new GiteeAIAdapter(this.logger));
		this.adapters.set('infini-ai', new InfiniAIAdapter(this.logger));
	}

	/**
	 * 获取所有活跃的 AI 服务提供商
	 *
	 * @returns 活跃的 AI 服务提供商列表
	 */
	async getActiveProviders() {
		return await this.providerRepository.find({
			where: { isActive: true, enabled: true },
		});
	}

	/**
	 * 获取某个提供商的模型列表
	 *
	 * @param providerKey - 提供商标识（如 openai、anthropic）
	 * @returns 模型列表
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async getProviderModels(providerKey: string): Promise<AIModel[]> {
		const provider = await this.providerRepository.findOne({
			where: { providerKey },
		});

		if (!provider) {
			throw new ProviderNotFoundError(providerKey);
		}

		const modelsConfig = provider.modelsConfig as unknown as ModelsConfig;
		return modelsConfig.models || [];
	}

	/**
	 * 调用 AI 服务（统一接口，自动计费）
	 *
	 * @param providerKey - 提供商标识（如 openai、anthropic）
	 * @param modelId - 模型 ID（如 gpt-4-turbo、claude-3-opus）
	 * @param request - 聊天请求参数
	 * @param workspaceId - 工作空间 ID（用于计费）
	 * @param userId - 用户 ID（用于记录）
	 * @returns AI 响应
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 * @throws {ModelNotFoundError} 当模型不存在时
	 * @throws {AIProviderError} 当 API 调用失败时
	 */
	async chatCompletion(
		providerKey: string,
		modelId: string,
		request: ChatCompletionRequest,
		workspaceId: string,
		userId: string,
	): Promise<ChatCompletionResponse> {
		// 1. 获取提供商配置
		const provider = await this.providerRepository.findOne({
			where: { providerKey, isActive: true },
		});

		if (!provider) {
			throw new ProviderNotFoundError(providerKey);
		}

		// 2. 解密 API Key
		const apiKey = this.cipher.decrypt(provider.apiKeyEncrypted);

		// 3. 查找模型配置
		const modelsConfig = provider.modelsConfig as unknown as ModelsConfig;
		const model = modelsConfig.models?.find((m) => m.id === modelId);

		if (!model) {
			throw new ModelNotFoundError(modelId);
		}

		// 4. 检查余额（预估费用）
		const estimatedTokens = this.estimateTokens(request.messages);
		const estimatedCost = (estimatedTokens * model.pricePerToken) / 1000;

		const currentBalance = await this.billingService.getBalance(workspaceId);
		if (currentBalance < estimatedCost) {
			throw new UserError(
				`Insufficient balance. Required: ${estimatedCost.toFixed(4)} CNY, Available: ${currentBalance.toFixed(4)} CNY`,
			);
		}

		// 5. 调用 AI API
		const response = await this.callProviderAPI(
			providerKey,
			provider.apiEndpoint,
			apiKey,
			modelId,
			request,
		);

		// 6. 记录使用量并扣费
		const actualTokens = response.usage.totalTokens;
		const actualCost = (actualTokens * model.pricePerToken) / 1000;

		await this.billingService.deductBalance(workspaceId, actualCost, {
			serviceKey: `${providerKey}:${modelId}`,
			userId,
			tokensUsed: actualTokens,
		});

		return response;
	}

	/**
	 * 调用提供商 API（使用适配器）
	 *
	 * @param providerKey - 提供商标识
	 * @param endpoint - API 端点
	 * @param apiKey - API Key
	 * @param modelId - 模型 ID
	 * @param request - 请求参数
	 * @returns API 响应
	 * @throws {AIProviderError} 当 API 调用失败时
	 */
	private async callProviderAPI(
		providerKey: string,
		endpoint: string,
		apiKey: string,
		modelId: string,
		request: ChatCompletionRequest,
	): Promise<ChatCompletionResponse> {
		// 获取适配器
		const adapter = this.adapters.get(providerKey);
		if (!adapter) {
			throw new AIProviderError(`No adapter found for provider: ${providerKey}`);
		}

		// 转换请求格式
		const chatRequest: ChatRequest = {
			model: modelId,
			messages: request.messages.map((msg) => ({
				role: msg.role as 'system' | 'user' | 'assistant',
				content: msg.content,
			})),
			temperature: request.temperature,
			max_tokens: request.maxTokens,
		};

		try {
			// 调用适配器（带重试和熔断保护）
			const response = await adapter.call(apiKey, endpoint, chatRequest);

			// 转换响应格式
			return {
				id: response.id,
				choices: response.choices.map((choice) => ({
					message: {
						role: choice.message.role,
						content: choice.message.content,
					},
					finishReason: choice.finish_reason,
				})),
				usage: {
					promptTokens: response.usage.prompt_tokens,
					completionTokens: response.usage.completion_tokens,
					totalTokens: response.usage.total_tokens,
				},
			};
		} catch (error) {
			this.logger.error('AI Provider API call failed', {
				provider: providerKey,
				model: modelId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	/**
	 * 预估 token 数量（支持多模态）
	 *
	 * 文本估算：平均 1 个 token ≈ 0.75 个单词 ≈ 4 个字符
	 * 图片估算：
	 * - detail=low: 85 tokens
	 * - detail=high: 根据图片尺寸，512px 方块约 170 tokens，最多 1280 tokens
	 * - detail=auto: 默认按 high 估算（保守）
	 *
	 * @param messages - 消息列表
	 * @returns 估算的 token 数量
	 */
	private estimateTokens(messages: Array<{ role: string; content: MessageContent }>): number {
		let totalTokens = 0;

		for (const msg of messages) {
			if (typeof msg.content === 'string') {
				// 纯文本消息
				totalTokens += Math.ceil(msg.content.length / 4);
			} else {
				// 多模态消息（数组）
				for (const part of msg.content) {
					if (part.type === 'text') {
						totalTokens += Math.ceil(part.text.length / 4);
					} else if (part.type === 'image_url') {
						// 图片 token 估算
						const detail = part.image_url.detail || 'auto';
						if (detail === 'low') {
							totalTokens += 85;
						} else {
							// high 或 auto：保守估算 800 tokens（中等尺寸图片）
							totalTokens += 800;
						}
					}
				}
			}
		}

		// 加上角色和格式开销（每条消息约 4 个 token）
		totalTokens += messages.length * 4;

		return totalTokens;
	}

	/**
	 * 获取提供商详情
	 *
	 * @param providerKey - 提供商标识
	 * @returns 提供商实体
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async getProvider(providerKey: string) {
		const provider = await this.providerRepository.findOne({
			where: { providerKey },
		});

		if (!provider) {
			throw new ProviderNotFoundError(providerKey);
		}

		return provider;
	}

	/**
	 * 更新提供商配置（管理员功能）
	 *
	 * @param providerKey - 提供商标识
	 * @param updates - 更新内容
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async updateProvider(
		providerKey: string,
		updates: {
			apiKey?: string;
			modelsConfig?: ModelsConfig;
			quotaConfig?: Record<string, unknown>;
			enabled?: boolean;
		},
	) {
		const provider = await this.getProvider(providerKey);

		if (updates.apiKey !== undefined) {
			provider.apiKeyEncrypted = this.cipher.encrypt(updates.apiKey);
		}

		if (updates.modelsConfig !== undefined) {
			provider.modelsConfig = updates.modelsConfig as unknown as Record<string, unknown>;
		}

		if (updates.quotaConfig !== undefined) {
			provider.quotaConfig = updates.quotaConfig;
		}

		if (updates.enabled !== undefined) {
			provider.enabled = updates.enabled;
		}

		await this.providerRepository.save(provider);
	}

	/**
	 * 创建新的 AI 服务提供商（管理员功能）
	 *
	 * @param data - 提供商数据
	 * @returns 创建的提供商实体
	 * @throws {UserError} 当提供商已存在时
	 */
	async createProvider(data: {
		providerKey: string;
		providerName: string;
		apiKey: string;
		apiEndpoint: string;
		modelsConfig: ModelsConfig;
		quotaConfig?: Record<string, unknown>;
		enabled?: boolean;
	}) {
		// 检查提供商是否已存在
		const existing = await this.providerRepository.findOne({
			where: { providerKey: data.providerKey },
		});

		if (existing) {
			throw new UserError(`AI provider with key '${data.providerKey}' already exists`);
		}

		// 加密 API Key
		const apiKeyEncrypted = this.cipher.encrypt(data.apiKey);

		// 创建提供商实体
		const provider = this.providerRepository.create({
			providerKey: data.providerKey,
			providerName: data.providerName,
			apiKeyEncrypted,
			apiEndpoint: data.apiEndpoint,
			modelsConfig: data.modelsConfig as unknown as Record<string, unknown>,
			quotaConfig: data.quotaConfig || null,
			isActive: true,
			enabled: data.enabled !== undefined ? data.enabled : true,
		});

		return await this.providerRepository.save(provider);
	}

	/**
	 * 删除 AI 服务提供商（管理员功能，软删除）
	 *
	 * @param providerKey - 提供商标识
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async deleteProvider(providerKey: string) {
		const provider = await this.getProvider(providerKey);

		// 软删除：设置为非激活状态
		provider.isActive = false;
		provider.enabled = false;

		await this.providerRepository.save(provider);
	}

	/**
	 * 硬删除 AI 服务提供商（管理员功能，永久删除）
	 *
	 * @param providerKey - 提供商标识
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async hardDeleteProvider(providerKey: string) {
		const provider = await this.getProvider(providerKey);

		// 硬删除：从数据库中永久删除
		await this.providerRepository.remove(provider);
	}

	/**
	 * 启用/禁用 AI 服务提供商（管理员功能）
	 *
	 * @param providerKey - 提供商标识
	 * @param enabled - 是否启用
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async toggleProvider(providerKey: string, enabled: boolean) {
		const provider = await this.getProvider(providerKey);
		provider.enabled = enabled;
		await this.providerRepository.save(provider);
	}

	/**
	 * 更新 API 密钥（管理员功能）
	 *
	 * @param providerKey - 提供商标识
	 * @param apiKey - 新的 API 密钥
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async updateApiKey(providerKey: string, apiKey: string) {
		const provider = await this.getProvider(providerKey);
		provider.apiKeyEncrypted = this.cipher.encrypt(apiKey);
		await this.providerRepository.save(provider);
	}

	/**
	 * 更新定价配置（管理员功能）
	 *
	 * @param providerKey - 提供商标识
	 * @param modelsConfig - 新的模型配置
	 * @throws {ProviderNotFoundError} 当提供商不存在时
	 */
	async updatePricing(providerKey: string, modelsConfig: ModelsConfig) {
		const provider = await this.getProvider(providerKey);
		provider.modelsConfig = modelsConfig as unknown as Record<string, unknown>;
		await this.providerRepository.save(provider);
	}

	/**
	 * 获取所有提供商（管理员功能）
	 *
	 * @param filters - 过滤条件
	 * @returns 提供商列表
	 */
	async getAllProviders(filters?: { isActive?: boolean; enabled?: boolean }) {
		const where: Record<string, unknown> = {};

		if (filters?.isActive !== undefined) {
			where.isActive = filters.isActive;
		}

		if (filters?.enabled !== undefined) {
			where.enabled = filters.enabled;
		}

		return await this.providerRepository.find({
			where: Object.keys(where).length > 0 ? where : undefined,
			order: { providerKey: 'ASC' },
		});
	}
}
