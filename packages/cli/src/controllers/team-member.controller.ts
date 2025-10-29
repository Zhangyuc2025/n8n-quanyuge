import { AddMemberToTeamDto, AddMembersToTeamDto, UpdateMemberRoleDto } from '@n8n/api-types';
import type { TeamMember } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, Patch, Delete, RestController, Body, Param } from '@n8n/decorators';
import { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { TeamMemberService } from '@/services/team-member.service';
import { TeamService } from '@/services/team.service';

/**
 * 团队成员控制器
 *
 * 处理团队成员管理相关的 HTTP 请求
 * 提供成员的增删改查和角色管理API
 */
@RestController('/teams')
export class TeamMemberController {
	constructor(
		private readonly teamMemberService: TeamMemberService,
		private readonly teamService: TeamService,
		private readonly eventService: EventService,
	) {}

	/**
	 * GET /teams/:teamId/members
	 * 获取团队所有成员
	 */
	@Get('/:teamId/members')
	async getTeamMembers(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('teamId') teamId: string,
	): Promise<TeamMember[]> {
		// 验证用户是否是团队成员
		const isMember = await this.teamMemberService.isMember(teamId, req.user.id);
		if (!isMember) {
			throw new NotFoundError('Team not found or access denied');
		}

		return await this.teamMemberService.getTeamMembers(teamId);
	}

	/**
	 * GET /teams/:teamId/members/stats
	 * 获取团队成员统计
	 */
	@Get('/:teamId/members/stats')
	async getMemberStats(req: AuthenticatedRequest, _res: Response, @Param('teamId') teamId: string) {
		// 验证用户是否是团队成员
		const isMember = await this.teamMemberService.isMember(teamId, req.user.id);
		if (!isMember) {
			throw new NotFoundError('Team not found or access denied');
		}

		return await this.teamMemberService.getMemberStats(teamId);
	}

	/**
	 * GET /teams/:teamId/members/:userId/role
	 * 获取用户在团队中的角色
	 */
	@Get('/:teamId/members/:userId/role')
	async getUserRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('teamId') teamId: string,
		@Param('userId') userId: string,
	): Promise<{ role: string | null }> {
		// 验证当前用户是否是团队成员
		const isMember = await this.teamMemberService.isMember(teamId, req.user.id);
		if (!isMember) {
			throw new NotFoundError('Team not found or access denied');
		}

		const role = await this.teamMemberService.getUserRole(teamId, userId);
		return { role };
	}

	/**
	 * POST /teams/:teamId/members
	 * 添加单个成员到团队
	 */
	@Post('/:teamId/members')
	async addMember(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('teamId') teamId: string,
		@Body payload: AddMemberToTeamDto,
	): Promise<TeamMember> {
		// TeamMemberService 会验证操作者权限
		const member = await this.teamMemberService.addMember(
			teamId,
			payload.userId,
			req.user.id,
			payload.role || 'team:member',
		);

		this.eventService.emit('team-member-added', {
			userId: req.user.id,
			teamId,
			addedUserId: payload.userId,
			role: payload.role || 'team:member',
		});

		return member;
	}

	/**
	 * POST /teams/:teamId/members/batch
	 * 批量添加成员到团队
	 */
	@Post('/:teamId/members/batch')
	async addMembers(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('teamId') teamId: string,
		@Body payload: AddMembersToTeamDto,
	): Promise<TeamMember[]> {
		// TeamMemberService 会验证操作者权限
		const members = await this.teamMemberService.addMembers(
			teamId,
			payload.userIds,
			req.user.id,
			payload.role || 'team:member',
		);

		this.eventService.emit('team-members-added-batch', {
			userId: req.user.id,
			teamId,
			addedUserIds: payload.userIds,
			role: payload.role || 'team:member',
			count: members.length,
		});

		return members;
	}

	/**
	 * PATCH /teams/:teamId/members/:userId/role
	 * 更新成员角色
	 */
	@Patch('/:teamId/members/:userId/role')
	async updateMemberRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('teamId') teamId: string,
		@Param('userId') userId: string,
		@Body payload: UpdateMemberRoleDto,
	): Promise<TeamMember> {
		// TeamMemberService 会验证操作者权限（只有所有者可以修改角色）
		const member = await this.teamMemberService.updateMemberRole(
			teamId,
			userId,
			req.user.id,
			payload.role,
		);

		this.eventService.emit('team-member-role-updated', {
			userId: req.user.id,
			teamId,
			targetUserId: userId,
			newRole: payload.role,
		});

		return member;
	}

	/**
	 * DELETE /teams/:teamId/members/:userId
	 * 从团队中移除成员
	 */
	@Delete('/:teamId/members/:userId')
	async removeMember(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('teamId') teamId: string,
		@Param('userId') userId: string,
	): Promise<{ success: boolean }> {
		// TeamMemberService 会验证操作者权限
		const success = await this.teamMemberService.removeMember(teamId, userId, req.user.id);

		if (success) {
			this.eventService.emit('team-member-removed', {
				userId: req.user.id,
				teamId,
				removedUserId: userId,
			});
		}

		return { success };
	}
}
