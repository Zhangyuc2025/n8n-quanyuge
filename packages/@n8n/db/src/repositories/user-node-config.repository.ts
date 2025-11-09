import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { UserNodeConfig } from '../entities';

/**
 * Repository for UserNodeConfig entity
 * Handles database operations for user-specific node configurations
 */
@Service()
export class UserNodeConfigRepository extends Repository<UserNodeConfig> {
	constructor(dataSource: DataSource) {
		super(UserNodeConfig, dataSource.manager);
	}

	/**
	 * Find all configurations for a user
	 * @param userId User ID
	 * @returns Array of user node configurations
	 */
	async findByUser(userId: string) {
		return await this.find({
			where: {
				userId,
				isConfigured: true,
			},
		});
	}

	/**
	 * Find configuration for a user and node type
	 * @param userId User ID
	 * @param nodeType Node type identifier
	 * @returns User node configuration or null
	 */
	async findByUserAndNodeType(userId: string, nodeType: string) {
		return await this.findOne({
			where: {
				userId,
				nodeType,
			},
		});
	}

	/**
	 * Find active configuration for a user and node type
	 * @param userId User ID
	 * @param nodeType Node type identifier
	 * @returns Active user node configuration or null
	 */
	async findActiveByUserAndNodeType(userId: string, nodeType: string) {
		return await this.findOne({
			where: {
				userId,
				nodeType,
				isConfigured: true,
			},
		});
	}

	/**
	 * Update last used timestamp for a configuration
	 * @param userId User ID
	 * @param nodeType Node type identifier
	 * @returns Update result
	 */
	async updateLastUsedAt(userId: string, nodeType: string) {
		return await this.update(
			{
				userId,
				nodeType,
			},
			{
				lastUsedAt: new Date(),
			},
		);
	}

	/**
	 * Find configurations not used since a specific date
	 * @param sinceDate Date to check
	 * @returns Array of unused configurations
	 */
	async findUnusedSince(sinceDate: Date) {
		return await this.createQueryBuilder('config')
			.where('config.lastUsedAt < :sinceDate OR config.lastUsedAt IS NULL', { sinceDate })
			.getMany();
	}

	/**
	 * Delete configuration for a user and node type
	 * @param userId User ID
	 * @param nodeType Node type identifier
	 * @returns Delete result
	 */
	async deleteByUserAndNodeType(userId: string, nodeType: string) {
		return await this.delete({
			userId,
			nodeType,
		});
	}
}
