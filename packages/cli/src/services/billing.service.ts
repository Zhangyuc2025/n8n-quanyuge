import { Service } from '@n8n/di';
import {
	WorkspaceBalanceRepository,
	UsageRecordRepository,
	RechargeRecordRepository,
	UserRepository,
	ProjectRepository,
	BalanceTransferRecordRepository,
	User,
	WorkspaceBalance,
} from '@n8n/db';
import { UserError } from 'n8n-workflow';

/**
 * 余额不足错误
 *
 * 当执行扣费操作时余额不足时抛出此错误
 */
export class InsufficientBalanceError extends UserError {
	constructor(required: number, available: number) {
		super(`Insufficient balance. Required: ${required} CNY, Available: ${available} CNY`);
	}
}

/**
 * 余额扣除失败错误
 *
 * 当余额扣除过程中发生错误时抛出此错误
 */
export class BalanceDeductionError extends UserError {
	constructor(message: string) {
		super(`Balance deduction failed: ${message}`);
	}
}

/**
 * 计费服务接口 - 扣费结果
 */
interface DeductBalanceResult {
	/** 扣费是否成功 */
	success: boolean;
	/** 扣费后的新余额（仅当成功时） */
	newBalance?: number;
	/** 错误信息（仅当失败时） */
	error?: string;
}

/**
 * 计费服务接口 - 扣费元数据
 */
interface DeductBalanceMetadata {
	/** 服务标识（例如：'openai-gpt4', 'anthropic-claude'） */
	serviceKey: string;
	/** 发起调用的用户ID */
	userId: string;
	/** 使用的token数量（可选） */
	tokensUsed?: number;
	/** 余额来源（可选，用于记录） */
	balanceSource?: 'user' | 'workspace';
}

/**
 * 计费服务接口 - 使用统计
 */
export interface UsageStats {
	/** 总消费金额（CNY） */
	totalAmount: number;
	/** 总使用token数 */
	totalTokens: number;
	/** 记录总数 */
	recordCount: number;
}

/**
 * 计费服务
 *
 * 负责管理工作空间的计费相关操作，包括：
 * - 余额查询和扣除
 * - 余额充值
 * - 使用记录管理
 * - 使用统计查询
 */
@Service()
export class BillingService {
	constructor(
		private readonly workspaceBalanceRepository: WorkspaceBalanceRepository,
		private readonly usageRecordRepository: UsageRecordRepository,
		private readonly rechargeRecordRepository: RechargeRecordRepository,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly balanceTransferRecordRepository: BalanceTransferRecordRepository,
	) {}

	/**
	 * 获取工作空间当前余额
	 *
	 * 查询指定工作空间的当前可用余额（人民币）。
	 *
	 * @param workspaceId - 工作空间ID
	 * @returns 当前余额（CNY），如果工作空间没有余额记录则返回 0
	 */
	async getBalance(workspaceId: string): Promise<number> {
		const balance = await this.workspaceBalanceRepository.getBalance(workspaceId);
		return balance?.balanceCny ?? 0;
	}

	/**
	 * 扣除工作空间余额
	 *
	 * 使用悲观锁（pessimistic write lock）进行余额扣除，确保并发安全。
	 * 扣费成功后会自动创建使用记录。
	 *
	 * 操作流程：
	 * 1. 在 SERIALIZABLE 事务中锁定余额记录
	 * 2. 验证余额是否充足
	 * 3. 扣除指定金额
	 * 4. 创建使用记录
	 * 5. 提交事务
	 *
	 * @param workspaceId - 工作空间ID
	 * @param amount - 扣除金额（CNY，必须为正数）
	 * @param metadata - 扣费元数据（服务标识、用户ID、token数等）
	 * @returns 扣费结果对象，包含成功状态、新余额或错误信息
	 */
	async deductBalance(
		workspaceId: string,
		amount: number,
		metadata: DeductBalanceMetadata,
	): Promise<DeductBalanceResult> {
		// 执行余额扣除（带悲观锁）
		const result = await this.workspaceBalanceRepository.deductBalance(workspaceId, amount);

		// 如果扣费成功，创建使用记录
		if (result.success && result.newBalance !== undefined) {
			try {
				await this.usageRecordRepository.createRecord({
					workspaceId,
					userId: metadata.userId,
					serviceKey: metadata.serviceKey,
					amountCny: amount,
					tokensUsed: metadata.tokensUsed ?? 0,
				});
			} catch (error) {
				// 使用记录创建失败不影响扣费结果
				// 但应该记录日志以便后续处理
				console.error('Failed to create usage record:', error);
			}
		}

		return result;
	}

