/**
 * AI Provider 适配器系统
 *
 * 基于最佳实践实现统一的 AI Provider 接口，支持：
 * - 多种国内外大模型（OpenAI、Anthropic、通义千问、文心一言、智谱等）
 * - 智能重试机制（指数退避）
 * - 熔断器模式（三状态：关闭 → 打开 → 半开）
 * - 统一错误处理
 * - 请求/响应标准化
 *
 * 参考：
 * - One-API 项目架构
 * - Vercel AI SDK 设计
 * - 阿里 Sentinel 熔断模式
 */

import type { Logger } from '@n8n/backend-common';

/**
 * 标准化的消息内容（支持多模态）
 */
export type MessageContent =
	| string
	| Array<
			| { type: 'text'; text: string }
			| { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
	  >;

/**
 * 标准化的聊天请求（OpenAI 格式）
 */
export interface ChatRequest {
	model: string;
	messages: Array<{
		role: 'system' | 'user' | 'assistant';
		content: MessageContent;
	}>;
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
	stream?: boolean;
}

/**
 * 标准化的聊天响应（OpenAI 格式）
 */
export interface ChatResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

/**
 * AI Provider 错误类型
 */
export class AIProviderError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly provider?: string,
		public readonly retryable: boolean = false,
	) {
		super(message);
		this.name = 'AIProviderError';
	}
}

/**
 * 熔断器状态
 */
enum CircuitState {
	CLOSED = 'CLOSED', // 正常状态
	OPEN = 'OPEN', // 熔断状态（快速失败）
	HALF_OPEN = 'HALF_OPEN', // 半开状态（尝试恢复）
}

/**
 * 熔断器配置
 */
interface CircuitBreakerConfig {
	failureThreshold: number; // 失败阈值（连续失败多少次后熔断）
	successThreshold: number; // 成功阈值（半开状态下成功多少次后恢复）
	timeout: number; // 熔断超时时间（毫秒）
}

/**
 * 熔断器实现
 *
 * 三状态模式：
 * - CLOSED：正常调用，统计失败次数
 * - OPEN：拒绝调用，直接返回错误
 * - HALF_OPEN：尝试调用，根据结果决定恢复或继续熔断
 */
class CircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED;
	private failureCount = 0;
	private successCount = 0;
	private nextAttempt: number = Date.now();

	constructor(
		private readonly config: CircuitBreakerConfig,
		private readonly logger: Logger,
		private readonly name: string,
	) {}

	/**
	 * 执行请求（带熔断保护）
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// 检查熔断状态
		if (this.state === CircuitState.OPEN) {
			if (Date.now() < this.nextAttempt) {
				throw new AIProviderError(`Circuit breaker is OPEN for ${this.name}`, 503, this.name, true);
			}
			// 超时后进入半开状态
			this.state = CircuitState.HALF_OPEN;
			this.successCount = 0;
			this.logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error as Error);
			throw error;
		}
	}

	/**
	 * 请求成功回调
	 */
	private onSuccess() {
		this.failureCount = 0;

		if (this.state === CircuitState.HALF_OPEN) {
			this.successCount++;
			if (this.successCount >= this.config.successThreshold) {
				this.state = CircuitState.CLOSED;
				this.logger.info(`Circuit breaker ${this.name} recovered to CLOSED state`);
			}
		}
	}

	/**
	 * 请求失败回调
	 */
	private onFailure(error: Error) {
		this.failureCount++;

		if (this.state === CircuitState.HALF_OPEN) {
			// 半开状态失败，立即回到熔断状态
			this.state = CircuitState.OPEN;
			this.nextAttempt = Date.now() + this.config.timeout;
			this.logger.warn(`Circuit breaker ${this.name} back to OPEN state`, { error });
		} else if (this.failureCount >= this.config.failureThreshold) {
			// 达到失败阈值，进入熔断状态
			this.state = CircuitState.OPEN;
			this.nextAttempt = Date.now() + this.config.timeout;
			this.logger.error(`Circuit breaker ${this.name} tripped to OPEN state`, {
				failureCount: this.failureCount,
			});
		}
	}

	/**
	 * 获取当前状态
	 */
	getState(): CircuitState {
		return this.state;
	}
}

/**
 * 重试配置
 */
interface RetryConfig {
	maxAttempts: number; // 最大重试次数
	initialDelay: number; // 初始延迟（毫秒）
	maxDelay: number; // 最大延迟（毫秒）
	backoffFactor: number; // 退避因子
}

/**
 * AI Provider 适配器基类
 *
 * 提供通用功能：
 * - 智能重试（指数退避）
 * - 熔断器保护
 * - 错误分类和处理
 * - 请求/响应日志
 */
