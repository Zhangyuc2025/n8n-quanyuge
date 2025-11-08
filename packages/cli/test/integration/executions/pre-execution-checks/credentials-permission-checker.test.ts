import {
	getPersonalProject,
	randomCredentialPayload as randomCred,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { randomInt } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { OwnershipService } from '@/services/ownership.service';
import { affixRoleToSaveCredential } from '@test-integration/db/credentials';
import { createOwner, createUser } from '@test-integration/db/users';
import type { SaveCredentialFunction } from '@test-integration/types';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

const ownershipService = mockInstance(OwnershipService);

const createWorkflow = async (nodes: INode[], workflowOwner?: User): Promise<IWorkflowBase> => {
	const project = workflowOwner ? await getPersonalProject(workflowOwner) : undefined;

	const workflowDetails = {
		id: randomInt(1, 10).toString(),
		name: 'test',
		active: false,
		connections: {},
		nodeTypes: mockNodeTypes,
		nodes,
		projectId: project?.id,
	};

	const workflowEntity = await Container.get(WorkflowRepository).save(workflowDetails);

	return workflowEntity;
};

let saveCredential: SaveCredentialFunction;

let owner: User;
let member: User;
let ownerPersonalProject: Project;
let memberPersonalProject: Project;

const mockNodeTypes = mockInstance(NodeTypes);
mockInstance(LoadNodesAndCredentials, {
	loadedNodes: mockNodeTypesData(['start', 'actionNetwork']),
});

let permissionChecker: CredentialsPermissionChecker;

beforeAll(async () => {
	await testDb.init();

	saveCredential = affixRoleToSaveCredential('credential:owner');

	permissionChecker = Container.get(CredentialsPermissionChecker);

	[owner, member] = await Promise.all([createOwner(), createUser()]);
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);
});

describe('check()', () => {
	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'CredentialsEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('should allow if workflow has no creds', async () => {
		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
			},
		];

		const workflow = await createWorkflow(nodes, member);
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(memberPersonalProject);

		await expect(permissionChecker.check(workflow.id, nodes)).resolves.not.toThrow();
	});

	test('should allow if workflow creds are valid subset', async () => {
		// In new architecture, credential sharing is done via project membership
		// Save both credentials to member's project so member has access to both
		const ownerCred = await saveCredential(randomCred(), { project: memberPersonalProject });
		const memberCred = await saveCredential(randomCred(), { user: member });

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: ownerCred.id,
						name: ownerCred.name,
					},
				},
			},
			{
				id: uuid(),
				name: 'Action Network 2',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: memberCred.id,
						name: memberCred.name,
					},
				},
			},
		];

		const workflowEntity = await createWorkflow(nodes, member);

		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(memberPersonalProject);

		await expect(permissionChecker.check(workflowEntity.id, nodes)).resolves.not.toThrow();
	});

	test('should deny if workflow creds are not valid subset', async () => {
		const memberCred = await saveCredential(randomCred(), { user: member });
		const ownerCred = await saveCredential(randomCred(), { user: owner });

		const nodes = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0] as [number, number],
				credentials: {
					actionNetworkApi: {
						id: memberCred.id,
						name: memberCred.name,
					},
				},
			},
			{
				id: uuid(),
				name: 'Action Network 2',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0] as [number, number],
				credentials: {
					actionNetworkApi: {
						id: ownerCred.id,
						name: ownerCred.name,
					},
				},
			},
		];

		const workflowEntity = await createWorkflow(nodes, member);

		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).rejects.toThrow();
	});

	test('should allow all credentials if current user is instance owner', async () => {
		const memberCred = await saveCredential(randomCred(), { user: member });
		const ownerCred = await saveCredential(randomCred(), { user: owner });

		const nodes = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0] as [number, number],
				credentials: {
					actionNetworkApi: {
						id: memberCred.id,
						name: memberCred.name,
					},
				},
			},
			{
				id: uuid(),
				name: 'Action Network 2',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0] as [number, number],
				credentials: {
					actionNetworkApi: {
						id: ownerCred.id,
						name: ownerCred.name,
					},
				},
			},
		];

		const workflowEntity = await createWorkflow(nodes, owner);
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(ownerPersonalProject);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(owner);

		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).resolves.not.toThrow();
	});
});
