import type { User } from '@n8n/db';
import { ProjectRelationRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	hasGlobalScope,
	type ProjectRole,
	type WorkflowSharingRole,
	type Scope,
	PROJECT_OWNER_ROLE_SLUG,
} from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

export type ShareWorkflowOptions =
	| { scopes: Scope[]; projectId?: string }
	| { projectRoles: ProjectRole[]; workflowRoles: WorkflowSharingRole[]; projectId?: string };

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/**
	 * Get the IDs of the workflows that the user has access to based on
	 * scope or roles.
	 *
	 * Exclusive mode: Returns workflows from projects the user is a member of.
	 * Returns all workflow IDs if user has the 'workflow:read' global scope.
	 */
	async getSharedWorkflowIds(user: User, options: ShareWorkflowOptions): Promise<string[]> {
		const { projectId } = options;

		// If user has global workflow:read scope, return all workflows
		if (hasGlobalScope(user, 'workflow:read')) {
			const workflows = await this.workflowRepository.find({
				select: ['id'],
				...(projectId && { where: { projectId } }),
			});
			return workflows.map((w) => w.id);
		}

		// Get project roles that should have access
		const projectRoles =
			'scopes' in options
				? await this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;

		// Find user's project memberships with matching roles
		const projectRelations = await this.projectRelationRepository.find({
			where: {
				userId: user.id,
				role: In(projectRoles),
			},
			select: ['projectId'],
		});

		if (projectRelations.length === 0) {
			return [];
		}

		const projectIds = projectRelations.map((pr) => pr.projectId);

		// Exclusive mode: Query workflows directly from user's accessible projects
		const workflows = await this.workflowRepository.find({
			where: {
				projectId: In(projectIds),
				...(projectId && { projectId }), // Optional filter by specific project
			},
			select: ['id'],
		});

		return workflows.map((w) => w.id);
	}

	/**
	 * Get workflows "shared with me" - workflows in team projects where user is not the owner.
	 *
	 * Exclusive mode: Returns workflows from team projects where user is a member
	 * but not the project owner.
	 */
	async getSharedWithMeIds(user: User) {
		// Find team projects where user is NOT the owner
		const projectRelations = await this.projectRelationRepository.find({
			where: {
				userId: user.id,
			},
			relations: ['project', 'role'],
		});

		// Filter for team projects where user is not the owner
		const teamProjectIds = projectRelations
			.filter((pr) => pr.project.type === 'team' && pr.role.slug !== PROJECT_OWNER_ROLE_SLUG)
			.map((pr) => pr.projectId);

		if (teamProjectIds.length === 0) {
			return [];
		}

		// Get workflows from these team projects
		const workflows = await this.workflowRepository.find({
			where: {
				projectId: In(teamProjectIds),
			},
			select: ['id'],
		});

		return workflows.map((w) => w.id);
	}

	/**
	 * Get the scopes (permissions) for each workflow based on user's project memberships.
	 *
	 * Exclusive mode: Determines scopes based on user's role in the workflow's owning project.
	 */
	async getSharedWorkflowScopes(
		workflowIds: string[],
		user: User,
	): Promise<Array<[string, Scope[]]>> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(user.id);
		const userProjectIds = projectRelations.map((p) => p.projectId);

		// Get workflows with their projects
		const workflows = await this.workflowRepository.find({
			where: {
				id: In(workflowIds),
				projectId: In(userProjectIds),
			},
			select: ['id', 'projectId'],
		});

		// Create a map of workflowId -> projectId for quick lookup
		const workflowProjectMap = new Map(workflows.map((w) => [w.id, w.projectId]));

		return workflowIds.map((workflowId) => {
			const projectId = workflowProjectMap.get(workflowId);
			if (!projectId) {
				return [workflowId, []]; // No access
			}

			// Find user's relation in this workflow's project
			const projectRelation = projectRelations.find((pr) => pr.projectId === projectId);
			if (!projectRelation) {
				return [workflowId, []]; // No access
			}

			// Combine scopes from project role (in exclusive mode, workflow inherits project permissions)
			const scopes = this.roleService.combineResourceScopes(
				'workflow',
				user,
				[{ projectId, role: projectRelation.role.slug as WorkflowSharingRole }],
				projectRelations,
			);

			return [workflowId, scopes];
		});
	}

	/**
	 * Get workflows owned by the user in their personal project.
	 *
	 * Exclusive mode: Returns workflows from user's personal project.
	 */
	async getOwnedWorkflowsInPersonalProject(user: User): Promise<string[]> {
		// Find user's personal project (where user is the owner)
		const personalProjectRelation = await this.projectRelationRepository.findOne({
			where: {
				userId: user.id,
				role: { slug: PROJECT_OWNER_ROLE_SLUG },
				project: { type: 'personal' },
			},
			relations: ['project'],
		});

		if (!personalProjectRelation) {
			return [];
		}

		// Get workflows from the personal project
		const workflows = await this.workflowRepository.find({
			where: {
				projectId: personalProjectRelation.projectId,
			},
			select: ['id'],
		});

		return workflows.map((w) => w.id);
	}
}
