import { SimpleChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';
import { N8nLlmTracing } from '../N8nLlmTracing';

/**
 * Platform Chat Model - 自定义 LangChain Chat Model
 *
 * 通过后台统一代理接口调用 AI 服务
 * - 自动使用平台 API Key（前端/节点不可见）
 * - 自动计费（后台扣费）
 * - 支持所有提供商（OpenAI、Anthropic、Google 等）
 */
class PlatformChatModel extends SimpleChatModel {
	providerKey: string;
	modelId: string;
	apiUrl: string;
	temperature: number;
	maxTokens?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	topP?: number;
	httpRequestHelper: any;

	constructor(fields: {
		providerKey: string;
		modelId: string;
		apiUrl: string;
		temperature?: number;
		maxTokens?: number;
		frequencyPenalty?: number;
		presencePenalty?: number;
		topP?: number;
		httpRequestHelper: any;
		callbacks?: any[];
	}) {
		super(fields);
		this.providerKey = fields.providerKey;
		this.modelId = fields.modelId;
		this.apiUrl = fields.apiUrl;
		this.temperature = fields.temperature ?? 0.7;
		this.maxTokens = fields.maxTokens;
		this.frequencyPenalty = fields.frequencyPenalty;
		this.presencePenalty = fields.presencePenalty;
		this.topP = fields.topP;
		this.httpRequestHelper = fields.httpRequestHelper;
	}

	/**
	 * 调用后台统一代理接口
	 * 后台会：
	 * 1. 使用平台 API Key 调用上游服务
	 * 2. 自动计费
	 * 3. 返回标准响应
	 */
	async _call(
		messages: BaseMessage[],
		_options: this['ParsedCallOptions'],
		_runManager?: CallbackManagerForLLMRun,
	): Promise<string> {
		// 转换 LangChain 消息格式为标准 Chat API 格式
		const formattedMessages = messages.map((message) => ({
			role: this.mapMessageRole(message._getType()),
			content: message.content as string,
		}));

		try {
			// ✅ 调用后台统一代理接口（自动计费）
			const response = await this.httpRequestHelper({
				method: 'POST',
				url: `${this.apiUrl}/platform-ai-providers/${this.providerKey}/chat/completions`,
				body: {
					model: this.modelId,
					messages: formattedMessages,
					temperature: this.temperature,
					...(this.maxTokens !== undefined &&
						this.maxTokens !== -1 && { maxTokens: this.maxTokens }),
					...(this.frequencyPenalty !== undefined && { frequencyPenalty: this.frequencyPenalty }),
					...(this.presencePenalty !== undefined && { presencePenalty: this.presencePenalty }),
					...(this.topP !== undefined && { topP: this.topP }),
				},
				json: true,
			});

			// 返回 AI 响应内容
			if (response.choices && response.choices.length > 0) {
				return response.choices[0].message.content;
			}

			throw new Error('No response from AI provider');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to call platform AI service: ${errorMessage}`);
		}
	}

	/**
	 * 映射 LangChain 消息类型到标准角色
	 */
	private mapMessageRole(messageType: string): string {
		const roleMap: Record<string, string> = {
			human: 'user',
			ai: 'assistant',
			system: 'system',
			function: 'function',
			tool: 'tool',
		};
		return roleMap[messageType] || 'user';
	}

	/**
	 * 返回模型类型标识
	 */
	_llmType(): string {
		return `platform-${this.providerKey}`;
	}
}

/**
 * Platform Chat Model Node
 *
 * 通用的 AI Chat Model 节点，支持参数化提供商
 * 从后台管理系统动态加载：
 * 1. 模型列表（GET /platform-ai-providers/:key/models）
 * 2. 平台 API Key（自动注入，无需用户配置）
 * 3. 自动计费（调用后台统一接口）
 */
export class LmChatPlatform implements INodeType {
	description: INodeTypeDescription = {
		// ✅ 动态显示名称（根据 providerName 参数）
		displayName: '={{$parameter.providerName || "聊天模型"}}',
		name: 'lmChatPlatform',
		// ✅ 动态图标（根据 providerIcon 参数）
		icon: '={{$parameter.providerIcon || "fa:robot"}}',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '平台托管的 AI 聊天模型，自动计费',
		defaults: {
			name: '={{$parameter.providerName || "聊天模型"}}',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Platform-Hosted)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatplatform/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],

		// ✅ 不需要凭证！使用平台托管的 API Key

		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				// ✅ 隐藏字段：提供商标识（由前端预设）
				displayName: '提供商键',
				name: 'providerKey',
				type: 'hidden',
				default: '',
				description: 'AI 提供商标识（例如 openai、anthropic）',
			},
			{
				// ✅ 隐藏字段：提供商名称（用于节点显示名称）
				displayName: '提供商名称',
				name: 'providerName',
				type: 'hidden',
				default: '',
				description: 'AI 提供商显示名称（例如 OpenAI、Anthropic）',
			},
			{
				// ✅ 隐藏字段：提供商图标
				displayName: '提供商图标',
				name: 'providerIcon',
				type: 'hidden',
				default: '',
				description: '用于显示的提供商图标',
			},
			{
				displayName: '模型',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: '要使用的 AI 模型',
				modes: [
					{
						displayName: '从列表选择',
						name: 'list',
						type: 'list',
						placeholder: '选择一个模型...',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'gpt-4-turbo',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9-_]+',
									errorMessage: '不是有效的模型 ID',
								},
							},
						],
					},
				],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: '添加选项',
				options: [
					{
						displayName: '采样温度',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 2,
						},
						description: '控制输出的随机性。较低的值使输出更加集中和确定性。',
					},
					{
						displayName: '最大令牌数',
						name: 'maxTokens',
						type: 'number',
						default: -1,
						description: '生成的最大令牌数。使用 -1 表示无限制。',
					},
					{
						displayName: '频率惩罚',
						name: 'frequencyPenalty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 2,
						},
						description: '正值会根据新令牌在文本中出现的频率对其进行惩罚',
					},
					{
						displayName: '存在惩罚',
						name: 'presencePenalty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 2,
						},
						description: '正值会根据新令牌是否出现在文本中对其进行惩罚',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						description: '温度采样的替代方案。模型会考虑具有 top_p 概率质量的令牌结果。',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			// ✅ 从后台 API 搜索模型列表
			async searchModels(this: ISupplyDataFunctions | any, filter?: string) {
				const providerKey = this.getNodeParameter('providerKey', 0) as string;

				if (!providerKey) {
					return { results: [] };
				}

				try {
					// ✅ 调用后台 API 获取模型列表
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${this.getRestApiUrl()}/platform-ai-providers/${providerKey}/models`,
						json: true,
					});

					// 响应格式：AIModel[]
					const models = Array.isArray(response) ? response : [];

					// 过滤（如果有搜索关键词）
					const filteredModels = filter
						? models.filter(
								(model: any) =>
									model.name.toLowerCase().includes(filter.toLowerCase()) ||
									model.id.toLowerCase().includes(filter.toLowerCase()),
							)
						: models;

					return {
						results: filteredModels.map((model: any) => ({
							name: `${model.name} (¥${model.pricePerToken}/1K tokens)`,
							value: model.id,
							description: model.description,
						})),
					};
				} catch (error) {
					console.error('Failed to load models:', error);
					return { results: [] };
				}
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		// 获取节点参数
		const providerKey = this.getNodeParameter('providerKey', itemIndex) as string;
		const modelResource = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature?: number;
			maxTokens?: number;
			frequencyPenalty?: number;
			presencePenalty?: number;
			topP?: number;
		};

		if (!providerKey) {
			throw new Error('需要提供商键。此节点应使用提供商预设创建。');
		}

		if (!modelResource) {
			throw new Error('请选择一个模型');
		}

		// ✅ 创建 PlatformChatModel 实例
		const chatModel = new PlatformChatModel({
			providerKey,
			modelId: modelResource,
			apiUrl: this.getRestApiUrl(),
			temperature: options.temperature ?? 0.7,
			maxTokens: options.maxTokens ?? undefined,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			topP: options.topP,
			httpRequestHelper: this.helpers.httpRequest.bind(this.helpers),
			callbacks: [new N8nLlmTracing(this)],
		});

		return {
			response: chatModel,
		};
	}
}
