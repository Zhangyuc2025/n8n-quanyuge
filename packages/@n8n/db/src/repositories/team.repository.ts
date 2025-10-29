import { Service } from '@n8n/di';
import { DataSource, EntityManager, In, Repository } from '@n8n/typeorm';

import { Team } from '../entities/team';
import { withTransaction } from '../utils/transaction';

/**
 * 团队数据访问层
 *
 * 负责所有团队相关的数据库操作
 * 团队是计费主体，可以拥有多个项目
 */
@Service()
export class TeamRepository extends Repository<Team> {
	constructor(dataSource: DataSource) {
		super(Team, dataSource.manager);
	}

	/**
	 * 根据用户ID查询拥有的团队
	 * @param userId - 用户ID
	 * @returns 该用户拥有的所有团队
	 */
	async findByOwner(userId: string): Promise<Team[]> {
		return await this.find({
			where: { ownerId: userId, status: 'active' },
			order: { createdAt: 'DESC' },
			relations: ['owner'],
		});
	}

	/**
	 * 根据团队ID查询团队详情
	 * @param teamId - 团队ID
	 * @returns 团队详情或null
	 */
	async findById(teamId: string): Promise<Team | null> {
		return await this.findOne({
			where: { id: teamId, status: 'active' },
			relations: ['owner', 'members', 'members.user'],
		});
	}

	/**
	 * 根据slug查询团队
	 * @param slug - 团队slug
	 * @returns 团队详情或null
	 */
	async findBySlug(slug: string): Promise<Team | null> {
		return await this.findOne({
			where: { slug, status: 'active' },
			relations: ['owner'],
		});
	}

	/**
	 * 创建新团队
	 * @param teamData - 团队数据
	 * @param trx - 可选的事务管理器
	 * @returns 创建的团队实体
	 */
	async createTeam(
		teamData: {
			name: string;
			slug?: string | null;
			ownerId: string;
			billingMode?: 'owner_pays' | 'member_pays';
			maxMembers?: number;
			description?: string | null;
			icon?: { type: 'emoji' | 'icon'; value: string } | null;
		},
		trx?: EntityManager,
	): Promise<Team> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const team = new Team();
			team.name = teamData.name;
			team.slug = teamData.slug ?? null;
			team.ownerId = teamData.ownerId;
			team.billingMode = teamData.billingMode || 'owner_pays';
			team.maxMembers = teamData.maxMembers || 10;
			team.description = teamData.description ?? null;
			team.icon = teamData.icon ?? null;
			team.status = 'active';

			await em.insert(Team, team);

			// 返回完整的团队数据
			const result = await em.findOne(Team, {
				where: { id: team.id },
				relations: ['owner'],
			});
			if (!result) {
				throw new Error('Failed to create team');
			}
			return result;
		});
	}

	/**
	 * 更新团队信息
	 * @param teamId - 团队ID
	 * @param updateData - 更新数据
	 * @param trx - 可选的事务管理器
	 * @returns 更新后的团队
	 */
	async updateTeam(
		teamId: string,
		updateData: {
			name?: string;
			slug?: string | null;
			billingMode?: 'owner_pays' | 'member_pays';
			maxMembers?: number;
			description?: string | null;
			icon?: { type: 'emoji' | 'icon'; value: string } | null;
		},
		trx?: EntityManager,
	): Promise<Team | null> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			// 过滤掉 undefined 值
			const filteredData: Partial<Team> = {};
			if (updateData.name !== undefined) filteredData.name = updateData.name;
			if (updateData.slug !== undefined) filteredData.slug = updateData.slug;
			if (updateData.billingMode !== undefined) filteredData.billingMode = updateData.billingMode;
			if (updateData.maxMembers !== undefined) filteredData.maxMembers = updateData.maxMembers;
			if (updateData.description !== undefined) filteredData.description = updateData.description;
			if (updateData.icon !== undefined) filteredData.icon = updateData.icon;

			// TypeScript workaround: TypeORM update() 方法存在深度类型实例化问题
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const updateResult = await em.update(Team, teamId, filteredData as any);

			if ((updateResult.affected ?? 0) === 0) {
				return null;
			}

			return await em.findOne(Team, {
				where: { id: teamId },
				relations: ['owner'],
			});
		});
	}

	/**
	 * 软删除团队（设置为 deleted 状态）
	 * @param teamId - 团队ID
	 * @param trx - 可选的事务管理器
	 * @returns 是否成功
	 */
	async softDeleteTeam(teamId: string, trx?: EntityManager): Promise<boolean> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const updateResult = await em.update(Team, teamId, { status: 'deleted' });
			return (updateResult.affected ?? 0) > 0;
		});
	}

	/**
	 * 暂停团队
	 * @param teamId - 团队ID
	 * @param trx - 可选的事务管理器
	 * @returns 是否成功
	 */
	async suspendTeam(teamId: string, trx?: EntityManager): Promise<boolean> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const updateResult = await em.update(Team, teamId, { status: 'suspended' });
			return (updateResult.affected ?? 0) > 0;
		});
	}

	/**
	 * 激活团队
	 * @param teamId - 团队ID
	 * @param trx - 可选的事务管理器
	 * @returns 是否成功
	 */
	async activateTeam(teamId: string, trx?: EntityManager): Promise<boolean> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const updateResult = await em.update(Team, teamId, { status: 'active' });
			return (updateResult.affected ?? 0) > 0;
		});
	}

	/**
	 * 检查用户是否是团队的所有者
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @returns 是否是所有者
	 */
	async isOwner(teamId: string, userId: string): Promise<boolean> {
		const count = await this.count({
			where: { id: teamId, ownerId: userId, status: 'active' },
		});
		return count > 0;
	}

	/**
	 * 检查slug是否已被使用
	 * @param slug - 团队slug
	 * @param excludeTeamId - 排除的团队ID（用于更新时检查）
	 * @returns 是否已被使用
	 */
	async isSlugTaken(slug: string, excludeTeamId?: string): Promise<boolean> {
		const queryBuilder = this.createQueryBuilder('team')
			.where('team.slug = :slug', { slug })
			.andWhere('team.status = :status', { status: 'active' });

		if (excludeTeamId) {
			queryBuilder.andWhere('team.id != :excludeTeamId', { excludeTeamId });
		}

		const count = await queryBuilder.getCount();
		return count > 0;
	}

	/**
	 * 根据多个ID查询团队
	 * @param teamIds - 团队ID数组
	 * @returns 团队列表
	 */
	async findByIds(teamIds: string[]): Promise<Team[]> {
		if (teamIds.length === 0) {
			return [];
		}

		return await this.find({
			where: { id: In(teamIds), status: 'active' },
			relations: ['owner'],
		});
	}

	/**
	 * 获取团队统计信息
	 * @param teamId - 团队ID
	 * @returns 统计信息
	 */
	async getTeamStats(teamId: string) {
		// 这里可以添加更复杂的统计查询
		// 目前返回基本的团队信息
		const team = await this.findOne({
			where: { id: teamId },
			relations: ['members'],
		});

		if (!team) {
			return null;
		}

		return {
			teamId: team.id,
			name: team.name,
			memberCount: team.members?.length || 0,
			maxMembers: team.maxMembers,
			billingMode: team.billingMode,
			status: team.status,
		};
	}
}
