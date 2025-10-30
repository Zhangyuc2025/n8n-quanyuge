import { Logger } from '@n8n/backend-common';
import {
	TeamMember,
	TeamMemberRepository,
	TeamRepository,
	UserRepository,
	ProjectRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ProjectService } from '@/services/project.service.ee';

/**
 * 团队成员服务
 *
 * 处理团队成员的添加、移除、角色管理等业务逻辑
 * 管理团队成员的权限和关系
 */
@Service()
export class TeamMemberService {
	constructor(
		private readonly logger: Logger,
		private readonly teamMemberRepository: TeamMemberRepository,
		private readonly teamRepository: TeamRepository,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
	) {}

	/**
	 * 添加成员到团队
	 * @param teamId - 团队ID
	 * @param userId - 要添加的用户ID
	 * @param operatorId - 操作者ID（必须是团队所有者或管理员）
	 * @param role - 成员角色
	 * @returns 创建的成员关系
	 */
	async addMember(
		teamId: string,
		userId: string,
		operatorId: string,
		role: 'team:admin' | 'team:member' | 'team:viewer' = 'team:member',
	): Promise<TeamMember> {
		// 验证操作者权限（必须是所有者或管理员）
		await this.validateOperatorPermission(teamId, operatorId, 'team:admin');

		// 验证用户是否存在
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// 检查团队是否存在
		const team = await this.teamRepository.findById(teamId);
		if (!team) {
			throw new NotFoundError('Team not found');
		}

		// 检查用户是否已是成员
		const existingMember = await this.teamMemberRepository.findByTeamAndUser(teamId, userId);
		if (existingMember) {
			throw new BadRequestError('User is already a member of this team');
		}

		// 检查团队成员数量是否已达上限
		const memberCount = await this.getTeamMemberCount(teamId);
		if (memberCount >= team.maxMembers) {
			throw new BadRequestError(
				`Team has reached the maximum number of members (${team.maxMembers})`,
			);
		}

		try {
			const member = await this.teamMemberRepository.addMember(teamId, userId, role);

			// [多租户改造] 自动将用户添加到团队的所有项目
			// 实现 Coze 风格：加入团队 = 自动访问团队所有资源
			await this.addUserToTeamProjects(teamId, userId, role);

			// 记录事件
			this.eventService.emit('team-member.added', {
				teamId,
				userId,
				operatorId,
				role,
			});

			this.logger.info('Team member added successfully', {
				teamId,
				userId,
				role,
				operatorId,
			});

			return member;
		} catch (error) {
			this.logger.error('Failed to add team member', {
				teamId,
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new UnexpectedError('Failed to add team member');
		}
	}

	/**
	 * 批量添加成员到团队
	 * @param teamId - 团队ID
	 * @param userIds - 要添加的用户ID数组
	 * @param operatorId - 操作者ID
	 * @param role - 成员角色
	 * @returns 创建的成员关系数组
	 */
	async addMembers(
		teamId: string,
		userIds: string[],
		operatorId: string,
		role: 'team:admin' | 'team:member' | 'team:viewer' = 'team:member',
	): Promise<TeamMember[]> {
		// 验证操作者权限
		await this.validateOperatorPermission(teamId, operatorId, 'team:admin');

		// 检查团队是否存在
		const team = await this.teamRepository.findById(teamId);
		if (!team) {
			throw new NotFoundError('Team not found');
		}

		// 检查成员数量限制
		const currentMemberCount = await this.getTeamMemberCount(teamId);
		if (currentMemberCount + userIds.length > team.maxMembers) {
			throw new BadRequestError(
				`Adding ${userIds.length} members would exceed the maximum limit (${team.maxMembers})`,
			);
		}

		try {
			const members = await this.teamMemberRepository.addMembers(teamId, userIds, role);

			// 记录事件
			this.eventService.emit('team-members.added', {
				teamId,
				userIds,
				operatorId,
				role,
				count: members.length,
			});

			this.logger.info('Team members added successfully', {
				teamId,
				count: members.length,
				operatorId,
			});

			return members;
		} catch (error) {
			this.logger.error('Failed to add team members', {
				teamId,
				userIds,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new UnexpectedError('Failed to add team members');
		}
	}

	/**
	 * 从团队中移除成员
	 * @param teamId - 团队ID
	 * @param userId - 要移除的用户ID
	 * @param operatorId - 操作者ID
	 * @returns 是否成功
	 */
	async removeMember(teamId: string, userId: string, operatorId: string): Promise<boolean> {
		// 验证操作者权限
		await this.validateOperatorPermission(teamId, operatorId, 'team:admin');

		// 不能移除团队所有者
		const isOwner = await this.teamRepository.isOwner(teamId, userId);
		if (isOwner) {
			throw new BadRequestError('Cannot remove team owner from team');
		}

		// 检查成员是否存在
		const member = await this.teamMemberRepository.findByTeamAndUser(teamId, userId);
		if (!member) {
			throw new NotFoundError('Member not found in this team');
		}

		const success = await this.teamMemberRepository.removeMember(teamId, userId);

		if (success) {
			// [多租户改造] 自动从团队的所有项目中移除用户
			await this.removeUserFromTeamProjects(teamId, userId);

			// 记录事件
			this.eventService.emit('team-member.removed', {
				teamId,
				userId,
				operatorId,
			});

			this.logger.info('Team member removed successfully', {
				teamId,
				userId,
				operatorId,
			});
		}

		return success;
	}

	/**
	 * 更新成员角色
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param operatorId - 操作者ID
	 * @param newRole - 新角色
	 * @returns 更新后的成员关系
	 */
	async updateMemberRole(
		teamId: string,
		userId: string,
		operatorId: string,
		newRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
	): Promise<TeamMember> {
		// 验证操作者权限（只有所有者可以修改角色）
		const operatorIsOwner = await this.teamRepository.isOwner(teamId, operatorId);
		if (!operatorIsOwner) {
			throw new BadRequestError('Only team owner can change member roles');
		}

		// 不能修改团队所有者的角色
		const isOwner = await this.teamRepository.isOwner(teamId, userId);
		if (isOwner && newRole !== 'team:owner') {
			throw new BadRequestError('Cannot change team owner role');
		}

		// 不能将其他成员设置为所有者
		if (!isOwner && newRole === 'team:owner') {
			throw new BadRequestError(
				'Cannot assign owner role to members. Use transfer ownership instead.',
			);
		}

		const member = await this.teamMemberRepository.updateMemberRole(teamId, userId, newRole);

		if (!member) {
			throw new NotFoundError('Member not found in this team');
		}

		// [多租户改造] 自动更新用户在团队所有项目中的角色
		await this.updateUserRoleInTeamProjects(teamId, userId, newRole);

		// 记录事件
		this.eventService.emit('team-member.role-updated', {
			teamId,
			userId,
			operatorId,
			newRole,
		});

		this.logger.info('Team member role updated successfully', {
			teamId,
			userId,
			newRole,
			operatorId,
		});

		return member;
	}

	/**
	 * 获取团队所有成员
	 * @param teamId - 团队ID
	 * @returns 成员列表
	 */
	async getTeamMembers(teamId: string): Promise<TeamMember[]> {
		return await this.teamMemberRepository.findByTeam(teamId);
	}

	/**
	 * 获取用户在团队中的角色
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @returns 角色字符串或null
	 */
	async getUserRole(teamId: string, userId: string): Promise<string | null> {
		// 先检查是否是团队所有者
		const isOwner = await this.teamRepository.isOwner(teamId, userId);
		if (isOwner) {
			return 'team:owner';
		}

		return await this.teamMemberRepository.getMemberRole(teamId, userId);
	}

	/**
	 * 检查用户是否是团队成员
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @returns 是否是成员
	 */
	async isMember(teamId: string, userId: string): Promise<boolean> {
		// 所有者也算成员
		const isOwner = await this.teamRepository.isOwner(teamId, userId);
		if (isOwner) {
			return true;
		}

		return await this.teamMemberRepository.isMember(teamId, userId);
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
		// 所有者拥有最高权限
		const isOwner = await this.teamRepository.isOwner(teamId, userId);
		if (isOwner) {
			return true;
		}

		return await this.teamMemberRepository.hasRoleOrHigher(teamId, userId, requiredRole);
	}

	/**
	 * 获取团队成员统计
	 * @param teamId - 团队ID
	 * @returns 统计信息
	 */
	async getMemberStats(teamId: string) {
		return await this.teamMemberRepository.getMemberStats(teamId);
	}

	/**
	 * 验证操作者权限
	 * @param teamId - 团队ID
	 * @param operatorId - 操作者ID
	 * @param requiredRole - 所需最低角色
	 * @throws BadRequestError 如果权限不足
	 */
	private async validateOperatorPermission(
		teamId: string,
		operatorId: string,
		requiredRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
	): Promise<void> {
		const hasPermission = await this.hasRoleOrHigher(teamId, operatorId, requiredRole);

		if (!hasPermission) {
			throw new BadRequestError('Insufficient permissions to perform this operation');
		}
	}

	/**
	 * 获取团队成员总数
	 * @param teamId - 团队ID
	 * @returns 成员数量
	 */
	private async getTeamMemberCount(teamId: string): Promise<number> {
		const members = await this.teamMemberRepository.findByTeam(teamId);
		return members.length;
	}

	/**
	 * [多租户改造] 将团队角色映射为项目角色
	 * 实现 Coze 风格的自动权限同步：团队成员自动拥有团队内所有项目的访问权限
	 *
	 * 映射规则：
	 * - team:owner  → project:admin  (团队所有者在项目中是管理员)
	 * - team:admin  → project:admin  (团队管理员在项目中是管理员)
	 * - team:member → project:editor (团队成员在项目中是编辑者)
	 * - team:viewer → project:viewer (团队查看者在项目中是查看者)
	 *
	 * @param teamRole - 团队角色
	 * @returns 对应的项目角色
	 */
	private mapTeamRoleToProjectRole(
		teamRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
	): string {
		const roleMapping: Record<string, string> = {
			'team:owner': 'project:admin',
			'team:admin': 'project:admin',
			'team:member': 'project:editor',
			'team:viewer': 'project:viewer',
		};

		return roleMapping[teamRole] || 'project:viewer';
	}

	/**
	 * [多租户改造] 将用户添加到团队的所有项目
	 * 实现 Coze 风格：加入团队 = 自动访问团队所有资源
	 *
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param teamRole - 团队角色
	 */
	private async addUserToTeamProjects(
		teamId: string,
		userId: string,
		teamRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
	): Promise<void> {
		try {
			// 1. 获取该团队的所有项目
			const teamProjects = await this.projectRepository.find({ where: { teamId } });

			if (teamProjects.length === 0) {
				this.logger.warn('No projects found for team, skipping project member addition', {
					teamId,
				});
				return;
			}

			// 2. 映射团队角色到项目角色
			const projectRole = this.mapTeamRoleToProjectRole(teamRole);

			// 3. 将用户添加到所有团队项目
			for (const project of teamProjects) {
				try {
					await this.projectService.addUser(project.id, {
						userId,
						role: projectRole,
					});

					this.logger.debug('Added user to team project', {
						teamId,
						projectId: project.id,
						projectName: project.name,
						userId,
						projectRole,
					});
				} catch (error) {
					// 如果用户已经是项目成员，忽略错误
					if (error instanceof Error && error.message.includes('already')) {
						this.logger.debug('User already in project, skipping', {
							projectId: project.id,
							userId,
						});
						continue;
					}
					throw error;
				}
			}

			this.logger.info('User added to all team projects', {
				teamId,
				userId,
				projectCount: teamProjects.length,
				projectRole,
			});
		} catch (error) {
			this.logger.error('Failed to add user to team projects', {
				teamId,
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new UnexpectedError('Failed to synchronize project permissions');
		}
	}

	/**
	 * [多租户改造] 从团队的所有项目中移除用户
	 *
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 */
	private async removeUserFromTeamProjects(teamId: string, userId: string): Promise<void> {
		try {
			// 获取该团队的所有项目
			const teamProjects = await this.projectRepository.find({ where: { teamId } });

			if (teamProjects.length === 0) {
				return;
			}

			// 从所有团队项目中移除用户
			for (const project of teamProjects) {
				try {
					await this.projectService.deleteUserFromProject(project.id, userId);
					this.logger.debug('Removed user from team project', {
						teamId,
						projectId: project.id,
						userId,
					});
				} catch (error) {
					// 如果用户不在项目中，忽略错误
					if (error instanceof NotFoundError) {
						continue;
					}
					throw error;
				}
			}

			this.logger.info('User removed from all team projects', {
				teamId,
				userId,
				projectCount: teamProjects.length,
			});
		} catch (error) {
			this.logger.error('Failed to remove user from team projects', {
				teamId,
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new UnexpectedError('Failed to synchronize project permissions');
		}
	}

	/**
	 * [多租户改造] 更新用户在团队所有项目中的角色
	 *
	 * @param teamId - 团队ID
	 * @param userId - 用户ID
	 * @param newTeamRole - 新的团队角色
	 */
	private async updateUserRoleInTeamProjects(
		teamId: string,
		userId: string,
		newTeamRole: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer',
	): Promise<void> {
		try {
			// 获取该团队的所有项目
			const teamProjects = await this.projectRepository.find({ where: { teamId } });

			if (teamProjects.length === 0) {
				return;
			}

			// 映射新角色
			const newProjectRole = this.mapTeamRoleToProjectRole(newTeamRole);

			// 更新所有项目中的角色
			for (const project of teamProjects) {
				try {
					await this.projectService.changeUserRoleInProject(project.id, userId, newProjectRole);
					this.logger.debug('Updated user role in team project', {
						teamId,
						projectId: project.id,
						userId,
						newProjectRole,
					});
				} catch (error) {
					// 如果用户不在项目中，尝试添加
					if (error instanceof NotFoundError) {
						await this.projectService.addUser(project.id, {
							userId,
							role: newProjectRole,
						});
						continue;
					}
					throw error;
				}
			}

			this.logger.info('User role updated in all team projects', {
				teamId,
				userId,
				newTeamRole,
				newProjectRole,
				projectCount: teamProjects.length,
			});
		} catch (error) {
			this.logger.error('Failed to update user role in team projects', {
				teamId,
				userId,
				newTeamRole,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new UnexpectedError('Failed to synchronize project permissions');
		}
	}
}
