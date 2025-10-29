import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, In, Not, Repository } from '@n8n/typeorm';

import { Team } from '../entities/team';
import { TeamMember } from '../entities/team-member';
import { User } from '../entities/user';
import { withTransaction } from '../utils/transaction';

/**
 * 团队成员数据访问层
 *
 * 负责所有团队成员相关的数据库操作
 * 管理团队成员的角色和权限
 */
@Service()
export class TeamMemberRepository extends Repository<TeamMember> {
	constructor(private readonly dataSource: DataSource) {
		super(TeamMember, dataSource.manager);
	}

	/**
	 * 根据团队ID查询所有成员
	 * @param teamId - 团队ID
	 * @returns 该团队的所有成员
	 */
	async findByTeam(teamId: string): Promise<TeamMember[]> {
		return await this.find({
			where: { teamId },
			order: { joinedAt: 'ASC' },
			relations: ['user', 'team'],
		});
	}

	/**
	 * 根据用户ID查询所属团队
	 * @param userId - 用户ID
	 * @returns 该用户参与的所有团队
	 */
	async findByUser(userId: string): Promise<TeamMember[]> {
		return await this.find({
			where: { userId },
			order: { joinedAt: 'DESC' },
			relations: ['team'],
		});
	}

	/**
	 * 查询特定团队的特定成员
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @returns 成员关系或null
	 */
	async findByTeamAndUser(teamId: string, userId: string): Promise<TeamMember | null> {
		return await this.findOne({
			where: { teamId, userId },
			relations: ['user', 'team'],
		});
	}

	/**
	 * 添加成员到团队
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param role - 角色类型
	 * @param trx - 可选的事务管理器
	 * @returns 创建的成员关系
	 */
	async addMember(
		teamId: string,
		userId: string,
		role: 'team:admin' | 'team:member' | 'team:viewer' = 'team:member',
		trx?: EntityManager,
	): Promise<TeamMember> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			// 检查成员是否已存在
			const existing = await em.findOne(TeamMember, {
				where: { teamId, userId },
			});

			if (existing) {
				throw new Error('User is already a member of this team');
			}

			const member = em.create(TeamMember, {
				teamId,
				userId,
				role,
				joinedAt: new Date(),
			});

			await em.insert(TeamMember, member);

