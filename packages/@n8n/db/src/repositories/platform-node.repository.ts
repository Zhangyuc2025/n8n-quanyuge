import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { PlatformNode } from '../entities';

/**
 * Repository for PlatformNode entity
 * Handles database operations for platform official and third-party approved nodes
 */
@Service()
export class PlatformNodeRepository extends Repository<PlatformNode> {
	constructor(dataSource: DataSource) {
		super(PlatformNode, dataSource.manager);
	}

	/**
	 * Find all active platform nodes
	 * @returns Array of active platform nodes
	 */
	async findActive() {
		return await this.find({
			where: {
				isActive: true,
				enabled: true,
			},
		});
	}

	/**
	 * Find platform node by node key
	 * @param nodeKey Node key identifier
	 * @returns Platform node or null
	 */
	async findByNodeKey(nodeKey: string) {
		return await this.findOne({
			where: { nodeKey },
		});
	}

	/**
	 * Find active platform node by node key
	 * @param nodeKey Node key identifier
	 * @returns Active platform node or null
	 */
	async findActiveByNodeKey(nodeKey: string) {
		return await this.findOne({
			where: {
				nodeKey,
				isActive: true,
				enabled: true,
			},
		});
	}

	/**
	 * Find nodes by category
	 * @param category Category name
	 * @returns Array of nodes in the category
	 */
	async findByCategory(category: string) {
		return await this.find({
			where: {
				category,
				isActive: true,
				enabled: true,
			},
		});
	}

	/**
	 * Find nodes by type
	 * @param nodeType Node type ('platform_official' | 'third_party_approved')
	 * @returns Array of nodes of the specified type
	 */
	async findByNodeType(nodeType: string) {
		return await this.find({
			where: {
				nodeType,
				isActive: true,
				enabled: true,
			},
		});
	}

	/**
	 * Find nodes pending approval
	 * @returns Array of nodes pending approval
	 */
	async findPendingApproval() {
		return await this.find({
			where: {
				submissionStatus: 'approved',
			},
			relations: ['submitter', 'reviewer'],
		});
	}
}
