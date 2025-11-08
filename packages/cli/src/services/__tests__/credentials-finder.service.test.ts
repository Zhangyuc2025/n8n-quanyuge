import {
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	CredentialsRepository,
	CredentialsEntity,
} from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
} from '@n8n/permissions';
import { In } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { mockInstance } from '@n8n/backend-test-utils';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { RoleService } from '../role.service';

describe('CredentialsFinderService', () => {
	const roleService = mockInstance(RoleService);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const credentialsFinderService = Container.get(CredentialsFinderService);

	beforeAll(() => {
		mockInstance(RoleService, roleService);
		mockInstance(CredentialsRepository, credentialsRepository);
		// Add target property for repository
		Object.defineProperty(credentialsRepository, 'target', {
			value: CredentialsEntity,
			configurable: true,
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Default mock implementation for all tests
		roleService.rolesWithScope.mockImplementation(async (namespace) => {
			if (namespace === 'project') {
				return [
					PROJECT_ADMIN_ROLE_SLUG,
					PROJECT_OWNER_ROLE_SLUG,
					PROJECT_EDITOR_ROLE_SLUG,
					PROJECT_VIEWER_ROLE_SLUG,
				];
			} else if (namespace === 'credential') {
				return ['credential:owner', 'credential:user'];
			}
			return [];
		});
	});

	describe('findCredentialForUser', () => {
		const credentialsId = 'cred_123';
		const credential = mock<CredentialsEntity>({ id: credentialsId, projectId: 'project1' });
		const owner = mock<User>({
			role: GLOBAL_OWNER_ROLE,
		});
		const member = mock<User>({
			role: GLOBAL_MEMBER_ROLE,
			id: 'test',
		});

		test('should allow instance owner access to all credentials', async () => {
			credentialsRepository.findOne.mockResolvedValueOnce(credential);
			const result = await credentialsFinderService.findCredentialForUser(credentialsId, owner, [
				'credential:read' as const,
			]);
			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: { id: credentialsId },
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(result).toEqual(credential);
		});

		test('should allow members and call RoleService correctly', async () => {
			credentialsRepository.findOne.mockResolvedValueOnce(credential);
			const result = await credentialsFinderService.findCredentialForUser(credentialsId, member, [
				'credential:read' as const,
			]);

			expect(roleService.rolesWithScope).toHaveBeenCalledTimes(1);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:read']);

			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialsId,
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(result).toEqual(credential);
		});

		test('should return null when no credential is found', async () => {
			credentialsRepository.findOne.mockResolvedValueOnce(null);
			const result = await credentialsFinderService.findCredentialForUser(credentialsId, member, [
				'credential:read' as const,
			]);
			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialsId,
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(result).toEqual(null);
		});

		test('should handle custom roles from RoleService', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') {
					return ['custom:project-admin-abc123', PROJECT_VIEWER_ROLE_SLUG];
				}
				return [];
			});

			credentialsRepository.findOne.mockResolvedValueOnce(credential);
			const result = await credentialsFinderService.findCredentialForUser(credentialsId, member, [
				'credential:update' as const,
			]);

			expect(credentialsRepository.findOne).toHaveBeenCalledWith({
				where: {
					id: credentialsId,
					project: {
						projectRelations: {
							role: In(['custom:project-admin-abc123', PROJECT_VIEWER_ROLE_SLUG]),
							userId: member.id,
						},
					},
				},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(result).toEqual(credential);
		});

		test('should handle RoleService failure gracefully', async () => {
			roleService.rolesWithScope.mockRejectedValue(new Error('Role cache unavailable'));

			await expect(
				credentialsFinderService.findCredentialForUser(credentialsId, member, [
					'credential:read' as const,
				]),
			).rejects.toThrow('Role cache unavailable');

			expect(credentialsRepository.findOne).not.toHaveBeenCalled();
		});
	});

	describe('findCredentialsForUser', () => {
		const credentials = [
			mock<CredentialsEntity>({ id: 'cred1', projectId: 'project1' }),
			mock<CredentialsEntity>({ id: 'cred2', projectId: 'project2' }),
		];
		const owner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		const member = mock<User>({ role: GLOBAL_MEMBER_ROLE, id: 'user123' });

		beforeEach(() => {
			jest.clearAllMocks();
		});

		test('should allow global owner access to all credentials without role filtering', async () => {
			credentialsRepository.find.mockResolvedValueOnce(credentials);

			const result = await credentialsFinderService.findCredentialsForUser(owner, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(result).toEqual(credentials);
		});

		test('should filter credentials by roles for regular members', async () => {
			credentialsRepository.find.mockResolvedValueOnce(credentials);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:update' as const,
			]);

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:update']);
			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(result).toEqual(credentials);
		});

		test('should handle custom roles in filtering', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') return ['custom:project-lead-456'];
				return [];
			});

			const singleCredResult = [credentials[0]];
			credentialsRepository.find.mockResolvedValueOnce(singleCredResult);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:delete' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					project: {
						projectRelations: {
							role: In(['custom:project-lead-456']),
							userId: member.id,
						},
					},
				},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(result).toEqual(singleCredResult);
		});
	});

	describe('findAllCredentialsForUser', () => {
		const credentials = [
			mock<CredentialsEntity>({ id: 'cred1', projectId: 'proj1' }),
			mock<CredentialsEntity>({ id: 'cred2', projectId: 'proj2' }),
		];
		const owner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		const member = mock<User>({ role: GLOBAL_MEMBER_ROLE, id: 'user123' });

		beforeEach(() => {
			jest.clearAllMocks();

			// Reset to default implementation for each test
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') {
					return [
						PROJECT_ADMIN_ROLE_SLUG,
						PROJECT_OWNER_ROLE_SLUG,
						PROJECT_EDITOR_ROLE_SLUG,
						PROJECT_VIEWER_ROLE_SLUG,
					];
				}
				return [];
			});
		});

		test('should allow global owner access without filtering', async () => {
			const mockManager = {
				find: jest.fn().mockResolvedValueOnce(credentials),
			};
			Object.defineProperty(credentialsRepository, 'manager', {
				get: jest.fn(() => mockManager),
				configurable: true,
			});

			const result = await credentialsFinderService.findAllCredentialsForUser(owner, [
				'credential:read' as const,
			]);

			expect(mockManager.find).toHaveBeenCalledWith(credentialsRepository.target, {
				where: {},
				relations: ['project'],
			});
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(result).toEqual([
				{ ...credentials[0], projectId: 'proj1' },
				{ ...credentials[1], projectId: 'proj2' },
			]);
		});

		test('should filter by roles for regular members', async () => {
			const mockManager = {
				find: jest.fn().mockResolvedValueOnce([credentials[0]]),
			};
			Object.defineProperty(credentialsRepository, 'manager', {
				get: jest.fn(() => mockManager),
				configurable: true,
			});

			const result = await credentialsFinderService.findAllCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:read']);
			expect(mockManager.find).toHaveBeenCalledWith(credentialsRepository.target, {
				where: {
					project: {
						projectRelations: {
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
							userId: member.id,
						},
					},
				},
				relations: ['project'],
			});
			expect(result).toEqual([{ ...credentials[0], projectId: 'proj1' }]);
		});

		test('should support transaction manager', async () => {
			const mockTrx = {
				find: jest.fn().mockResolvedValueOnce([]),
			};

			await credentialsFinderService.findAllCredentialsForUser(
				member,
				['credential:read' as const],
				mockTrx as any,
			);

			expect(mockTrx.find).toHaveBeenCalledWith(
				credentialsRepository.target,
				expect.objectContaining({
					where: expect.any(Object),
					relations: ['project'],
				}),
			);
		});
	});

	describe('getCredentialIdsByUserAndRole', () => {
		const userIds = ['user1', 'user2'];
		const mockCredentials = [
			mock<CredentialsEntity>({ id: 'cred1', projectId: 'proj1' }),
			mock<CredentialsEntity>({ id: 'cred2', projectId: 'proj2' }),
		];

		beforeEach(() => {
			jest.clearAllMocks();

			// Reset to default implementation
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') {
					return [
						PROJECT_ADMIN_ROLE_SLUG,
						PROJECT_OWNER_ROLE_SLUG,
						PROJECT_EDITOR_ROLE_SLUG,
						PROJECT_VIEWER_ROLE_SLUG,
					];
				}
				return [];
			});
		});

		test('should use RoleService when scopes are provided', async () => {
			const mockManager = {
				find: jest.fn().mockResolvedValueOnce(mockCredentials),
			};
			Object.defineProperty(credentialsRepository, 'manager', {
				get: jest.fn(() => mockManager),
				configurable: true,
			});

			const result = await credentialsFinderService.getCredentialIdsByUserAndRole(userIds, {
				scopes: ['credential:read' as const, 'credential:update' as const],
			});

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', [
				'credential:read',
				'credential:update',
			]);
			expect(mockManager.find).toHaveBeenCalledWith(credentialsRepository.target, {
				where: {
					project: {
						projectRelations: {
							userId: In(userIds),
							role: In([
								PROJECT_ADMIN_ROLE_SLUG,
								PROJECT_OWNER_ROLE_SLUG,
								PROJECT_EDITOR_ROLE_SLUG,
								PROJECT_VIEWER_ROLE_SLUG,
							]),
						},
					},
				},
				select: ['id'],
			});
			expect(result).toEqual(['cred1', 'cred2']);
		});

		test('should use direct roles when provided', async () => {
			const projectRoles = ['custom:project-admin'] as any;
			const credentialRoles = ['custom:cred-viewer'] as any;
			const mockManager = {
				find: jest.fn().mockResolvedValueOnce([mockCredentials[0]]),
			};
			Object.defineProperty(credentialsRepository, 'manager', {
				get: jest.fn(() => mockManager),
				configurable: true,
			});

			const result = await credentialsFinderService.getCredentialIdsByUserAndRole(userIds, {
				projectRoles,
				credentialRoles,
			});

			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(mockManager.find).toHaveBeenCalledWith(credentialsRepository.target, {
				where: {
					project: {
						projectRelations: {
							userId: In(userIds),
							role: In(projectRoles),
						},
					},
				},
				select: ['id'],
			});
			expect(result).toEqual(['cred1']);
		});

		test('should support transaction manager', async () => {
			const mockTrx = {
				find: jest.fn().mockResolvedValueOnce([]),
			};

			await credentialsFinderService.getCredentialIdsByUserAndRole(
				userIds,
				{ scopes: ['credential:read' as const] },
				mockTrx as any,
			);

			expect(mockTrx.find).toHaveBeenCalledWith(
				credentialsRepository.target,
				expect.objectContaining({
					where: expect.any(Object),
					select: ['id'],
				}),
			);
		});

		test('should handle empty results', async () => {
			const mockManager = {
				find: jest.fn().mockResolvedValueOnce([]),
			};
			Object.defineProperty(credentialsRepository, 'manager', {
				get: jest.fn(() => mockManager),
				configurable: true,
			});

			const result = await credentialsFinderService.getCredentialIdsByUserAndRole(userIds, {
				scopes: ['credential:read' as const],
			});

			expect(result).toEqual([]);
		});
	});

	describe('RoleService integration edge cases', () => {
		const member = mock<User>({ role: GLOBAL_MEMBER_ROLE, id: 'user123' });

		beforeEach(() => {
			jest.clearAllMocks();
		});

		test('should handle empty role results from RoleService', async () => {
			roleService.rolesWithScope.mockResolvedValue([]);
			const emptyResult: CredentialsEntity[] = [];
			credentialsRepository.find.mockResolvedValueOnce(emptyResult);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					shared: {
						role: In([]),
						project: {
							projectRelations: {
								role: In([]),
								userId: member.id,
							},
						},
					},
				},
				relations: { shared: true },
			});
			expect(result).toEqual(emptyResult);
		});

		test('should handle RoleService failures in findCredentialsForUser', async () => {
			roleService.rolesWithScope.mockRejectedValueOnce(new Error('Database connection failed'));

			await expect(
				credentialsFinderService.findCredentialsForUser(member, ['credential:read' as const]),
			).rejects.toThrow('Database connection failed');

			expect(credentialsRepository.find).not.toHaveBeenCalled();
		});

		test('should handle partial RoleService failures', async () => {
			roleService.rolesWithScope
				.mockResolvedValueOnce(['project:admin']) // First call succeeds
				.mockRejectedValueOnce(new Error('Credential role lookup failed')); // Second call fails

			await expect(
				credentialsFinderService.findCredentialsForUser(member, ['credential:read' as const]),
			).rejects.toThrow('Credential role lookup failed');
		});

		test('should maintain namespace isolation', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'project') return ['workflow:owner']; // Wrong namespace
				return [];
			});

			const isolationResult: CredentialsEntity[] = [];
			credentialsRepository.find.mockResolvedValueOnce(isolationResult);

			const result = await credentialsFinderService.findCredentialsForUser(member, [
				'credential:read' as const,
			]);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: {
					project: {
						projectRelations: {
							role: In(['workflow:owner']), // Uses what RoleService returned for project namespace
							userId: member.id,
						},
					},
				},
				relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
			});
			expect(result).toEqual(isolationResult);
		});
	});
});
