import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { CustomNode } from '../entities';

/**
 * Repository for CustomNode entity
 * Handles database operations for user-uploaded workspace-specific custom nodes
 */
@Service()
export class CustomNodeRepository extends Repository<CustomNode> {
	constructor(dataSource: DataSource) {
		super(CustomNode, dataSource.manager);
	}

	/**
	 * Find all active custom nodes for a workspace
	 * @param workspaceId Workspace ID
	 * @returns Array of active custom nodes
	 */
	async findByWorkspace(workspaceId: string) {
		return await this.find({
			where: {
				workspaceId,
				isActive: true,
			},
		});
	}

	/**
	 * Find custom node by workspace and node key
	 * @param workspaceId Workspace ID
	 * @param nodeKey Node key identifier
	 * @returns Custom node or null
	 */
	async findByWorkspaceAndNodeKey(workspaceId: string, nodeKey: string) {
		return await this.findOne({
			where: {
				workspaceId,
				nodeKey,
			},
		});
	}

	/**
	 * Find active custom node by workspace and node key
	 * @param workspaceId Workspace ID
	 * @param nodeKey Node key identifier
	 * @returns Active custom node or null
	 */
	async findActiveByWorkspaceAndNodeKey(workspaceId: string, nodeKey: string) {
		return await this.findOne({
			where: {
				workspaceId,
				nodeKey,
				isActive: true,
			},
		});
	}

	/**
	 * Find custom nodes by category for a workspace
	 * @param workspaceId Workspace ID
	 * @param category Category name
	 * @returns Array of custom nodes in the category
	 */
	async findByWorkspaceAndCategory(workspaceId: string, category: string) {
		return await this.find({
			where: {
				workspaceId,
				category,
				isActive: true,
			},
		});
	}

	/**
	 * Find custom nodes by configuration mode
	 * @param workspaceId Workspace ID
	 * @param configMode Configuration mode ('personal' | 'shared')
	 * @returns Array of custom nodes with the specified config mode
	 */
	async findByWorkspaceAndConfigMode(workspaceId: string, configMode: 'personal' | 'shared') {
		return await this.find({
			where: {
				workspaceId,
				configMode,
				isActive: true,
			},
		});
	}

	/**
	 * Find custom nodes created by a user
	 * @param createdBy Creator user ID
	 * @returns Array of custom nodes created by the user
	 */
	async findByCreator(createdBy: string) {
		return await this.find({
			where: {
				createdBy,
			},
			relations: ['workspace'],
		});
	}

	/**
	 * Find custom nodes pending approval
	 * @returns Array of custom nodes pending approval
	 */
	async findPendingApproval() {
		return await this.find({
			where: {
				submissionStatus: 'pending',
			},
			relations: ['workspace', 'creator', 'reviewer'],
		});
	}

	/**
	 * Find custom nodes by submission status
	 * @param submissionStatus Submission status
	 * @returns Array of custom nodes with the specified submission status
	 */
	async findBySubmissionStatus(submissionStatus: 'draft' | 'pending' | 'approved' | 'rejected') {
		return await this.find({
			where: {
				submissionStatus,
			},
			relations: ['workspace', 'creator'],
		});
	}
}