	/**
	 * 为工作空间充值
	 *
	 * 创建充值记录并增加工作空间余额。充值操作使用事务保证一致性。
	 *
	 * 操作流程：
	 * 1. 创建充值记录（状态为 'pending'）
	 * 2. 增加工作空间余额
	 * 3. 更新充值记录状态为 'completed'
	 *
	 * @param workspaceId - 工作空间ID
	 * @param amount - 充值金额（CNY，必须为正数）
	 * @param paymentMethod - 支付方式（例如：'alipay', 'wechat', 'bank_transfer'）
	 * @param transactionId - 第三方支付系统的交易ID（可选）
	 * @throws {Error} 当充值过程中发生错误时
	 */
	async recharge(
		workspaceId: string,
		amount: number,
		paymentMethod: string,
		transactionId?: string,
	): Promise<void> {
		// 创建充值记录（默认状态为 pending）
		const rechargeRecord = await this.rechargeRecordRepository.createRecord({
			workspaceId,
			amountCny: amount,
			paymentMethod,
			transactionId,
			status: 'pending',
		});

		try {
			// 增加余额
			await this.workspaceBalanceRepository.addBalance(workspaceId, amount);

			// 更新充值记录为已完成
			await this.rechargeRecordRepository.updateStatus(rechargeRecord.id, 'completed');
		} catch (error) {
			// 如果充值失败，更新状态为失败
			await this.rechargeRecordRepository.updateStatus(rechargeRecord.id, 'failed');
			throw error;
		}
	}

	/**
	 * 获取使用历史记录
	 *
	 * 查询指定工作空间的使用记录，支持按日期范围过滤。
	 *
	 * @param workspaceId - 工作空间ID
	 * @param startDate - 开始日期（可选）
	 * @param endDate - 结束日期（可选）
	 * @returns 使用记录数组，按创建时间降序排列
	 */
	async getUsageHistory(workspaceId: string, startDate?: Date, endDate?: Date): Promise<unknown[]> {
		return await this.usageRecordRepository.findByWorkspace(workspaceId, startDate, endDate);
	}

	/**
	 * 检查工作空间是否余额不足
	 *
	 * 判断当前余额是否低于预设的低余额阈值。
	 *
	 * @param workspaceId - 工作空间ID
	 * @returns 如果余额低于阈值返回 true，否则返回 false
	 */
	async checkLowBalance(workspaceId: string): Promise<boolean> {
		return await this.workspaceBalanceRepository.checkLowBalance(workspaceId);
	}

	/**
	 * 获取工作空间使用统计
	 *
	 * 统计指定时间范围内的总消费金额、总token使用量和记录数。
	 *
	 * @param workspaceId - 工作空间ID
	 * @param startDate - 开始日期
	 * @param endDate - 结束日期
	 * @returns 使用统计对象，包含总金额、总token数和记录数
	 */
	async getUsageStats(workspaceId: string, startDate: Date, endDate: Date): Promise<UsageStats> {
		return await this.usageRecordRepository.getWorkspaceUsageStats(workspaceId, startDate, endDate);
	}

	/**
	 * 根据计费模式扣除余额（双层扣费逻辑）
	 *
	 * 根据工作空间的计费模式（billingMode）决定从哪里扣费：
	 * - 'executor': 从执行者的个人余额扣费
	 * - 'shared-pool': 从工作空间的共享余额池扣费
	 *
	 * 操作流程：
	 * 1. 查询工作空间的计费模式
	 * 2. 根据计费模式选择扣费来源
	 * 3. 使用悲观锁进行余额扣除
	 * 4. 创建使用记录（记录 balanceSource）
	 * 5. 提交事务
	 *
	 * @param workspaceId - 工作空间ID
	 * @param executorUserId - 执行者用户ID
	 * @param amount - 扣除金额（CNY，必须为正数）
	 * @param metadata - 扣费元数据（服务标识、用户ID、token数等）
	 * @returns 扣费结果对象，包含成功状态、新余额或错误信息
	 * @throws {UserError} 当工作空间不存在时
	 * @throws {InsufficientBalanceError} 当余额不足时
	 */
	async deductBalanceWithMode(
		workspaceId: string,
		executorUserId: string,
		amount: number,
		metadata: DeductBalanceMetadata,
	): Promise<DeductBalanceResult> {
		// 获取工作空间信息（包含 billingMode）
		const project = await this.projectRepository.findOne({
			where: { id: workspaceId },
		});

		if (!project) {
			throw new UserError(`Workspace not found: ${workspaceId}`);
		}

		let result: DeductBalanceResult;
		let balanceSource: 'user' | 'workspace';

		// 根据计费模式选择扣费来源
		if (project.billingMode === 'executor') {
			// 从执行者个人余额扣费
			result = await this.deductUserBalance(executorUserId, amount);
			balanceSource = 'user';
		} else {
			// 从工作空间共享余额池扣费
			result = await this.workspaceBalanceRepository.deductBalance(workspaceId, amount);
			balanceSource = 'workspace';
		}

		// 如果扣费成功，创建使用记录
		if (result.success && result.newBalance !== undefined) {
			try {
				await this.usageRecordRepository.createRecord({
					workspaceId,
					userId: metadata.userId,
					serviceKey: metadata.serviceKey,
					amountCny: amount,
					tokensUsed: metadata.tokensUsed ?? 0,
					balanceSource, // 记录余额来源
				});
			} catch (error) {
				// 使用记录创建失败不影响扣费结果
				// 但应该记录日志以便后续处理
				console.error('Failed to create usage record:', error);
			}
		}

		return result;
	}

