import { getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { nanoid } from 'nanoid';

import '@/zod-alias-support';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { getAllCredentials } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ImportCredentialsCommand);

beforeEach(async () => {
	await testDb.truncate(['CredentialsEntity', 'User']);
});

test('import:credentials should import a credential', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run(['--input=./test/integration/commands/import-credentials/credentials.json']);

	//
	// ASSERT
	//
	const credentials = await getAllCredentials();
	expect(credentials).toMatchObject([
		expect.objectContaining({
			id: '123',
			name: 'cred-aws-test',
			projectId: ownerProject.id,
		}),
	]);
});

test('import:credentials should import a credential from separated files', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	// import credential the first time, assigning it to the owner
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-credentials/separate',
	]);

	//
	// ASSERT
	//
	const credentials = await getAllCredentials();
	expect(credentials).toMatchObject([
		expect.objectContaining({
			id: '123',
			name: 'cred-aws-test',
			projectId: ownerProject.id,
		}),
	]);
});

test('`import:credentials --userId ...` should fail if the credential exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();

	// import credential the first time, assigning it to the owner
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${owner.id}`,
	]);

	// making sure the import worked
	const before = await getAllCredentials();
	expect(before).toMatchObject([
		expect.objectContaining({
			id: '123',
			name: 'cred-aws-test',
			projectId: ownerProject.id,
		}),
	]);

	//
	// ACT
	//

	// Import again while updating the name we try to assign the
	// credential to another user.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "123" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);

	//
	// ASSERT
	//
	const after = await getAllCredentials();
	expect(after).toMatchObject([
		expect.objectContaining({
			id: '123',
			// only the name was updated
			name: 'cred-aws-test',
			projectId: ownerProject.id,
		}),
	]);
});

test("only update credential, don't create or update owner if neither `--userId` nor `--projectId` is passed", async () => {
	//
	// ARRANGE
	//
	await createOwner();
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// import credential the first time, assigning it to a member
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${member.id}`,
	]);

	// making sure the import worked
	const before = await getAllCredentials();
	expect(before).toMatchObject([
		expect.objectContaining({
			id: '123',
			name: 'cred-aws-test',
			projectId: memberProject.id,
		}),
	]);

	//
	// ACT
	//
	// Import again only updating the name and omitting `--userId`
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials-updated.json',
	]);

	//
	// ASSERT
	//
	const after = await getAllCredentials();
	expect(after).toMatchObject([
		expect.objectContaining({
			id: '123',
			// only the name was updated
			name: 'cred-aws-prod',
			projectId: memberProject.id,
		}),
	]);
});

test('`import:credential --projectId ...` should fail if the credential already exists and is owned by another project', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// import credential the first time, assigning it to the owner
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${owner.id}`,
	]);

	// making sure the import worked
	const before = await getAllCredentials();
	expect(before).toMatchObject([
		expect.objectContaining({
			id: '123',
			name: 'cred-aws-test',
			projectId: ownerProject.id,
		}),
	]);

	//
	// ACT
	//

	// Import again while updating the name we try to assign the
	// credential to another user.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "123" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}".`,
	);

	//
	// ASSERT
	//
	const after = await getAllCredentials();
	expect(after).toMatchObject([
		expect.objectContaining({
			id: '123',
			// only the name was updated
			name: 'cred-aws-test',
			projectId: ownerProject.id,
		}),
	]);
});

test('`import:credential --projectId ... --userId ...` fails explaining that only one of the options can be used at a time', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--projectId=${nanoid()}`,
			`--userId=${nanoid()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});
