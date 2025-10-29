import { CreateTeamDto, UpdateTeamDto } from '@n8n/api-types';
import type { Team } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Get,
	Post,
	Patch,
	Delete,
	GlobalScope,
	RestController,
	Body,
	Param,
} from '@n8n/decorators';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { TeamService } from '@/services/team.service';

/**
 * 团队控制器
 *
 * 处理团队相关的 HTTP 请求
 * 提供团队的CRUD操作API
 */
@RestController('/teams')
export class TeamController {
	constructor(
		private readonly teamService: TeamService,
		private readonly eventService: EventService,
	) {}

	/**
	 * GET /teams
	 * 获取当前用户拥有的所有团队
	 */
	@Get('/')
	async getAllTeams(req: AuthenticatedRequest): Promise<Team[]> {
		return await this.teamService.getUserTeams(req.user.id);
	}

	/**
	 * GET /teams/member
	 * 获取当前用户参与的所有团队（包括作为成员的团队）
	 */
	@Get('/member')
	async getMemberTeams(req: AuthenticatedRequest): Promise<Team[]> {
		return await this.teamService.getUserMemberTeams(req.user.id);
	}

	/**
	 * GET /teams/:id
	 * 根据ID获取团队详情
	 */
	@Get('/:id')
	async getTeam(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') teamId: string,
	): Promise<Team> {
		// 验证用户是否有权限访问该团队
		const isMember = await this.teamService.getUserMemberTeams(req.user.id);
		const hasAccess = isMember.some((team) => team.id === teamId);

		if (!hasAccess) {
			throw new NotFoundError('Team not found or access denied');
		}

		return await this.teamService.getTeamById(teamId);
	}

	/**
	 * GET /teams/:id/stats
	 * 获取团队统计信息
	 */
	@Get('/:id/stats')
	async getTeamStats(req: AuthenticatedRequest, _res: Response, @Param('id') teamId: string) {
		// 验证用户是否有权限访问该团队
		const isMember = await this.teamService.getUserMemberTeams(req.user.id);
		const hasAccess = isMember.some((team) => team.id === teamId);

		if (!hasAccess) {
			throw new NotFoundError('Team not found or access denied');
		}

		return await this.teamService.getTeamStats(teamId);
	}

	/**
	 * GET /teams/slug/:slug
	 * 根据slug获取团队
	 */
	@Get('/slug/:slug')
	async getTeamBySlug(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
	): Promise<Team> {
		const team = await this.teamService.getTeamBySlug(slug);

		// 验证用户是否有权限访问该团队
		const isMember = await this.teamService.getUserMemberTeams(req.user.id);
		const hasAccess = isMember.some((t) => t.id === team.id);

		if (!hasAccess) {
			throw new NotFoundError('Team not found or access denied');
		}

		return team;
	}

	/**
	 * POST /teams
	 * 创建新团队
	 */
	@Post('/')
	@GlobalScope('team:create')
	async createTeam(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateTeamDto,
	): Promise<Team> {
		const team = await this.teamService.createTeam(req.user.id, {
			name: payload.name,
			slug: payload.slug,
			description: payload.description,
			icon: payload.icon,
			billingMode: payload.billingMode,
			maxMembers: payload.maxMembers,
		});

		this.eventService.emit('team-created', {
			userId: req.user.id,
			teamId: team.id,
			teamName: team.name,
		});

		return team;
	}

	/**
	 * PATCH /teams/:id
	 * 更新团队信息
	 */
	@Patch('/:id')
	async updateTeam(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') teamId: string,
		@Body payload: UpdateTeamDto,
	): Promise<Team> {
		// TeamService 会验证用户是否是团队所有者
		const team = await this.teamService.updateTeam(teamId, req.user.id, {
			name: payload.name,
			slug: payload.slug,
			description: payload.description,
			icon: payload.icon,
			billingMode: payload.billingMode,
			maxMembers: payload.maxMembers,
		});

		this.eventService.emit('team-updated', {
			userId: req.user.id,
			teamId,
		});

		return team;
	}

	/**
	 * DELETE /teams/:id
	 * 删除团队（软删除）
	 */
	@Delete('/:id')
	async deleteTeam(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') teamId: string,
	): Promise<{ success: boolean }> {
		// TeamService 会验证用户是否是团队所有者
		const success = await this.teamService.deleteTeam(teamId, req.user.id);

		if (success) {
			this.eventService.emit('team-deleted', {
				userId: req.user.id,
				teamId,
			});
		}

		return { success };
	}

	/**
	 * POST /teams/:id/suspend
	 * 暂停团队
	 */
	@Post('/:id/suspend')
	async suspendTeam(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') teamId: string,
	): Promise<{ success: boolean }> {
		// TeamService 会验证用户是否是团队所有者
		const success = await this.teamService.suspendTeam(teamId, req.user.id);

		if (success) {
			this.eventService.emit('team-suspended', {
				userId: req.user.id,
				teamId,
			});
		}

		return { success };
	}

	/**
	 * POST /teams/:id/activate
	 * 激活团队
	 */
	@Post('/:id/activate')
	async activateTeam(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') teamId: string,
	): Promise<{ success: boolean }> {
		// TeamService 会验证用户是否是团队所有者
		const success = await this.teamService.activateTeam(teamId, req.user.id);

		if (success) {
			this.eventService.emit('team-activated', {
				userId: req.user.id,
				teamId,
			});
		}

		return { success };
	}
}
