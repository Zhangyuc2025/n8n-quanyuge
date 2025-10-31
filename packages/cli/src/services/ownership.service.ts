import type { ListQueryDb } from '@n8n/db';
import {
	GLOBAL_OWNER_ROLE,
	Project,
	User,
	ProjectRelationRepository,
	WorkflowRepository,
	UserRepository,
	Role,
	Scope,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private userRepository: UserRepository,
		private projectRelationRepository: ProjectRelationRepository,
		private workflowRepository: WorkflowRepository,
	) {}

	// To make use of the cache service we should store POJOs, these
	// methods should be used to create copies of the entities
	// converting them into plain JavaScript objects
	// Ideally our data entities wouldn't be classes, but plain
	// interfaces and therefore pojos adhering to these interfaces
	copyProject(project: Project): Partial<Project> {
		return {
			...project,
		};
	}

	reconstructProject(project: Partial<Project>): Project | undefined {
		if (typeof project !== 'object' || project === null) {
			return undefined;
		}
		return Object.assign(new Project(), project);
	}

	copyUser(user: User): Partial<User> {
		return {
			...user,
			role: { ...user.role, scopes: [...user.role.scopes] },
		};
	}

	reconstructUser(cachedUser: Partial<User>): User | undefined {
		if (typeof cachedUser !== 'object' || cachedUser === null) {
			// performing runtime checks here, because the data is originating from
			// an external system our cache
			return undefined;
		}
		const user = Object.assign(new User(), cachedUser);
		if ('role' in cachedUser && cachedUser.role && typeof cachedUser.role === 'object') {
			user.role = Object.assign(new Role(), cachedUser.role);
			if ('scopes' in cachedUser.role && Array.isArray(cachedUser.role.scopes)) {
				user.role.scopes = cachedUser.role.scopes.map((scope) => {
					const x = Object.assign(new Scope(), scope);
					return x;
				});
			}
			return user;
		}
		// we need the role on the user, if this is missing, we should invalidate the cache and reload
		return undefined;
	}

	/**
	 * Retrieve the project that owns the workflow. Note that workflow ownership is **immutable**.
	 *
	 * Exclusive mode: Each workflow belongs to exactly one project via direct projectId relationship.
	 */
	async getWorkflowProjectCached(workflowId: string): Promise<Project> {
		const cachedValue = await this.cacheService.getHashValue<Partial<Project>>(
			'workflow-project',
			workflowId,
		);

		if (cachedValue) {
			const project = this.reconstructProject(cachedValue);
			if (project) return project;
		}

		// Exclusive mode: Query workflow's project directly
		const workflow = await this.workflowRepository.findOneOrFail({
			where: { id: workflowId },
			relations: ['project'],
		});

		void this.cacheService.setHash('workflow-project', {
			[workflowId]: this.copyProject(workflow.project),
		});

		return workflow.project;
	}

	async setWorkflowProjectCacheEntry(workflowId: string, project: Project): Promise<Project> {
		void this.cacheService.setHash('workflow-project', {
			[workflowId]: this.copyProject(project),
		});

		return project;
	}

	/**
	 * Retrieve the user who owns the personal project, or `null` if non-personal project.
	 * Personal project ownership is **immutable**.
	 */
	async getPersonalProjectOwnerCached(projectId: string): Promise<User | null> {
		const cachedValue = await this.cacheService.getHashValue<Partial<User>>(
			'project-owner',
			projectId,
		);

		if (cachedValue) {
			const user = this.reconstructUser(cachedValue);
			if (user) return user;
		}

		const ownerRel = await this.projectRelationRepository.getPersonalProjectOwners([projectId]);
		const owner = ownerRel[0]?.user ?? null;
		if (owner) {
			void this.cacheService.setHash('project-owner', { [projectId]: this.copyUser(owner) });
		}

		return owner;
	}

	/**
	 * Convert workflow/credential entity with project relation to frontend format.
	 *
	 * Exclusive mode: Each resource belongs to exactly one project (homeProject).
	 * The sharedWithProjects array is always empty in exclusive mode.
	 */
	addOwnedByAndSharedWith(
		rawWorkflow: ListQueryDb.Workflow.WithSharing,
	): ListQueryDb.Workflow.WithOwnedByAndSharedWith;
	addOwnedByAndSharedWith(
		rawCredential: ListQueryDb.Credentials.WithSharing,
	): ListQueryDb.Credentials.WithOwnedByAndSharedWith;
	addOwnedByAndSharedWith(
		rawEntity: ListQueryDb.Workflow.WithSharing | ListQueryDb.Credentials.WithSharing,
	):
		| ListQueryDb.Workflow.WithOwnedByAndSharedWith
		| ListQueryDb.Credentials.WithOwnedByAndSharedWith {
		const entity = rawEntity as
			| ListQueryDb.Workflow.WithOwnedByAndSharedWith
			| ListQueryDb.Credentials.WithOwnedByAndSharedWith;

		// Initialize with defaults
		Object.assign(entity, {
			homeProject: null,
			sharedWithProjects: [], // Always empty in exclusive mode
		});

		// Exclusive mode: Extract project information from direct project relation
		// @ts-expect-error - project exists on entity but not in type definition
		const project = rawEntity.project as Project | undefined;

		if (project) {
			entity.homeProject = {
				id: project.id,
				type: project.type,
				name: project.name,
				icon: project.icon,
			};
		}

		return entity;
	}

	async getInstanceOwner() {
		return await this.userRepository.findOneOrFail({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
		});
	}
}