export abstract class BaseAIProviderAdapter {
	protected readonly circuitBreaker: CircuitBreaker;
	protected readonly retryConfig: RetryConfig = {
		maxAttempts: 3, // 生产环境推荐 3 次
		initialDelay: 1000, // 1 秒
		maxDelay: 10000, // 10 秒
		backoffFactor: 2, // 指数增长
	};

	constructor(
		protected readonly logger: Logger,
		protected readonly providerName: string,
	) {
		// 初始化熔断器
		this.circuitBreaker = new CircuitBreaker(
			{
				failureThreshold: 5, // 连续失败 5 次后熔断
				successThreshold: 2, // 半开状态成功 2 次后恢复
				timeout: 30000, // 30 秒后尝试恢复
			},
			logger,
			providerName,
		);
	}

	/**
	 * 调用 AI Provider（带重试和熔断保护）
	 */
	async call(apiKey: string, endpoint: string, request: ChatRequest): Promise<ChatResponse> {
		return this.circuitBreaker.execute(() => this.callWithRetry(apiKey, endpoint, request));
	}

	/**
	 * 带重试的调用
	 */
	private async callWithRetry(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
			try {
				this.logger.debug(`Calling ${this.providerName} API`, {
					attempt,
					model: request.model,
				});

				const response = await this.callAPI(apiKey, endpoint, request);

				this.logger.debug(`${this.providerName} API call successful`, {
					attempt,
					model: request.model,
					usage: response.usage,
				});

				return response;
			} catch (error) {
				lastError = error as Error;

				// 判断是否可重试
				if (!this.isRetryableError(error as AIProviderError)) {
					this.logger.warn(`${this.providerName} non-retryable error`, {
						error: (error as Error).message,
						attempt,
					});
					throw error;
				}

				// 最后一次尝试，直接抛出
				if (attempt === this.retryConfig.maxAttempts) {
					break;
				}

				// 计算退避延迟
				const delay = Math.min(
					this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
					this.retryConfig.maxDelay,
				);

				this.logger.warn(`${this.providerName} retrying after error`, {
					error: (error as Error).message,
					attempt,
					nextAttempt: attempt + 1,
					delay,
				});

				await this.sleep(delay);
			}
		}

		// 所有重试失败
		this.logger.error(`${this.providerName} all retries exhausted`, {
			error: lastError?.message,
		});
		throw lastError;
	}

	/**
	 * 判断错误是否可重试
	 *
	 * 可重试的错误：
	 * - 429 Too Many Requests（速率限制）
	 * - 500 Internal Server Error
	 * - 502 Bad Gateway
	 * - 503 Service Unavailable
	 * - 504 Gateway Timeout
	 * - 网络错误
	 *
	 * 不可重试的错误：
	 * - 4xx 客户端错误（除了 429）
	 * - 401 Unauthorized
	 * - 400 Bad Request
	 */
	protected isRetryableError(error: AIProviderError): boolean {
		// 明确标记为可重试
		if (error.retryable) {
			return true;
		}

		// 根据状态码判断
		if (error.statusCode) {
			const retryableStatusCodes = [429, 500, 502, 503, 504];
			return retryableStatusCodes.includes(error.statusCode);
		}

		// 网络错误（无状态码）默认可重试
		return true;
	}

	/**
	 * 延迟函数
	 */
	protected sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * 子类必须实现：调用具体 Provider 的 API
	 */
	protected abstract callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse>;

	/**
	 * 标准化响应（子类可覆盖）
	 */
	protected normalizeResponse(rawResponse: any): ChatResponse {
		// 默认假设返回的就是 OpenAI 格式
		return rawResponse;
	}
}

/**
 * OpenAI 适配器
 */
