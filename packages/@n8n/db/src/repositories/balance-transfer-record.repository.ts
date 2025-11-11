import { Service } from '@n8n/di';
import { DataSource, Repository, EntityManager } from '@n8n/typeorm';

import { BalanceTransferRecord } from '../entities';
import { withTransaction } from '../utils/transaction';

/**
 * Repository for managing balance transfer records between users and workspaces.
 * Tracks transfers from user personal balance to workspace shared pool.
 */
@Service()
export class BalanceTransferRecordRepository extends Repository<BalanceTransferRecord> {
	constructor(dataSource: DataSource) {
		super(BalanceTransferRecord, dataSource.manager);
	}

	/**
	 * Create a new balance transfer record
	 * Supports transactions for atomic operations with balance updates
	 */
	async createTransfer(
		data: {
			fromUserId: string;
			toWorkspaceId: string;
			amount: number;
		},
		trx?: EntityManager,
	): Promise<BalanceTransferRecord> {
		return await withTransaction(
			this.manager,
			trx,
			async (em: EntityManager) => {
				const record = em.create(BalanceTransferRecord, {
					fromUserId: data.fromUserId,
					toWorkspaceId: data.toWorkspaceId,
					amount: data.amount,
				});
				await em.save(BalanceTransferRecord, record);
				return record;
			},
			false,
		);
	}

	/**
	 * Find all transfer records from a specific user
	 * Returns records ordered by most recent first
	 */
	async findByUser(userId: string): Promise<BalanceTransferRecord[]> {
		return await this.find({
			where: { fromUserId: userId },
			order: { createdAt: 'DESC' },
			relations: ['toWorkspace'],
		});
	}

	/**
	 * Find all transfer records to a specific workspace
	 * Returns records ordered by most recent first
	 */
	async findByWorkspace(workspaceId: string): Promise<BalanceTransferRecord[]> {
		return await this.find({
			where: { toWorkspaceId: workspaceId },
			order: { createdAt: 'DESC' },
			relations: ['fromUser'],
		});
	}

	/**
	 * Get total amount transferred from a user to a specific workspace
	 */
	async getTotalTransferredToWorkspace(userId: string, workspaceId: string): Promise<number> {
		const result = await this.createQueryBuilder('transfer')
			.select('SUM(transfer.amount)', 'total')
			.where('transfer.fromUserId = :userId', { userId })
			.andWhere('transfer.toWorkspaceId = :workspaceId', { workspaceId })
			.getRawOne<{ total: string | null }>();

		return result?.total ? parseFloat(result.total) : 0;
	}

	/**
	 * Get total amount transferred from a user (all workspaces)
	 */
	async getTotalTransferredByUser(userId: string): Promise<number> {
		const result = await this.createQueryBuilder('transfer')
			.select('SUM(transfer.amount)', 'total')
			.where('transfer.fromUserId = :userId', { userId })
			.getRawOne<{ total: string | null }>();

		return result?.total ? parseFloat(result.total) : 0;
	}

	/**
	 * Get total amount received by a workspace (all users)
	 */
	async getTotalReceivedByWorkspace(workspaceId: string): Promise<number> {
		const result = await this.createQueryBuilder('transfer')
			.select('SUM(transfer.amount)', 'total')
			.where('transfer.toWorkspaceId = :workspaceId', { workspaceId })
			.getRawOne<{ total: string | null }>();

		return result?.total ? parseFloat(result.total) : 0;
	}

	/**
	 * Find transfer records within a date range
	 */
	async findByDateRange(
		startDate: Date,
		endDate: Date,
		options?: { userId?: string; workspaceId?: string },
	): Promise<BalanceTransferRecord[]> {
		const query = this.createQueryBuilder('transfer')
			.where('transfer.createdAt >= :startDate', { startDate })
			.andWhere('transfer.createdAt <= :endDate', { endDate });

		if (options?.userId) {
			query.andWhere('transfer.fromUserId = :userId', { userId: options.userId });
		}

		if (options?.workspaceId) {
			query.andWhere('transfer.toWorkspaceId = :workspaceId', {
				workspaceId: options.workspaceId,
			});
		}

		return await query
			.orderBy('transfer.createdAt', 'DESC')
			.leftJoinAndSelect('transfer.fromUser', 'fromUser')
			.leftJoinAndSelect('transfer.toWorkspace', 'toWorkspace')
			.getMany();
	}

	/**
	 * Get transfer statistics for a user
	 */
	async getUserTransferStats(userId: string): Promise<{
		totalTransferred: number;
		transferCount: number;
		workspaceCount: number;
	}> {
		const result = await this.createQueryBuilder('transfer')
			.select('SUM(transfer.amount)', 'totalTransferred')
			.addSelect('COUNT(transfer.id)', 'transferCount')
			.addSelect('COUNT(DISTINCT transfer.toWorkspaceId)', 'workspaceCount')
			.where('transfer.fromUserId = :userId', { userId })
			.getRawOne<{
				totalTransferred: string | null;
				transferCount: string;
				workspaceCount: string;
			}>();

		return {
			totalTransferred: result?.totalTransferred ? parseFloat(result.totalTransferred) : 0,
			transferCount: parseInt(result?.transferCount ?? '0'),
			workspaceCount: parseInt(result?.workspaceCount ?? '0'),
		};
	}

	/**
	 * Get transfer statistics for a workspace
	 */
	async getWorkspaceTransferStats(workspaceId: string): Promise<{
		totalReceived: number;
		transferCount: number;
		contributorCount: number;
	}> {
		const result = await this.createQueryBuilder('transfer')
			.select('SUM(transfer.amount)', 'totalReceived')
			.addSelect('COUNT(transfer.id)', 'transferCount')
			.addSelect('COUNT(DISTINCT transfer.fromUserId)', 'contributorCount')
			.where('transfer.toWorkspaceId = :workspaceId', { workspaceId })
			.getRawOne<{
				totalReceived: string | null;
				transferCount: string;
				contributorCount: string;
			}>();

		return {
			totalReceived: result?.totalReceived ? parseFloat(result.totalReceived) : 0,
			transferCount: parseInt(result?.transferCount ?? '0'),
			contributorCount: parseInt(result?.contributorCount ?? '0'),
		};
	}
}
