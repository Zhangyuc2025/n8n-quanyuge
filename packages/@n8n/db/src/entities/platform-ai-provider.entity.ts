import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { JsonColumn, WithTimestamps } from './abstract-entity';

/**
 * 平台 AI 服务提供商表
 * Platform AI provider entity for storing AI service providers (OpenAI, Anthropic, Google)
 *
 * 职责：
 * - 存储平台托管的 AI 服务提供商（OpenAI, Anthropic 等）
 * - 管理统一的 API Key（平台级别）
 * - 定义支持的模型列表和定价
 * - 配置配额限制
 *
 * @example modelsConfig structure:
 * {
 *   "models": [
 *     {
 *       "id": "gpt-4-turbo",
 *       "name": "GPT-4 Turbo",
 *       "description": "Most capable GPT-4 model",
 *       "pricePerToken": 0.00001,
 *       "currency": "CNY",
 *       "contextWindow": 128000,
 *       "maxOutputTokens": 4096,
 *       "supportsFunctions": true,
 *       "supportsVision": false
 *     }
 *   ]
 * }
 *
 * @example quotaConfig structure:
 * {
 *   "monthlyTokens": 10000000,
 *   "currentUsed": 0
 * }
 */
@Entity()
export class PlatformAIProvider extends WithTimestamps {
	/**
	 * 提供商标识（如：openai、anthropic、google）
	 * Provider key (e.g., openai, anthropic, google)
	 */
	@PrimaryColumn({ type: 'varchar', length: 100, name: 'provider_key' })
	providerKey: string;

	/**
	 * 提供商名称（如：OpenAI、Anthropic、Google）
	 * Provider display name (e.g., OpenAI, Anthropic, Google)
	 */
	@Column({ type: 'varchar', length: 200, name: 'provider_name' })
	providerName: string;

	/**
	 * 平台统一配置的 API Key（加密存储）
	 * Platform-level encrypted API key
	 */
	@Column({ type: 'text', name: 'api_key_encrypted' })
	apiKeyEncrypted: string;

	/**
	 * API 端点
	 * API endpoint URL (e.g., https://api.openai.com)
	 */
	@Column({ type: 'varchar', length: 500, name: 'api_endpoint' })
	apiEndpoint: string;

	/**
	 * 支持的模型列表（JSONB）
	 * Supported models configuration in JSON format
	 * 包含模型 ID、名称、描述、定价、上下文窗口等
	 */
	@JsonColumn({ name: 'models_config' })
	modelsConfig: Record<string, unknown>;

	/**
	 * 配额配置（JSONB）
	 * Quota configuration in JSON format
	 * 包含月度 token 限制和当前使用量
	 */
	@JsonColumn({ nullable: true, name: 'quota_config' })
	quotaConfig: Record<string, unknown> | null;

	/**
	 * 是否激活
	 * Whether the provider is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive: boolean;

	/**
	 * 是否启用
	 * Whether the provider is enabled
	 */
	@Column({ type: 'boolean', default: true })
	enabled: boolean;
}
