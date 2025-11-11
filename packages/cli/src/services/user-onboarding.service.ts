import { Logger } from '@n8n/backend-common';
import {
	UserRepository,
	ProjectRepository,
	WorkspaceBalanceRepository,
	Project,
	ProjectRelation,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';

/**
 * Initial balance for new users (in CNY)
 */
const INITIAL_USER_BALANCE = 10.0;

/**
 * User Onboarding Service
 *
 * Handles the onboarding process for new users, including:
 * - Creating personal workspaces
 * - Initializing user balances
 * - Setting up workspace balance records
 * - Emitting onboarding events
 */
@Service()
export class UserOnboardingService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workspaceBalanceRepository: WorkspaceBalanceRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * Onboard a new user by creating their personal workspace and initializing their balance.
	 *
	 * This method orchestrates the complete onboarding process:
	 * 1. Creates a personal workspace for the user
	 * 2. Initializes the user's personal balance
	 * 3. Emits onboarding events
	 *
	 * @param userId - The ID of the user to onboard
	 * @returns Object containing the personal workspace ID and initial balance
	 * @throws {UserError} If the user is not found or onboarding fails
	 */
	async onboardNewUser(
		userId: string,
	): Promise<{ personalWorkspaceId: string; initialBalance: number }> {
		this.logger.debug(`Starting onboarding process for user ${userId}`);

		try {
			// Find the user
			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});

			if (!user) {
				throw new UserError(`User not found: ${userId}`);
			}

			// Create personal workspace with transaction
			const personalWorkspace = await this.createPersonalWorkspace(
				userId,
				user.createPersonalProjectName(),
			);

			// Initialize user balance
			await this.initializeUserBalance(userId, INITIAL_USER_BALANCE);

			// Emit onboarding events
			this.eventService.emit('user-onboarded', {
				userId,
				workspaceId: personalWorkspace.id,
				initialBalance: INITIAL_USER_BALANCE,
			});

			this.logger.info(
				`User ${userId} onboarded successfully with workspace ${personalWorkspace.id}`,
			);

			return {
				personalWorkspaceId: personalWorkspace.id,
				initialBalance: INITIAL_USER_BALANCE,
			};
		} catch (error) {
			this.logger.error(`Failed to onboard user ${userId}`, { error });
			throw error instanceof UserError
				? error
				: new UserError(
						`Failed to onboard user: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
		}
	}

	/**
	 * Create a personal workspace for a user.
	 *
	 * This method creates a new personal project with the following characteristics:
	 * - Type: 'personal'
	 * - Billing mode: 'executor' (charges to user's personal balance)
	 * - Creates a project relation linking the user as the project owner
	 *
	 * The operation is performed within a transaction to ensure atomicity.
	 *
	 * @param userId - The ID of the user
	 * @param userName - The name to use for the workspace (typically from user.createPersonalProjectName())
	 * @returns The created Project entity
	 * @throws {UserError} If workspace creation fails
	 */
	async createPersonalWorkspace(userId: string, userName: string): Promise<Project> {
		this.logger.debug(`Creating personal workspace for user ${userId}`);

		try {
			// Use transaction for atomic operation
			const result = await this.projectRepository.manager.transaction(async (manager) => {
				// Create the project
				const project = manager.create(Project, {
					type: 'personal',
					name: `${userName}'s Workspace`,
					billingMode: 'executor',
				});

				const savedProject = await manager.save(Project, project);

				// Create the project relation (user as owner)
				const projectRelation = manager.create(ProjectRelation, {
					projectId: savedProject.id,
					userId,
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
				});

				await manager.save(ProjectRelation, projectRelation);

				return savedProject;
			});

			// Emit event
			this.eventService.emit('personal-workspace-created', {
				userId,
				workspaceId: result.id,
				workspaceName: result.name,
			});

			this.logger.info(`Personal workspace ${result.id} created for user ${userId}`);

			return result;
		} catch (error) {
			this.logger.error(`Failed to create personal workspace for user ${userId}`, { error });
			throw new UserError(
				`Failed to create personal workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Initialize user balance and create workspace balance record.
	 *
	 * This method performs two operations within a transaction:
	 * 1. Sets the user's personal balance field
	 * 2. Creates an initial workspace balance record (for future shared-pool billing mode)
	 *
	 * Note: The workspace balance record is created for consistency, even though
	 * personal workspaces use 'executor' billing mode by default.
	 *
	 * @param userId - The ID of the user
	 * @param amount - The initial balance amount in CNY (default: 10.0)
	 * @throws {UserError} If balance initialization fails
	 */
	async initializeUserBalance(
		userId: string,
		amount: number = INITIAL_USER_BALANCE,
	): Promise<void> {
		this.logger.debug(`Initializing balance for user ${userId} with amount ${amount} CNY`);

		try {
			await this.userRepository.manager.transaction(async (manager) => {
				// Update user balance
				const user = await manager.findOne(UserRepository.prototype.target, {
					where: { id: userId },
				});

				if (!user) {
					throw new UserError(`User not found: ${userId}`);
				}

				user.balance = amount;
				await manager.save(user);

				// Get the user's personal project
				const personalProject = await manager.findOne(Project, {
					where: {
						type: 'personal',
						projectRelations: {
							userId,
							role: { slug: PROJECT_OWNER_ROLE_SLUG },
						},
					},
				});

				if (!personalProject) {
					throw new UserError(`Personal workspace not found for user: ${userId}`);
				}

				// Create workspace balance record
				await this.workspaceBalanceRepository.addBalance(personalProject.id, 0);
			});

			this.logger.info(`Balance initialized for user ${userId}: ${amount} CNY`);
		} catch (error) {
			this.logger.error(`Failed to initialize balance for user ${userId}`, { error });
			throw error instanceof UserError
				? error
				: new UserError(
						`Failed to initialize balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
		}
	}
}
