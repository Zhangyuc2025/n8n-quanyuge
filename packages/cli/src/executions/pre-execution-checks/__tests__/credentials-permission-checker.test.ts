import { type Project, type User, CredentialsRepository, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';

import { CredentialsPermissionChecker } from '../credentials-permission-checker';

describe('CredentialsPermissionChecker', () => {
	const credentialsRepository = mock<CredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const permissionChecker = new CredentialsPermissionChecker(
		credentialsRepository,
		ownershipService,
	);

	const workflowId = 'workflow123';
	const credentialId = 'cred123';
	const personalProject = mock<Project>({
		id: 'personal-project',
		name: 'Personal Project',
		type: 'personal',
	});

	const node = mock<INode>({
		name: 'Test Node',
		credentials: {
			someCredential: {
				id: credentialId,
				name: 'Test Credential',
			},
		},
		disabled: false,
	});

	beforeEach(async () => {
		jest.resetAllMocks();

		node.credentials!.someCredential.id = credentialId;
		ownershipService.getWorkflowProjectCached.mockResolvedValue(personalProject);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
	});

	it('should throw if a node has a credential without an id', async () => {
		node.credentials!.someCredential.id = null;

		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" uses invalid credential',
		);

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith(workflowId);
		expect(credentialsRepository.findAllCredentialsForWorkflow).not.toHaveBeenCalled();
	});

	it('should throw if a credential is not accessible', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValueOnce([]);

		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" does not have access to the credential',
		);

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith(workflowId);
		expect(credentialsRepository.findAllCredentialsForWorkflow).toHaveBeenCalledWith(workflowId);
	});

	it('should not throw an error if the workflow has no credentials', async () => {
		await expect(permissionChecker.check(workflowId, [])).resolves.not.toThrow();

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith(workflowId);
		expect(credentialsRepository.findAllCredentialsForWorkflow).not.toHaveBeenCalled();
	});

	it('should not throw an error if all credentials are accessible', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValueOnce([
			{ id: credentialId } as any,
		]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith(workflowId);
		expect(credentialsRepository.findAllCredentialsForWorkflow).toHaveBeenCalledWith(workflowId);
	});

	it('should skip credential checks if the home project owner has global scope', async () => {
		const projectOwner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(projectOwner);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith(workflowId);
		expect(credentialsRepository.findAllCredentialsForWorkflow).not.toHaveBeenCalled();
	});
});