			// 返回完整的成员数据
			const result = await em.findOne(TeamMember, {
				where: { id: member.id },
				relations: ['user', 'team'],
			});
			if (!result) {
				throw new Error('Failed to add member to team');
			}
			return result;
		});
	}

	/**
	 * 批量添加成员到团队
	 * @param teamId - 团队ID
	 * @param userIds - 用户ID数组
	 * @param role - 角色类型
	 * @param trx - 可选的事务管理器
	 * @returns 创建的成员关系数组
	 */
	async addMembers(
		teamId: string,
		userIds: string[],
		role: 'team:admin' | 'team:member' | 'team:viewer' = 'team:member',
		trx?: EntityManager,
	): Promise<TeamMember[]> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			// 检查现有成员
			const existingMembers = await em.find(TeamMember, {
				where: { teamId, userId: In(userIds) },
				select: ['userId'],
			});

			const existingUserIds = existingMembers.map((m) => m.userId);
			const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

			if (newUserIds.length === 0) {
				return [];
			}

			// 批量创建成员
			const members = newUserIds.map((userId) =>
				em.create(TeamMember, {
					teamId,
					userId,
					role,
					joinedAt: new Date(),
				}),
			);

			await em.insert(TeamMember, members);

			// 返回完整的成员数据
			return await em.find(TeamMember, {
				where: { teamId, userId: In(newUserIds) },
				relations: ['user', 'team'],
			});
		});
	}

	/**
	 * 更新成员角色
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param newRole - 新角色
	 * @param trx - 可选的事务管理器
	 * @returns 更新后的成员关系
	 */
	async updateMemberRole(
		teamId: string,
		userId: string,
		newRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
		trx?: EntityManager,
	): Promise<TeamMember | null> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const updateResult = await em.update(TeamMember, { teamId, userId }, { role: newRole });

			if ((updateResult.affected ?? 0) === 0) {
				return null;
			}

			return await em.findOne(TeamMember, {
				where: { teamId, userId },
				relations: ['user', 'team'],
			});
		});
	}

	/**
	 * 从团队中移除成员
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param trx - 可选的事务管理器
	 * @returns 是否成功
	 */
	async removeMember(teamId: string, userId: string, trx?: EntityManager): Promise<boolean> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const deleteResult = await em.delete(TeamMember, { teamId, userId });
			return (deleteResult.affected ?? 0) > 0;
		});
	}

	/**
	 * 批量移除成员
	 * @param teamId - 团队ID
	 * @param userIds - 用户ID数组
	 * @param trx - 可选的事务管理器
	 * @returns 移除的成员数量
	 */
	async removeMembers(teamId: string, userIds: string[], trx?: EntityManager): Promise<number> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			const deleteResult = await em.delete(TeamMember, {
				teamId,
				userId: In(userIds),
			});
			return deleteResult.affected || 0;
		});
	}

	/**
	 * 检查用户是否是团队成员
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @returns 是否是成员
	 */
	async isMember(teamId: string, userId: string): Promise<boolean> {
		const count = await this.count({
			where: { teamId, userId },
		});
		return count > 0;
	}

	/**
	 * 获取用户在团队中的角色
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @returns 用户角色或null
	 */
	async getMemberRole(teamId: string, userId: string): Promise<string | null> {
		const member = await this.findOne({
			where: { teamId, userId },
			select: ['role'],
		});
		return member?.role || null;
	}

	/**
	 * 检查用户是否具有特定角色或更高权限
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param requiredRole - 所需角色
	 * @returns 是否具有足够权限
	 */
	async hasRoleOrHigher(
		teamId: string,
		userId: string,
		requiredRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
	): Promise<boolean> {
		const memberRole = await this.getMemberRole(teamId, userId);
		if (!memberRole) {
			return false;
		}

		// 角色层级：owner > admin > member > viewer
		const roleHierarchy = {
			'team:viewer': 0,
			'team:member': 1,
			'team:admin': 2,
			'team:owner': 3,
		};

		return (
			(roleHierarchy[memberRole as keyof typeof roleHierarchy] ?? 0) >= roleHierarchy[requiredRole]
		);
	}

	/**
	 * 获取团队的所有者
	 * @param teamId - 团队ID
	 * @returns 团队所有者的成员关系
	 */
	async getTeamOwner(teamId: string): Promise<TeamMember | null> {
		return await this.findOne({
			where: { teamId, role: 'team:owner' },
			relations: ['user', 'team'],
		});
	}

	/**
	 * 获取团队的管理员和所有者
	 * @param teamId - 团队ID
	 * @returns 管理员列表
	 */
	async getTeamAdmins(teamId: string): Promise<TeamMember[]> {
		return await this.find({
			where: {
				teamId,
				role: In(['team:owner', 'team:admin']),
			},
			relations: ['user', 'team'],
		});
	}

	/**
	 * 获取团队成員统计
	 * @param teamId - 团队ID
	 * @returns 成员统计信息
	 */
	async getMemberStats(teamId: string) {
		const stats = await this.createQueryBuilder('member')
			.select('member.role', 'role')
			.addSelect('COUNT(*)', 'count')
			.where('member.teamId = :teamId', { teamId })
			.groupBy('member.role')
			.getRawMany();

		const result = {
			total: 0,
			owners: 0,
			admins: 0,
			members: 0,
			viewers: 0,
		};

		stats.forEach((stat) => {
			result.total += parseInt(stat.count);
			switch (stat.role) {
				case 'team:owner':
					result.owners = parseInt(stat.count);
					break;
				case 'team:admin':
					result.admins = parseInt(stat.count);
					break;
				case 'team:member':
					result.members = parseInt(stat.count);
					break;
				case 'team:viewer':
					result.viewers = parseInt(stat.count);
					break;
			}
		});

		return result;
	}

	/**
	 * 移动用户到另一个团队
	 * @param fromTeamId - 原团队ID
	 * @param toTeamId - 目标团队ID
	 * @param userId - 用户ID
	 * @param newRole - 新角色
	 * @param trx - 可选的事务管理器
	 * @returns 新的成员关系
	 */
	async transferMember(
		fromTeamId: string,
		toTeamId: string,
		userId: string,
		newRole: 'team:admin' | 'team:member' | 'team:viewer' = 'team:member',
		trx?: EntityManager,
	): Promise<TeamMember | null> {
		return await withTransaction(this.manager, trx, async (em: EntityManager) => {
			// 从原团队移除
			await em.delete(TeamMember, { teamId: fromTeamId, userId });

			// 添加到新团队
			const member = em.create(TeamMember, {
				teamId: toTeamId,
				userId,
				role: newRole,
				joinedAt: new Date(),
			});

			await em.insert(TeamMember, member);

			return await em.findOne(TeamMember, {
				where: { id: member.id },
				relations: ['user', 'team'],
			});
		});
	}
}
