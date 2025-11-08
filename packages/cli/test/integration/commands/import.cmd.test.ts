import { mockInstance, testDb, getPersonalProject, getAllWorkflows } from '@n8n/backend-test-utils';
import { nanoid } from 'nanoid';

import '@/zod-alias-support';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createMember, createOwner } from '../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(ActiveWorkflowManager);

const command = setupTestCommand(ImportWorkflowsCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'User']);
});

test('import:workflow should import active workflow and deactivate it', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-workflows/separate',
	]);

	//
	// ASSERT
	//
	const workflows = await getAllWorkflows();
	expect(workflows).toHaveLength(2);
	expect(workflows).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: '998',
				name: 'active-workflow',
				active: false,
				projectId: ownerProject.id,
			}),
			expect.objectContaining({
				id: '999',
				name: 'inactive-workflow',
				active: false,
				projectId: ownerProject.id,
			}),
		]),
	);
});

test('import:workflow should import active workflow from combined file and deactivate it', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined/combined.json',
	]);

	//
	// ASSERT
	//
	const workflows = await getAllWorkflows();
	expect(workflows).toHaveLength(2);
	expect(workflows).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: '998',
				name: 'active-workflow',
				active: false,
				projectId: ownerProject.id,
			}),
			expect.objectContaining({
				id: '999',
				name: 'inactive-workflow',
				active: false,
				projectId: ownerProject.id,
			}),
		]),
	);
});

test('import:workflow can import a single workflow object', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run(['--input=./test/integration/commands/import-workflows/combined/single.json']);

	//
	// ASSERT
	//
	const workflows = await getAllWorkflows();
	expect(workflows).toHaveLength(1);
	expect(workflows).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow',
			active: false,
			projectId: ownerProject.id,
		}),
	]);
});

test('`import:workflow --userId ...` should fail if the workflow exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);

	const before = await getAllWorkflows();
	// Make sure the workflow has been created.
	expect(before).toHaveLength(1);
	expect(before).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow',
			projectId: ownerProject.id,
		}),
	]);

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID, and try
	// to assign it to the member.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);

	//
	// ASSERT
	//
	const after = await getAllWorkflows();
	// Make sure there is no new workflow and that the name DID NOT change.
	expect(after).toHaveLength(1);
	expect(after).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow',
			projectId: ownerProject.id,
		}),
	]);
});

test("only update the workflow, don't create or update the owner if `--userId` is not passed", async () => {
	//
	// ARRANGE
	//
	await createOwner();
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${member.id}`,
	]);

	const before = await getAllWorkflows();
	// Make sure the workflow has been created.
	expect(before).toHaveLength(1);
	expect(before).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow',
			projectId: memberProject.id,
		}),
	]);

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
	]);

	//
	// ASSERT
	//
	const after = await getAllWorkflows();
	// Make sure the workflow is still owned by the same project and the name changed.
	expect(after).toHaveLength(1);
	expect(after).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow updated',
			projectId: memberProject.id,
		}),
	]);
});

test('`import:workflow --projectId ...` should fail if the credential already exists and is owned by another project', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);

	const before = await getAllWorkflows();
	// Make sure the workflow has been created.
	expect(before).toHaveLength(1);
	expect(before).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow',
			projectId: ownerProject.id,
		}),
	]);

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID, and try
	// to assign it to the member.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}"`,
	);

	//
	// ASSERT
	//
	const after = await getAllWorkflows();
	// Make sure the workflow is still owned by the same project and the name DID NOT change.
	expect(after).toHaveLength(1);
	expect(after).toEqual([
		expect.objectContaining({
			id: '998',
			name: 'active-workflow',
			projectId: ownerProject.id,
		}),
	]);
});

test('`import:workflow --projectId ... --userId ...` fails explaining that only one of the options can be used at a time', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${nanoid()}`,
			`--projectId=${nanoid()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});
