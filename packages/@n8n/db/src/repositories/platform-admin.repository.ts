import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { PlatformAdmin } from '../entities';

/**
 * Repository for managing platform administrators.
 * Platform admins are system-level administrators with full platform access.
 */
@Service()
export class PlatformAdminRepository extends Repository<PlatformAdmin> {
	constructor(dataSource: DataSource) {
		super(PlatformAdmin, dataSource.manager);
	}

	/**
	 * Find a platform admin by email address
	 * Used during login authentication
	 */
	async findByEmail(email: string): Promise<PlatformAdmin | null> {
		return await this.findOne({
			where: { email },
		});
	}

	/**
	 * Find an active platform admin by email
	 * Used to verify admin is active during authentication
	 */
	async findActiveByEmail(email: string): Promise<PlatformAdmin | null> {
		return await this.findOne({
			where: {
				email,
				isActive: true,
			},
		});
	}

	/**
	 * Update last login timestamp for an admin
	 */
	async updateLastLogin(id: string): Promise<void> {
		await this.update(id, {
			lastLoginAt: new Date(),
		});
	}

	/**
	 * Check if any platform admins exist
	 * Used during system initialization to determine if setup is needed
	 */
	async hasAnyAdmins(): Promise<boolean> {
		const count = await this.count();
		return count > 0;
	}

	/**
	 * Find all active platform admins
	 */
	async findAllActive(): Promise<PlatformAdmin[]> {
		return await this.find({
			where: { isActive: true },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Deactivate a platform admin by ID
	 */
	async deactivate(id: string): Promise<void> {
		await this.update(id, {
			isActive: false,
		});
	}

	/**
	 * Activate a platform admin by ID
	 */
	async activate(id: string): Promise<void> {
		await this.update(id, {
			isActive: true,
		});
	}
}
