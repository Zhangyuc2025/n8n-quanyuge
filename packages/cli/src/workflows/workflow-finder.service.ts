import type { User } from '@n8n/db';
import { WorkflowEntity, WorkflowRepository, FolderRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

@Service()
export class WorkflowFinderService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly folderRepository: FolderRepository,
		private readonly roleService: RoleService,
	) {}

	async findWorkflowForUser(
		workflowId: string,
		user: User,
		scopes: Scope[],
		options: {
			includeTags?: boolean;
			includeParentFolder?: boolean;
			em?: EntityManager;
		} = {},
	) {
		let where: FindOptionsWhere<WorkflowEntity> = { id: workflowId };

		// Exclusive mode: Check project access
		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);

			where = {
				...where,
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const relations: string[] = ['project'];
		if (options.includeTags) relations.push('tags');
		if (options.includeParentFolder) relations.push('parentFolder');

		const repo = options.em ? options.em.getRepository(WorkflowEntity) : this.workflowRepository;
		const workflow = await repo.findOne({ where, relations });

		return workflow;
	}

	async findAllWorkflowsForUser(
		user: User,
		scopes: Scope[],
		folderId?: string,
		projectId?: string,
	) {
		let where: FindOptionsWhere<WorkflowEntity> = {};

		// Filter by folder hierarchy
		if (folderId) {
			const subFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
				folderId,
				projectId,
			);

			where = {
				...where,
				parentFolder: In([folderId, ...subFolderIds]),
			};
		}

		// Exclusive mode: Filter by project access
		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);

			where = {
				...where,
				project: {
					...(projectId && { id: projectId }),
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		} else if (projectId) {
			where.projectId = projectId;
		}

		const workflows = await this.workflowRepository.find({
			where,
			relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
		});

		return workflows;
	}
}