	/**
	 * 从用户个人余额扣费
	 *
	 * 使用悲观锁（pessimistic write lock）进行余额扣除，确保并发安全。
	 *
	 * 操作流程：
	 * 1. 在 SERIALIZABLE 事务中锁定用户记录
	 * 2. 验证余额是否充足
	 * 3. 扣除指定金额
	 * 4. 保存更新后的用户记录
	 * 5. 提交事务
	 *
	 * @param userId - 用户ID
	 * @param amount - 扣除金额（CNY，必须为正数）
	 * @returns 扣费结果对象，包含成功状态、新余额或错误信息
	 */
	async deductUserBalance(userId: string, amount: number): Promise<DeductBalanceResult> {
		const queryRunner = this.userRepository.manager.connection.createQueryRunner();

		await queryRunner.connect();
		await queryRunner.startTransaction('SERIALIZABLE');

		try {
			// Lock the row with pessimistic_write to prevent concurrent modifications
			const user = await queryRunner.manager.findOne(User, {
				where: { id: userId },
				lock: { mode: 'pessimistic_write' },
			});

			// Check if user exists
			if (!user) {
				await queryRunner.rollbackTransaction();
				return {
					success: false,
					error: `User not found: ${userId}`,
				};
			}

			// Check if balance is sufficient
			if (user.balance < amount) {
				await queryRunner.rollbackTransaction();
				return {
					success: false,
					error: `Insufficient balance. Current: ${user.balance}, Required: ${amount}`,
				};
			}

			// Deduct the amount
			user.balance -= amount;

			// Save the updated user
			await queryRunner.manager.save(user);

			// Commit the transaction
			await queryRunner.commitTransaction();

			return {
				success: true,
				newBalance: user.balance,
			};
		} catch (error) {
			await queryRunner.rollbackTransaction();
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * 获取用户个人余额
	 *
	 * 查询指定用户的当前可用余额（人民币）。
	 *
	 * @param userId - 用户ID
	 * @returns 当前余额（CNY），如果用户不存在则返回 0
	 */
	async getUserBalance(userId: string): Promise<number> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: ['balance'],
		});
		return user?.balance ?? 0;
	}

	/**
	 * 从用户余额转账到工作空间共享余额池
	 *
	 * 使用事务确保原子性操作：
	 * 1. 扣除用户个人余额
	 * 2. 增加工作空间共享余额
	 * 3. 创建余额转账记录
	 *
	 * 操作流程：
	 * 1. 在事务中扣除用户余额（带悲观锁）
	 * 2. 增加工作空间余额
	 * 3. 创建 BalanceTransferRecord 记录
	 * 4. 提交事务
	 *
	 * @param userId - 转出用户ID
	 * @param workspaceId - 转入工作空间ID
	 * @param amount - 转账金额（CNY，必须为正数）
	 * @throws {UserError} 当用户不存在时
	 * @throws {InsufficientBalanceError} 当用户余额不足时
	 * @throws {Error} 当转账过程中发生其他错误时
	 */
	async transferBalanceToWorkspace(
		userId: string,
		workspaceId: string,
		amount: number,
	): Promise<void> {
		const queryRunner = this.userRepository.manager.connection.createQueryRunner();

		await queryRunner.connect();
		await queryRunner.startTransaction('SERIALIZABLE');

		try {
			// 1. 扣除用户余额（带悲观锁）
			const user = await queryRunner.manager.findOne(User, {
				where: { id: userId },
				lock: { mode: 'pessimistic_write' },
			});

			if (!user) {
				throw new UserError(`User not found: ${userId}`);
			}

			if (user.balance < amount) {
				throw new InsufficientBalanceError(amount, user.balance);
			}

			user.balance -= amount;
			await queryRunner.manager.save(user);

			// 2. 增加工作空间余额（带悲观锁）
			let workspaceBalance = await queryRunner.manager.findOne(WorkspaceBalance, {
				where: { workspaceId },
				lock: { mode: 'pessimistic_write' },
			});

			if (workspaceBalance) {
				workspaceBalance.balanceCny += amount;
			} else {
				// Create new balance record if it doesn't exist
				workspaceBalance = queryRunner.manager.create(WorkspaceBalance, {
					workspaceId,
					balanceCny: amount,
					lowBalanceThresholdCny: 10.0,
					currency: 'CNY',
				});
			}

			await queryRunner.manager.save(workspaceBalance);

			// 3. 创建余额转账记录
			await this.balanceTransferRecordRepository.createTransfer(
				{
					fromUserId: userId,
					toWorkspaceId: workspaceId,
					amount,
				},
				queryRunner.manager,
			);

			// 4. 提交事务
			await queryRunner.commitTransaction();
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}
}