export class OpenAIAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'OpenAI');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		const url = `${endpoint || 'https://api.openai.com/v1'}/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`OpenAI API error: ${response.statusText} - ${errorText}`,
				response.status,
				'openai',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * Anthropic (Claude) 适配器
 *
 * Anthropic 使用不同的 API 格式，需要转换
 */
export class AnthropicAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'Anthropic');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		const url = `${endpoint || 'https://api.anthropic.com'}/v1/messages`;

		// 转换为 Anthropic 格式
		const anthropicRequest = this.toAnthropicFormat(request);

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify(anthropicRequest),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Anthropic API error: ${response.statusText} - ${errorText}`,
				response.status,
				'anthropic',
				response.status === 429 || response.status >= 500,
			);
		}

		const anthropicResponse = await response.json();
		return this.toOpenAIFormat(anthropicResponse, request.model);
	}

	/**
	 * 转换 OpenAI 格式到 Anthropic 格式
	 */
	private toAnthropicFormat(request: ChatRequest) {
		// Anthropic 的 system 消息是单独字段
		const systemMessage = request.messages.find((m) => m.role === 'system');
		const messages = request.messages.filter((m) => m.role !== 'system');

		return {
			model: request.model,
			max_tokens: request.max_tokens || 4096,
			temperature: request.temperature,
			top_p: request.top_p,
			system: systemMessage?.content,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
		};
	}

	/**
	 * 转换 Anthropic 响应到 OpenAI 格式
	 */
	private toOpenAIFormat(anthropicResponse: any, model: string): ChatResponse {
		return {
			id: anthropicResponse.id,
			object: 'chat.completion',
			created: Date.now() / 1000,
			model,
			choices: [
				{
					index: 0,
					message: {
						role: 'assistant',
						content: anthropicResponse.content[0]?.text || '',
					},
					finish_reason: anthropicResponse.stop_reason || 'stop',
				},
			],
			usage: {
				prompt_tokens: anthropicResponse.usage.input_tokens,
				completion_tokens: anthropicResponse.usage.output_tokens,
				total_tokens: anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens,
			},
		};
	}
}

/**
 * Google Gemini 适配器
 *
 * Gemini 支持 OpenAI 兼容格式（通过特定端点）
 */
export class GoogleAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'Google');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// Gemini OpenAI 兼容端点
		const url = `${endpoint || 'https://generativelanguage.googleapis.com/v1beta'}/openai/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Google API error: ${response.statusText} - ${errorText}`,
				response.status,
				'google',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * 阿里云通义千问适配器
 *
 * 通义千问支持 OpenAI 兼容格式
 */
export class QwenAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'Qwen');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// 通义千问 OpenAI 兼容端点
		const url = `${endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1'}/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Qwen API error: ${response.statusText} - ${errorText}`,
				response.status,
				'qwen',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * 百度文心一言适配器
 *
 * 文心一言支持 OpenAI 兼容格式
 */
export class ErnieAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'Ernie');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// 文心一言 OpenAI 兼容端点
		const url = `${endpoint || 'https://qianfan.baidubce.com'}/v2/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Ernie API error: ${response.statusText} - ${errorText}`,
				response.status,
				'ernie',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * 智谱 GLM 适配器
 *
 * GLM 支持 OpenAI 兼容格式
 */
export class GLMAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'GLM');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// GLM OpenAI 兼容端点
		const url = `${endpoint || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`GLM API error: ${response.statusText} - ${errorText}`,
				response.status,
				'glm',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * Azure OpenAI 适配器
 */
export class AzureOpenAIAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'Azure');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// Azure 需要在 URL 中指定 deployment-id
		const url = `${endpoint}/openai/deployments/${request.model}/chat/completions?api-version=2024-02-15-preview`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'api-key': apiKey,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Azure API error: ${response.statusText} - ${errorText}`,
				response.status,
				'azure',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * Gitee AI 适配器（聚合平台）
 *
 * Gitee AI 是国内的 AI 模型聚合平台，提供：
 * - 70+ 主流大模型统一接口
 * - OpenAI 格式兼容
 * - 自动 Failover
 * - 一个 API Key 访问所有模型
 *
 * 文档：https://ai.gitee.com/docs/products/apis/
 */
export class GiteeAIAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'GiteeAI');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// Gitee AI 使用 OpenAI 兼容格式
		const url = `${endpoint || 'https://ai.gitee.com/v1'}/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Gitee AI error: ${response.statusText} - ${errorText}`,
				response.status,
				'gitee-ai',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}

/**
 * Infini-AI (无问芯穹) 适配器（聚合平台）
 *
 * 无问芯穹 GenStudio 提供：
 * - M×N 架构（多模型 × 多芯片）
 * - OpenAI 格式兼容
 * - 预置多种开源和闭源模型
 * - Chat、Vision、Embedding、Reranking 服务
 *
 * 文档：https://docs.infini-ai.com/gen-studio/api/
 */
export class InfiniAIAdapter extends BaseAIProviderAdapter {
	constructor(logger: Logger) {
		super(logger, 'InfiniAI');
	}

	protected async callAPI(
		apiKey: string,
		endpoint: string,
		request: ChatRequest,
	): Promise<ChatResponse> {
		// Infini-AI 使用 OpenAI 兼容格式
		const url = `${endpoint || 'https://cloud.infini-ai.com/maas/v1'}/chat/completions`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AIProviderError(
				`Infini-AI error: ${response.statusText} - ${errorText}`,
				response.status,
				'infini-ai',
				response.status === 429 || response.status >= 500,
			);
		}

		return await response.json();
	}
}
