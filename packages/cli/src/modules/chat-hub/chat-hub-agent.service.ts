import { ChatModelsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ChatHubAgent } from './chat-hub-agent.entity';
import { ChatHubAgentRepository } from './chat-hub-agent.repository';

@Service()
export class ChatHubAgentService {
	constructor(
		private readonly logger: Logger,
		private readonly chatAgentRepository: ChatHubAgentRepository,
	) {}

	async getAgentsByUserIdAsModels(
		userId: string,
		projectId: string,
	): Promise<ChatModelsResponse['custom-agent']> {
		const agents = await this.getAgentsByUserId(userId, projectId);

		return {
			models: agents.map((agent) => ({
				name: agent.name,
				description: agent.description ?? null,
				model: {
					provider: 'custom-agent',
					agentId: agent.id,
				},
				createdAt: agent.createdAt.toISOString(),
				updatedAt: agent.updatedAt.toISOString(),
			})),
		};
	}

	async getAgentsByUserId(userId: string, projectId: string): Promise<ChatHubAgent[]> {
		return await this.chatAgentRepository.getManyByUserId(userId, projectId);
	}

	async getAgentById(id: string, userId: string, projectId: string): Promise<ChatHubAgent> {
		const agent = await this.chatAgentRepository.getOneById(id, userId, projectId);
		if (!agent) {
			throw new NotFoundError('Chat agent not found');
		}
		return agent;
	}

	async createAgent(
		user: User,
		data: {
			name: string;
			description?: string;
			systemPrompt: string;
			provider: ChatHubAgent['provider'];
			model: string;
		},
		projectId: string,
	): Promise<ChatHubAgent> {
		// TODO: Validate API key for pay-per-use model
		const id = uuidv4();

		const agent = await this.chatAgentRepository.createAgent({
			id,
			name: data.name,
			description: data.description ?? null,
			systemPrompt: data.systemPrompt,
			ownerId: user.id,
			projectId,
			provider: data.provider,
			model: data.model,
		});

		this.logger.info(`Chat agent created: ${id} by user ${user.id} in project ${projectId}`);
		return agent;
	}

	async updateAgent(
		id: string,
		user: User,
		updates: {
			name?: string;
			description?: string;
			systemPrompt?: string;
			provider?: string;
			model?: string;
		},
		projectId: string,
	): Promise<ChatHubAgent> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, user.id, projectId);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		// TODO: Validate API key for pay-per-use model when provider/model changes

		const updateData: Partial<ChatHubAgent> = {};
		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.description !== undefined) updateData.description = updates.description ?? null;
		if (updates.systemPrompt !== undefined) updateData.systemPrompt = updates.systemPrompt;
		if (updates.provider !== undefined)
			updateData.provider = updates.provider as ChatHubAgent['provider'];
		if (updates.model !== undefined) updateData.model = updates.model ?? null;

		const agent = await this.chatAgentRepository.updateAgent(id, updateData);

		this.logger.info(`Chat agent updated: ${id} by user ${user.id} in project ${projectId}`);
		return agent;
	}

	async deleteAgent(id: string, userId: string, projectId: string): Promise<void> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, userId, projectId);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		await this.chatAgentRepository.deleteAgent(id);

		this.logger.info(`Chat agent deleted: ${id} by user ${userId} from project ${projectId}`);
	}
}
