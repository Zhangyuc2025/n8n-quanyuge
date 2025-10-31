import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubSession } from './chat-hub-session.entity';

@Service()
export class ChatHubSessionRepository extends Repository<ChatHubSession> {
	constructor(dataSource: DataSource) {
		super(ChatHubSession, dataSource.manager);
	}

	async createChatSession(
		session: Partial<ChatHubSession>,
		trx?: EntityManager,
	): Promise<ChatHubSession> {
		return await withTransaction<ChatHubSession>(this.manager, trx, async (em) => {
			await em.insert(ChatHubSession, session);
			return await em.findOneOrFail(ChatHubSession, {
				where: { id: session.id },
				relations: ['messages'],
			});
		});
	}

	async updateLastMessageAt(id: string, lastMessageAt: Date, trx?: EntityManager) {
		return await withTransaction<ChatHubSession>(this.manager, trx, async (em) => {
			await em.update(ChatHubSession, { id }, { lastMessageAt });
			return await em.findOneOrFail(ChatHubSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async updateChatTitle(id: string, title: string, trx?: EntityManager) {
		return await withTransaction<ChatHubSession>(this.manager, trx, async (em) => {
			await em.update(ChatHubSession, { id }, { title });
			return await em.findOneOrFail(ChatHubSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async updateChatSession(id: string, updates: Partial<ChatHubSession>, trx?: EntityManager) {
		return await withTransaction<ChatHubSession>(this.manager, trx, async (em) => {
			await em.update(ChatHubSession, { id }, updates);
			return await em.findOneOrFail(ChatHubSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async deleteChatHubSession(id: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.delete(ChatHubSession, { id });
		});
	}

	/**
	 * [多租户改造] 获取用户在所有项目中的会话（跨项目查询）
	 */
	async getManyByUserId(userId: string) {
		return await this.find({
			where: { ownerId: userId },
			order: { lastMessageAt: 'DESC', id: 'ASC' },
		});
	}

	/**
	 * [多租户改造] 获取指定项目中的所有会话
	 */
	async getManyByProjectId(projectId: string) {
		return await this.find({
			where: { projectId },
			order: { lastMessageAt: 'DESC', id: 'ASC' },
		});
	}

	/**
	 * [多租户改造] 获取用户在指定项目中的会话
	 */
	async getManyByUserIdAndProjectId(userId: string, projectId: string) {
		return await this.find({
			where: { ownerId: userId, projectId },
			order: { lastMessageAt: 'DESC', id: 'ASC' },
		});
	}

	async getOneById(id: string, userId: string, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.findOne(ChatHubSession, {
					where: { id, ownerId: userId },
					relations: ['messages'],
				});
			},
			false,
		);
	}

	/**
	 * [多租户改造] 获取指定会话（带 projectId 验证）
	 */
	async getOneByIdAndProjectId(id: string, projectId: string, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.findOne(ChatHubSession, {
					where: { id, projectId },
					relations: ['messages'],
				});
			},
			false,
		);
	}

	async deleteAll(trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.createQueryBuilder().delete().from(ChatHubSession).execute();
		});
	}
}
