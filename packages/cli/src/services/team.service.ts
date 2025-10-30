import { Logger } from '@n8n/backend-common';
import {
	Team,
	TeamRepository,
	TeamMemberRepository,
	UserRepository,
	ProjectRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ProjectService } from '@/services/project.service.ee';

/**
 * 团队服务
 *
 * 处理团队的创建、更新、删除和查询等业务逻辑
 * 团队是多租户架构中的核心概念，作为计费主体和成员管理的单位
 */
@Service()
export class TeamService {
	constructor(
		private readonly logger: Logger,
		private readonly teamRepository: TeamRepository,
		private readonly teamMemberRepository: TeamMemberRepository,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
	) {}

	/**
	 * 创建新团队
	 * @param ownerId - 团队所有者ID
	 * @param data - 团队数据
	 * @returns 创建的团队
	 */
	async createTeam(
		ownerId: string,
		data: {
			name: string;
			slug?: string;
			description?: string;
			icon?: { type: 'emoji' | 'icon'; value: string };
			billingMode?: 'owner_pays' | 'member_pays';
			maxMembers?: number;
		},
	): Promise<Team> {
		// 验证用户是否存在
		const owner = await this.userRepository.findOneBy({ id: ownerId });
		if (!owner) {
			throw new NotFoundError('Owner user not found');
		}

		// [临时] 开发测试期间禁用团队数量限制检查
		// TODO: 生产环境需要启用这个检查
		// const userTeams = await this.teamRepository.findByOwner(ownerId);
		// if (userTeams.length >= owner.maxTeams) {
		// 	throw new BadRequestError(`User has reached the maximum number of teams (${owner.maxTeams})`);
		// }

		// 如果提供了 slug，检查是否已被使用
		if (data.slug) {
			const slugTaken = await this.teamRepository.isSlugTaken(data.slug);
			if (slugTaken) {
				throw new BadRequestError(`Team slug "${data.slug}" is already taken`);
			}
		}

		try {
			// 创建团队
			const team = await this.teamRepository.createTeam({
				name: data.name,
				slug: data.slug ?? null,
				ownerId,
				description: data.description ?? null,
				icon: data.icon ?? null,
				billingMode: data.billingMode || 'owner_pays',
				maxMembers: data.maxMembers || 10,
			});

			// 自动添加所有者为团队成员
			await this.teamMemberRepository.addMember(team.id, ownerId, 'team:owner');

			// [多租户改造] 创建团队的默认项目
			// 注意：必须一次性设置所有字段，包括 teamId，否则会违反 CHK_project_team_consistency 约束
			const defaultProject = this.projectRepository.create({
				name: team.name,
				type: 'team',
				icon: team.icon,
				description: team.description,
				teamId: team.id,
				isDefault: true,
			});
			await this.projectRepository.save(defaultProject);

			// 添加团队所有者为项目管理员
			await this.projectService.addUser(defaultProject.id, {
				userId: ownerId,
				role: 'project:admin',
			});

			// 记录事件
			this.eventService.emit('team.created', {
				teamId: team.id,
				teamName: team.name,
				ownerId,
			});

			this.logger.info('Team created successfully', {
				teamId: team.id,
				teamName: team.name,
				ownerId,
			});

			return team;
		} catch (error) {
			this.logger.error('Failed to create team', {
				ownerId,
				teamName: data.name,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});
			// 把原始错误抛出去，这样能看到详细信息
			if (error instanceof Error) {
				throw error;
			}
			throw new UnexpectedError('Failed to create team');
		}
	}

	/**
	 * 根据ID获取团队
	 * @param teamId - 团队ID
	 * @returns 团队详情或null
	 */
	async getTeamById(teamId: string): Promise<Team> {
		const team = await this.teamRepository.findById(teamId);
		if (!team) {
			throw new NotFoundError('Team not found');
		}
		return team;
	}

	/**
	 * 根据slug获取团队
	 * @param slug - 团队slug
	 * @returns 团队详情或null
	 */
	async getTeamBySlug(slug: string): Promise<Team> {
		const team = await this.teamRepository.findBySlug(slug);
		if (!team) {
			throw new NotFoundError('Team not found');
		}
		return team;
	}

	/**
	 * 获取用户拥有的所有团队
	 * @param userId - 用户ID
	 * @returns 团队列表
	 */
	async getUserTeams(userId: string): Promise<Team[]> {
		return await this.teamRepository.findByOwner(userId);
	}

	/**
	 * 获取用户参与的所有团队（包括作为成员的团队）
	 * @param userId - 用户ID
	 * @returns 团队列表
	 */
	async getUserMemberTeams(userId: string): Promise<Team[]> {
		const memberships = await this.teamMemberRepository.findByUser(userId);
		const teamIds = memberships.map((m) => m.teamId);

		if (teamIds.length === 0) {
			return [];
		}

		return await this.teamRepository.findByIds(teamIds);
	}

