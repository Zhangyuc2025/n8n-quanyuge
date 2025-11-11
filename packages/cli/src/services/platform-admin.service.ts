import { Logger } from '@n8n/backend-common';
import { PlatformAdminRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';

import { PasswordUtility } from './password.utility';

import type { PlatformAdmin } from '@n8n/db';

/**
 * Platform Admin Service
 *
 * Manages platform administrator operations including:
 * - Admin creation and authentication
 * - Password validation and hashing
 * - Admin lifecycle management
 * - Login tracking
 */
@Service()
export class PlatformAdminService {
	constructor(
		private readonly logger: Logger,
		private readonly platformAdminRepository: PlatformAdminRepository,
		private readonly passwordUtility: PasswordUtility,
		private readonly eventService: EventService,
	) {}

	/**
	 * Create a new platform administrator
	 *
	 * Creates a platform admin with hashed password. This is typically used
	 * during system initialization to create the first admin account.
	 *
	 * @param data - Admin creation data including email, password, and name
	 * @returns The created platform admin (password excluded)
	 * @throws {BadRequestError} When an admin with the same email already exists
	 */
	async createAdmin(data: {
		email: string;
		password: string;
		name: string;
	}): Promise<PlatformAdmin> {
		// Check if admin with this email already exists
		const existingAdmin = await this.platformAdminRepository.findByEmail(data.email);
		if (existingAdmin) {
			throw new BadRequestError('Platform admin with this email already exists');
		}

		// Hash the password
		const hashedPassword = await this.passwordUtility.hash(data.password);

		// Create the admin
		const admin = this.platformAdminRepository.create({
			email: data.email,
			password: hashedPassword,
			name: data.name,
			isActive: true,
		});

		const savedAdmin = await this.platformAdminRepository.save(admin);

		this.logger.info('Platform admin created', {
			adminId: savedAdmin.id,
			email: savedAdmin.email,
		});

		// Emit event
		this.eventService.emit('platform-admin-created', {
			adminId: savedAdmin.id,
			email: savedAdmin.email,
		});

		return savedAdmin;
	}

	/**
	 * Validate admin login credentials
	 *
	 * Checks email and password combination, updates lastLoginAt timestamp
	 * if authentication is successful.
	 *
	 * @param email - Admin email address
	 * @param password - Plain text password
	 * @returns The authenticated admin if credentials are valid, null otherwise
	 */
	async validateLogin(email: string, password: string): Promise<PlatformAdmin | null> {
		// Find active admin by email
		const admin = await this.platformAdminRepository.findActiveByEmail(email);

		if (!admin) {
			this.logger.debug('Platform admin login failed: admin not found or inactive', { email });
			return null;
		}

		// Verify password
		const isPasswordValid = await this.passwordUtility.compare(password, admin.password);

		if (!isPasswordValid) {
			this.logger.debug('Platform admin login failed: invalid password', { email });
			return null;
		}

		// Update last login timestamp
		await this.updateLastLogin(admin.id);

		this.logger.info('Platform admin logged in', {
			adminId: admin.id,
			email: admin.email,
		});

		// Emit event
		this.eventService.emit('platform-admin-login', {
			adminId: admin.id,
			email: admin.email,
		});

		return admin;
	}

	/**
	 * Find a platform admin by email address
	 *
	 * @param email - Admin email address
	 * @returns The platform admin if found, null otherwise
	 */
	async findByEmail(email: string): Promise<PlatformAdmin | null> {
		return await this.platformAdminRepository.findByEmail(email);
	}

	/**
	 * Update last login timestamp for an admin
	 *
	 * @param id - Platform admin ID
	 */
	async updateLastLogin(id: string): Promise<void> {
		await this.platformAdminRepository.updateLastLogin(id);
	}

	/**
	 * List all active platform administrators
	 *
	 * @returns Array of active platform admins
	 */
	async listAdmins(): Promise<PlatformAdmin[]> {
		return await this.platformAdminRepository.findAllActive();
	}

	/**
	 * Deactivate a platform administrator
	 *
	 * Deactivates an admin account, preventing future logins.
	 * The admin record is not deleted, only marked as inactive.
	 *
	 * @param id - Platform admin ID to deactivate
	 * @throws {NotFoundError} When admin with specified ID is not found
	 */
	async deactivateAdmin(id: string): Promise<void> {
		// Verify admin exists
		const admin = await this.platformAdminRepository.findOneBy({ id });
		if (!admin) {
			throw new NotFoundError('Platform admin not found');
		}

		// Deactivate the admin
		await this.platformAdminRepository.deactivate(id);

		this.logger.info('Platform admin deactivated', {
			adminId: id,
			email: admin.email,
		});

		// Emit event
		this.eventService.emit('platform-admin-deactivated', {
			adminId: id,
			email: admin.email,
		});
	}
}
