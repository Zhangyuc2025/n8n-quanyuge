import { mockInstance } from '@n8n/backend-test-utils';
import {
	Project,
	User,
	ProjectRelation,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
	GLOBAL_OWNER_ROLE,
	PROJECT_OWNER_ROLE,
} from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { v4 as uuid } from 'uuid';

import { OwnershipService } from '@/services/ownership.service';

import { CacheService } from '../cache/cache.service';

describe('OwnershipService', () => {
	const userRepository = mockInstance(UserRepository);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const cacheService = mockInstance(CacheService);
	const ownershipService = new OwnershipService(
		cacheService,
		userRepository,
		projectRelationRepository,
		mockInstance(WorkflowRepository),
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// getWorkflowProjectCached tests removed as SharedWorkflow entity no longer exists

	describe('getPersonalProjectOwnerCached()', () => {
		test('should retrieve a project owner', async () => {
			// ARRANGE
			const project = new Project();
			const owner = new User();
			owner.role = GLOBAL_OWNER_ROLE;
			const projectRelation = new ProjectRelation();
			projectRelation.role = PROJECT_OWNER_ROLE;
			(projectRelation.project = project), (projectRelation.user = owner);

			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([projectRelation]);

			// ACT
			const returnedOwner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			// ASSERT
			expect(returnedOwner).toBe(owner);
		});

		test('should not throw if no project owner found, should return null instead', async () => {
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([]);

			const owner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			expect(owner).toBeNull();
		});

		test('should not use the repository if the owner was found in the cache', async () => {
			// ARRANGE
			const project = new Project();
			project.id = uuid();
			const owner = new User();
			owner.id = uuid();
			owner.role = GLOBAL_OWNER_ROLE;
			const projectRelation = new ProjectRelation();
			projectRelation.role = { slug: PROJECT_OWNER_ROLE_SLUG } as any;
			(projectRelation.project = project), (projectRelation.user = owner);

			cacheService.getHashValue.mockResolvedValueOnce(owner);
			userRepository.create.mockReturnValueOnce(owner);

			// ACT
			const foundOwner = await ownershipService.getPersonalProjectOwnerCached(project.id);

			// ASSERT
			expect(cacheService.getHashValue).toHaveBeenCalledTimes(1);
			expect(cacheService.getHashValue).toHaveBeenCalledWith('project-owner', project.id);
			expect(projectRelationRepository.getPersonalProjectOwners).not.toHaveBeenCalled();
			expect(foundOwner).toEqual(owner);
		});
	});

	describe('getProjectOwnerCached()', () => {
		test('should retrieve a project owner', async () => {
			const mockProject = new Project();
			const mockOwner = new User();
			mockOwner.role = GLOBAL_OWNER_ROLE;

			const projectRelation = Object.assign(new ProjectRelation(), {
				role: PROJECT_OWNER_ROLE_SLUG,
				project: mockProject,
				user: mockOwner,
			});

			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([projectRelation]);

			const returnedOwner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			expect(returnedOwner).toBe(mockOwner);
		});

		test('should not throw if no project owner found, should return null instead', async () => {
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([]);

			const owner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			expect(owner).toBeNull();
		});
	});

	// addOwnedByAndSharedWith tests removed as credential.shared and workflow.shared no longer exist

	describe('getInstanceOwner()', () => {
		test('should find owner using global owner role ID', async () => {
			await ownershipService.getInstanceOwner();

			expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
				where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			});
		});
	});
});
