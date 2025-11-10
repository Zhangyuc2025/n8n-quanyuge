import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Folder, WorkflowEntity, FolderRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type EntityManager } from '@n8n/typeorm';
import type { IWorkflowBase, WorkflowId } from 'n8n-workflow';
import { NodeOperationError, PROJECT_ROOT, WorkflowActivationError } from 'n8n-workflow';

import { WorkflowFinderService } from './workflow-finder.service';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TransferWorkflowError } from '@/errors/response-errors/transfer-workflow.error';
import { FolderService } from '@/services/folder.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

type WorkflowWithSharingsAndCredentials = WorkflowEntity & { usedCredentials?: any[] };
type WorkflowWithSharingsMetaDataAndCredentials = WorkflowWithSharingsAndCredentials & {
	ownedBy?: any;
	sharedWith?: any;
	homeProject?: any;
	sharedWithProjects?: any;
};

@Service()
export class EnterpriseWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly folderService: FolderService,
		private readonly folderRepository: FolderRepository,
	) {}

	/**
	 * @deprecated In the new architecture, workflows belong to a single project.
	 * Sharing is managed at the project level through project members.
	 * This method is kept for backward compatibility but should not be used.
	 */
	async shareWithProjects(
		workflowId: WorkflowId,
		shareWithIds: string[],
		_entityManager: EntityManager,
	) {
		// In the new architecture, workflows cannot be shared with multiple projects.
		// They belong to one project, and sharing is done by adding users to that project.
		// This method is deprecated and should be refactored at call sites.
		this.logger.warn('shareWithProjects called but is deprecated in new architecture', {
			workflowId,
			shareWithIds,
		});

		// No-op for now to prevent breaking changes
		return [];
	}

	addOwnerAndSharings(
		workflow: WorkflowWithSharingsAndCredentials,
	): WorkflowWithSharingsMetaDataAndCredentials {
		const workflowWithMetaData = this.ownershipService.addOwnedByAndSharedWith(workflow);

		return {
			...workflow,
			...workflowWithMetaData,
			usedCredentials: workflow.usedCredentials ?? [],
		};
	}

	async addCredentialsToWorkflow(
		workflow: WorkflowWithSharingsMetaDataAndCredentials,
		_currentUser: User,
	): Promise<void> {
		workflow.usedCredentials = [];
	}

	validateCredentialPermissionsToUser(_workflow: IWorkflowBase, _allowedCredentials: any[]) {}

	async preventTampering<T extends IWorkflowBase>(workflow: T, workflowId: string, _user: User) {
		const previousVersion = await this.workflowRepository.get({ id: workflowId });

		if (!previousVersion) {
			throw new NotFoundError('Workflow not found');
		}

		const allCredentials: any[] = [];

		try {
			return this.validateWorkflowCredentialUsage(workflow, previousVersion, allCredentials);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw new BadRequestError(error.message);
			}
			throw new BadRequestError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
			);
		}
	}

	validateWorkflowCredentialUsage<T extends IWorkflowBase>(
		newWorkflowVersion: T,
		_previousWorkflowVersion: IWorkflowBase,
		_credentialsUserHasAccessTo: Array<{ id: string }>,
	) {
		return newWorkflowVersion;
	}

	getNodesWithInaccessibleCreds(_workflow: IWorkflowBase, _userCredIds: string[]) {
		return [];
	}

	async transferWorkflow(
		user: User,
		workflowId: string,
		destinationProjectId: string,
		shareCredentials: string[] = [],
		destinationParentFolderId?: string,
	) {
		// 1. get workflow
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:move',
		]);
		NotFoundError.isDefinedAndNotNull(
			workflow,
			`Could not find workflow with the id "${workflowId}". Make sure you have the permission to move it.`,
		);

		// 2. get source project - workflows now directly belong to a project
		NotFoundError.isDefinedAndNotNull(
			workflow.project,
			`Could not find project for workflow "${workflow.id}"`,
		);

		// 3. get source project
		const sourceProject = workflow.project;

		// 4. get destination project
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['workflow:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create workflows in it.`,
		);

		// 5. checks
		if (sourceProject.id === destinationProject.id) {
			throw new TransferWorkflowError(
				"You can't transfer a workflow into the project that's already owning it.",
			);
		}

		let parentFolder = null;

		if (destinationParentFolderId) {
			try {
				parentFolder = await this.folderService.findFolderInProjectOrFail(
					destinationParentFolderId,
					destinationProjectId,
				);
			} catch {
				throw new TransferWorkflowError(
					`The destination folder with id "${destinationParentFolderId}" does not exist in the project "${destinationProject.name}".`,
				);
			}
		}

		// 6. deactivate workflow if necessary
		const wasActive = workflow.active;
		if (wasActive) {
			await this.activeWorkflowManager.remove(workflowId);
		}

		// 7. transfer the workflow
		await this.transferWorkflowOwnership([workflow], destinationProject.id);

		// 8. share credentials into the destination project
		await this.shareCredentialsWithProject(user, shareCredentials, destinationProject.id);

		// 9. Move workflow to the right folder if any
		await this.workflowRepository.update({ id: workflow.id }, { parentFolder });

		// 10. Update potential cached project association
		await this.ownershipService.setWorkflowProjectCacheEntry(workflow.id, destinationProject);

		// 11. try to activate it again if it was active
		if (wasActive) {
			return await this.attemptWorkflowReactivation(workflowId);
		}

		return;
	}

	async getFolderUsedCredentials(_user: User, _folderId: string, _projectId: string) {
		return [];
	}

	async transferFolder(
		user: User,
		sourceProjectId: string,
		sourceFolderId: string,
		destinationProjectId: string,
		destinationParentFolderId: string,
		shareCredentials: string[] = [],
	) {
		// 1. Get all children folders

		const childrenFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
			sourceFolderId,
			sourceProjectId,
		);

		// 2. Get all workflows in the nested folders

		const workflows = await this.workflowRepository.find({
			select: ['id', 'active', 'projectId'],
			relations: ['project'],
			where: {
				parentFolder: { id: In([...childrenFolderIds, sourceFolderId]) },
			},
		});

		const activeWorkflows = workflows.filter((w) => w.active).map((w) => w.id);

		// 3. get destination project
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['workflow:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create workflows in it.`,
		);

		// 4. checks

		if (destinationParentFolderId !== PROJECT_ROOT) {
			await this.folderRepository.findOneOrFailFolderInProject(
				destinationParentFolderId,
				destinationProjectId,
			);
		}

		await this.folderRepository.findOneOrFailFolderInProject(sourceFolderId, sourceProjectId);

		for (const workflow of workflows) {
			// Check that workflow belongs to source project
			NotFoundError.isDefinedAndNotNull(
				workflow.project,
				`Could not find project for workflow "${workflow.id}"`,
			);

			if (workflow.project.id === destinationProject.id) {
				throw new TransferWorkflowError(
					"You can't transfer a workflow into the project that's already owning it.",
				);
			}
		}

		// 5. deactivate all workflows if necessary
		const deactivateWorkflowsPromises = activeWorkflows.map(
			async (workflowId) => await this.activeWorkflowManager.remove(workflowId),
		);

		await Promise.all(deactivateWorkflowsPromises);

		// 6. transfer the workflows
		await this.transferWorkflowOwnership(workflows, destinationProject.id);

		// 7. share credentials into the destination project
		await this.shareCredentialsWithProject(user, shareCredentials, destinationProject.id);

		// 8. Move all children folder to the destination project
		await this.moveFoldersToDestination(
			sourceFolderId,
			childrenFolderIds,
			destinationProjectId,
			destinationParentFolderId,
		);

		// 9. try to activate workflows again if they were active

		for (const workflowId of activeWorkflows) {
			await this.attemptWorkflowReactivation(workflowId);
		}
	}

	private formatActivationError(error: WorkflowActivationError) {
		return {
			error: error.toJSON
				? error.toJSON()
				: {
						name: error.name,
						message: error.message,
					},
		};
	}

	private async attemptWorkflowReactivation(workflowId: string) {
		try {
			await this.activeWorkflowManager.add(workflowId, 'update');
			return;
		} catch (error) {
			await this.workflowRepository.updateActiveState(workflowId, false);

			if (error instanceof WorkflowActivationError) {
				return this.formatActivationError(error);
			}

			throw error;
		}
	}

	private async transferWorkflowOwnership(
		workflows: WorkflowEntity[],
		destinationProjectId: string,
	) {
		await this.workflowRepository.manager.transaction(async (trx) => {
			for (const workflow of workflows) {
				// In the new architecture, simply update the workflow's projectId
				await trx.update(WorkflowEntity, { id: workflow.id }, { projectId: destinationProjectId });
			}
		});
	}

	private async shareCredentialsWithProject(
		_user: User,
		_credentialIds: string[],
		_projectId: string,
	) {}

	private async moveFoldersToDestination(
		sourceFolderId: string,
		childrenFolderIds: string[],
		destinationProjectId: string,
		destinationParentFolderId: string,
	) {
		await this.folderRepository.manager.transaction(async (trx) => {
			// Move all children folders to the destination project
			await trx.update(
				Folder,
				{ id: In(childrenFolderIds) },
				{ homeProject: { id: destinationProjectId } },
			);

			// Move source folder to destination project and under destination folder if specified
			await trx.update(
				Folder,
				{ id: sourceFolderId },
				{
					homeProject: { id: destinationProjectId },
					parentFolder:
						destinationParentFolderId === PROJECT_ROOT ? null : { id: destinationParentFolderId },
				},
			);
		});
	}
}
