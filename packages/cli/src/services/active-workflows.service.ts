import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class ActiveWorkflowsService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async getAllActiveIdsInStorage() {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();
		return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}

	async getAllActiveIdsFor(user: User) {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();

		const hasFullAccess = hasGlobalScope(user, 'workflow:list');
		if (hasFullAccess) {
			return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
		}

		// Exclusive mode: Get workflows from user's accessible projects
		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});

		// Filter to only include active workflows that user has access to
		const userActiveWorkflowIds = activeWorkflowIds.filter((id) =>
			accessibleWorkflowIds.includes(id),
		);
		return userActiveWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}

	async getActivationError(workflowId: string, user: User) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			this.logger.warn('User attempted to access workflow errors without permissions', {
				workflowId,
				userId: user.id,
			});

			throw new BadRequestError(`Workflow with ID "${workflowId}" could not be found.`);
		}

		return await this.activationErrorsService.get(workflowId);
	}
}