	/**
	 * 更新团队信息
	 * @param teamId - 团队ID
	 * @param userId - 操作用户ID（必须是团队所有者）
	 * @param data - 更新数据
	 * @returns 更新后的团队
	 */
	async updateTeam(
		teamId: string,
		userId: string,
		data: {
			name?: string;
			slug?: string | null;
			description?: string | null;
			icon?: { type: 'emoji' | 'icon'; value: string } | null;
			billingMode?: 'owner_pays' | 'member_pays';
			maxMembers?: number;
		},
	): Promise<Team> {
		// 验证团队所有权
		await this.validateTeamOwnership(teamId, userId);

		// 如果更新 slug，检查是否已被使用
		if (data.slug !== undefined && data.slug !== null) {
			const slugTaken = await this.teamRepository.isSlugTaken(data.slug, teamId);
			if (slugTaken) {
				throw new BadRequestError(`Team slug "${data.slug}" is already taken`);
			}
		}

		const team = await this.teamRepository.updateTeam(teamId, data);

		if (!team) {
			throw new NotFoundError('Team not found');
		}

		// 记录事件
		this.eventService.emit('team.updated', {
			teamId,
			userId,
			changes: data,
		});

		this.logger.info('Team updated successfully', {
			teamId,
			userId,
		});

		return team;
	}

	/**
	 * 删除团队（软删除）
	 * @param teamId - 团队ID
	 * @param userId - 操作用户ID（必须是团队所有者）
	 * @returns 是否成功
	 */
	async deleteTeam(teamId: string, userId: string): Promise<boolean> {
		// 验证团队所有权
		await this.validateTeamOwnership(teamId, userId);

		// 检查团队是否有项目（如果有项目，不允许删除）
		const team = await this.teamRepository.findOne({
			where: { id: teamId },
			relations: ['projects'],
		});

		if (!team) {
			throw new NotFoundError('Team not found');
		}

		if (team.projects && team.projects.length > 0) {
			throw new BadRequestError(
				'Cannot delete team with existing projects. Please delete all projects first.',
			);
		}

		// 软删除团队
		const success = await this.teamRepository.softDeleteTeam(teamId);

		if (success) {
			// 记录事件
			this.eventService.emit('team.deleted', {
				teamId,
				userId,
			});

			this.logger.info('Team deleted successfully', {
				teamId,
				userId,
			});
		}

		return success;
	}

	/**
	 * 暂停团队
	 * @param teamId - 团队ID
	 * @param userId - 操作用户ID
	 * @returns 是否成功
	 */
	async suspendTeam(teamId: string, userId: string): Promise<boolean> {
		// 验证团队所有权
		await this.validateTeamOwnership(teamId, userId);

		const success = await this.teamRepository.suspendTeam(teamId);

		if (success) {
			this.eventService.emit('team.suspended', {
				teamId,
				userId,
			});

			this.logger.info('Team suspended', {
				teamId,
				userId,
			});
		}

		return success;
	}

	/**
	 * 激活团队
	 * @param teamId - 团队ID
	 * @param userId - 操作用户ID
	 * @returns 是否成功
	 */
	async activateTeam(teamId: string, userId: string): Promise<boolean> {
		// 验证团队所有权
		await this.validateTeamOwnership(teamId, userId);

		const success = await this.teamRepository.activateTeam(teamId);

		if (success) {
			this.eventService.emit('team.activated', {
				teamId,
				userId,
			});

			this.logger.info('Team activated', {
				teamId,
				userId,
			});
		}

		return success;
	}

	/**
	 * 验证用户是否是团队所有者
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @throws NotFoundError 如果团队不存在
	 * @throws BadRequestError 如果用户不是所有者
	 */
	async validateTeamOwnership(teamId: string, userId: string): Promise<void> {
		const isOwner = await this.teamRepository.isOwner(teamId, userId);

		if (!isOwner) {
			throw new BadRequestError('Only team owner can perform this operation');
		}
	}

	/**
	 * 检查团队是否已达到成员上限
	 * @param teamId - 团队ID
	 * @returns 是否已达到上限
	 */
	async hasReachedMemberLimit(teamId: string): Promise<boolean> {
		const team = await this.teamRepository.findById(teamId);
		if (!team) {
			throw new NotFoundError('Team not found');
		}

		const memberCount = team.members?.length || 0;
		return memberCount >= team.maxMembers;
	}

	/**
	 * 获取团队统计信息
	 * @param teamId - 团队ID
	 * @returns 统计信息
	 */
	async getTeamStats(teamId: string) {
		const stats = await this.teamRepository.getTeamStats(teamId);
		if (!stats) {
			throw new NotFoundError('Team not found');
		}
		return stats;
	}
}
