import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface Team {
	id: string;
	name: string;
	slug: string | null;
	ownerId: string;
	status: 'active' | 'suspended' | 'deleted';
	billingMode: 'owner_pays' | 'member_pays';
	maxMembers: number;
	icon: string | null;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateTeamDto {
	name: string;
	description?: string;
	billingMode?: 'owner_pays' | 'member_pays';
	maxMembers?: number;
}

export interface UpdateTeamDto {
	name?: string;
	description?: string | null;
	billingMode?: 'owner_pays' | 'member_pays';
	maxMembers?: number;
	icon?: string | null;
	status?: 'active' | 'suspended' | 'deleted';
}

/**
 * 团队 API 客户端
 */
export const teamsApi = {
	/**
	 * 创建团队
	 */
	async createTeam(context: IRestApiContext, data: CreateTeamDto): Promise<Team> {
		return await makeRestApiRequest(context, 'POST', '/teams', data);
	},

	/**
	 * 获取所有团队
	 */
	async getAllTeams(context: IRestApiContext): Promise<Team[]> {
		return await makeRestApiRequest(context, 'GET', '/teams');
	},

	/**
	 * 获取单个团队信息
	 */
	async getTeam(context: IRestApiContext, teamId: string): Promise<Team> {
		return await makeRestApiRequest(context, 'GET', `/teams/${teamId}`);
	},

	/**
	 * 更新团队信息
	 */
	async updateTeam(context: IRestApiContext, teamId: string, data: UpdateTeamDto): Promise<Team> {
		return await makeRestApiRequest(context, 'PATCH', `/teams/${teamId}`, data);
	},

	/**
	 * 删除团队
	 */
	async deleteTeam(context: IRestApiContext, teamId: string): Promise<void> {
		await makeRestApiRequest(context, 'DELETE', `/teams/${teamId}`);
	},
};
