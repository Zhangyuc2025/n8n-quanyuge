import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * AI Provider API Types
 */
export interface AIProvider {
	id: string;
	providerKey: string;
	providerName: string;
	apiEndpoint: string;
	modelsConfig: Record<string, unknown>;
	quotaConfig: Record<string, unknown>;
	isActive: boolean;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AIModel {
	modelKey: string;
	modelName: string;
	provider: string;
	contextWindow: number;
	maxOutputTokens: number;
	inputPrice: number;
	outputPrice: number;
	capabilities: string[];
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatCompletionRequest {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	maxTokens?: number;
}

export interface ChatCompletionResponse {
	id: string;
	model: string;
	choices: Array<{
		message: ChatMessage;
		finishReason: string;
	}>;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	cost: {
		inputCost: number;
		outputCost: number;
		totalCost: number;
	};
}

/**
 * Get all active AI providers
 * GET /platform-ai-providers
 */
export async function getProviders(context: IRestApiContext): Promise<AIProvider[]> {
	return await makeRestApiRequest<AIProvider[]>(context, 'GET', '/platform-ai-providers');
}

/**
 * Get AI provider details by provider key
 * GET /platform-ai-providers/:providerKey
 */
export async function getProvider(
	context: IRestApiContext,
	providerKey: string,
): Promise<AIProvider> {
	return await makeRestApiRequest<AIProvider>(
		context,
		'GET',
		`/platform-ai-providers/${providerKey}`,
	);
}

/**
 * Get models for a specific AI provider
 * GET /platform-ai-providers/:providerKey/models
 */
export async function getProviderModels(
	context: IRestApiContext,
	providerKey: string,
): Promise<AIModel[]> {
	return await makeRestApiRequest<AIModel[]>(
		context,
		'GET',
		`/platform-ai-providers/${providerKey}/models`,
	);
}

/**
 * Call AI chat completion API
 * POST /platform-ai-providers/:providerKey/chat/completions
 *
 * This will:
 * 1. Use platform-configured API key to call AI service
 * 2. Automatically deduct cost from workspace balance based on token usage
 * 3. Record usage to billing system
 */
export async function chatCompletion(
	context: IRestApiContext,
	providerKey: string,
	request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
	return await makeRestApiRequest<ChatCompletionResponse>(
		context,
		'POST',
		`/platform-ai-providers/${providerKey}/chat/completions`,
		request,
	);
}
