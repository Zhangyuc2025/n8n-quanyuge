import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { SystemConfig } from '../entities';

/**
 * Repository for managing system-wide configuration key-value pairs.
 * Used for platform initialization status and other system-level settings.
 */
@Service()
export class SystemConfigRepository extends Repository<SystemConfig> {
	constructor(dataSource: DataSource) {
		super(SystemConfig, dataSource.manager);
	}

	/**
	 * Find a configuration value by key
	 */
	async findByKey(key: string): Promise<SystemConfig | null> {
		return await this.findOneBy({ key });
	}

	/**
	 * Get a configuration value by key (returns the value string or null)
	 */
	async getValue(key: string): Promise<string | null> {
		const config = await this.findByKey(key);
		return config?.value ?? null;
	}

	/**
	 * Set a configuration value (creates or updates)
	 */
	async setValue(key: string, value: string): Promise<void> {
		const existing = await this.findByKey(key);

		if (existing) {
			await this.update(key, {
				value,
				updatedAt: new Date(),
			});
		} else {
			const config = this.create({
				key,
				value,
				updatedAt: new Date(),
			});
			await this.save(config);
		}
	}

	/**
	 * Check if a configuration key exists
	 */
	async hasKey(key: string): Promise<boolean> {
		const count = await this.countBy({ key });
		return count > 0;
	}

	/**
	 * Delete a configuration key
	 */
	async deleteKey(key: string): Promise<void> {
		await this.delete({ key });
	}

	/**
	 * Get all configuration entries
	 * Use with caution - should only be used for admin panels or debugging
	 */
	async findAll(): Promise<SystemConfig[]> {
		return await this.find({
			order: { key: 'ASC' },
		});
	}
}
