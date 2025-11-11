import { Service } from '@n8n/di';
import { SystemConfigRepository, PlatformAdminRepository } from '@n8n/db';
import { UserError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';

/**
 * Platform initialization error
 *
 * Thrown when operations related to platform initialization fail
 */
export class PlatformInitializationError extends UserError {
	constructor(message: string) {
		super(`Platform initialization failed: ${message}`);
	}
}

/**
 * System initialization status interface
 */
export interface InitializationStatus {
	/** Whether the platform has been marked as initialized */
	initialized: boolean;
	/** Whether at least one platform admin exists */
	hasAdmin: boolean;
}

/**
 * System Initialization Service
 *
 * Manages platform initialization state and related operations:
 * - Check if platform is initialized
 * - Mark platform as initialized
 * - Check initialization status along with admin existence
 */
@Service()
export class SystemInitService {
	/** System config key for platform initialization status */
	private readonly PLATFORM_INITIALIZED_KEY = 'platform_initialized';

	constructor(
		private readonly systemConfigRepository: SystemConfigRepository,
		private readonly platformAdminRepository: PlatformAdminRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * Check if the platform has been initialized
	 *
	 * Queries the system config to determine if the platform initialization
	 * process has been completed. A platform is considered initialized when
	 * the 'platform_initialized' config value is set to 'true'.
	 *
	 * @returns True if platform is initialized, false otherwise
	 */
	async isPlatformInitialized(): Promise<boolean> {
		try {
			const value = await this.systemConfigRepository.getValue(this.PLATFORM_INITIALIZED_KEY);
			return value === 'true';
		} catch (error) {
			throw new PlatformInitializationError(
				`Failed to check initialization status: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Check comprehensive initialization status
	 *
	 * Returns both the platform initialization flag and whether any
	 * platform administrators exist in the system. This is useful for
	 * setup wizards and initialization flows that need to determine
	 * what steps remain.
	 *
	 * @returns Object containing both initialization and admin existence status
	 */
	async checkInitializationStatus(): Promise<InitializationStatus> {
		try {
			const [initialized, hasAdmin] = await Promise.all([
				this.isPlatformInitialized(),
				this.platformAdminRepository.hasAnyAdmins(),
			]);

			return {
				initialized,
				hasAdmin,
			};
		} catch (error) {
			throw new PlatformInitializationError(
				`Failed to check initialization status: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Mark the platform as initialized
	 *
	 * Sets the platform initialization flag to 'true' in system config
	 * and emits a 'platform-initialized' event. This should be called
	 * after completing all required setup steps (e.g., creating first admin).
	 *
	 * This operation is idempotent - calling it multiple times is safe.
	 *
	 * @throws {PlatformInitializationError} If the operation fails
	 */
	async markPlatformInitialized(): Promise<void> {
		try {
			await this.systemConfigRepository.setValue(this.PLATFORM_INITIALIZED_KEY, 'true');
			this.eventService.emit('platform-initialized', {});
		} catch (error) {
			throw new PlatformInitializationError(
				`Failed to mark platform as initialized: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
