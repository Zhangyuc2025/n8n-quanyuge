import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { BillingService } from '@/services/billing.service';

/**
 * Query DTOs for BillingController
 */

/**
 * 工作空间查询参数
 * Workspace query parameter for billing operations
 */
class WorkspaceQueryDto {
	workspaceId?: string;
}

/**
 * 使用记录查询参数
 * Query parameters for usage records with pagination
 */
class UsageQueryDto extends WorkspaceQueryDto {
	/** 起始日期 ISO 8601 格式 (YYYY-MM-DD) */
	startDate?: string;
	/** 结束日期 ISO 8601 格式 (YYYY-MM-DD) */
	endDate?: string;
	/** 分页：跳过的记录数 */
	skip?: number;
	/** 分页：返回的记录数 */
	limit?: number;
}

/**
 * 月度账单汇总查询参数
 * Query parameters for monthly billing summary
 */
class UsageSummaryQueryDto extends WorkspaceQueryDto {
	/** 年份 */
	year?: number;
	/** 月份 (1-12) */
	month?: number;
}

/**
 * Request Body DTOs for BillingController
 */

/**
 * 充值请求参数
 * Request body for initiating a recharge
 */
class RechargeRequestDto {
	/** 充值金额（人民币，单位：元） */
	amount: number;
	/** 支付方式 ('alipay' | 'wechat' | 'bank_transfer') */
	paymentMethod: string;
}

/**
 * 支付回调参数
 * Request body for payment callback (from Alipay/WeChat)
 */
class PaymentCallbackDto {
	/** 订单ID */
	orderId: string;
	/** 支付状态 */
	status: 'success' | 'failed';
	/** 第三方交易ID */
	transactionId?: string;
	/** 签名（用于验证） */
	signature: string;
	/** 其他支付平台返回的参数 */
	[key: string]: unknown;
}

/**
 * BillingController
 *
 * 计费控制器 - 用户端计费管理
 *
 * 功能：
 * 1. 查询工作空间余额
 * 2. 发起充值订单
 * 3. 查看消费记录（支持分页）
 * 4. 查看月度账单汇总
 * 5. 处理支付回调
 *
 * 权限要求：
 * - 查看权限：工作空间 viewer 及以上
 * - 充值权限：工作空间 admin
 */
@RestController('/billing')
export class BillingController {
	constructor(private readonly billingService: BillingService) {}

	/**
	 * GET /billing/balance
	 * 获取当前工作空间余额
	 *
	 * 返回工作空间当前可用余额（人民币）
	 *
	 * @param query 查询参数
	 * @returns 余额对象 { balance: number }
	 */
	@Get('/balance')
	async getBalance(_req: AuthenticatedRequest, _res: Response, @Query query: WorkspaceQueryDto) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		const balance = await this.billingService.getBalance(workspaceId);

		return {
			workspaceId,
			balance,
			currency: 'CNY',
		};
	}

	/**
	 * POST /billing/recharge
	 * 发起充值订单
	 *
	 * 创建充值订单并返回支付信息。
	 * 实际支付由第三方平台（支付宝/微信）处理，
	 * 支付完成后会通过回调通知本系统。
	 *
	 * @param req 请求对象
	 * @param query 查询参数
	 * @param data 充值数据
	 * @returns 充值订单信息
	 */
	@Post('/recharge')
	async recharge(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
		@Body data: RechargeRequestDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 验证充值金额
		if (!data.amount || data.amount <= 0) {
			throw new BadRequestError('充值金额必须大于 0');
		}

		// 验证支付方式
		const validPaymentMethods = ['alipay', 'wechat', 'bank_transfer'];
		if (!validPaymentMethods.includes(data.paymentMethod)) {
			throw new BadRequestError(
				`不支持的支付方式: ${data.paymentMethod}。有效的支付方式: ${validPaymentMethods.join(', ')}`,
			);
		}

		// TODO: 实际生产环境中，这里应该调用支付平台 API 创建订单
		// 1. 调用支付宝/微信 API 创建预支付订单
		// 2. 获取支付参数（如支付二维码、支付链接等）
		// 3. 创建本地充值记录（状态为 pending）
		// 4. 返回支付信息给前端

		// 当前实现：直接完成充值（仅用于开发测试）
		await this.billingService.recharge(
			workspaceId,
			data.amount,
			data.paymentMethod,
			`DEV_${Date.now()}`, // 模拟交易ID
		);

		return {
			success: true,
			message: '充值成功',
			workspaceId,
			amount: data.amount,
			paymentMethod: data.paymentMethod,
			// TODO: 实际应返回支付信息
			// paymentInfo: {
			//   qrCode: '支付二维码 URL',
			//   paymentUrl: '支付链接',
			//   orderId: '订单ID',
			//   expireAt: '过期时间'
			// }
		};
	}

	/**
	 * GET /billing/usage
	 * 获取消费记录（支持分页和日期过滤）
	 *
	 * 返回工作空间的使用记录，支持按日期范围过滤和分页。
	 *
	 * @param query 查询参数
	 * @returns 消费记录列表和分页信息
	 */
	@Get('/usage')
	async getUsage(_req: AuthenticatedRequest, _res: Response, @Query query: UsageQueryDto) {
		const { workspaceId, startDate, endDate, skip = 0, limit = 50 } = query;

		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 验证分页参数
		const skipNum = Number(skip);
		const limitNum = Number(limit);

		if (isNaN(skipNum) || skipNum < 0) {
			throw new BadRequestError('skip 参数必须是非负整数');
		}

		if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
			throw new BadRequestError('limit 参数必须是 1-100 之间的整数');
		}

		// 解析日期参数
		let startDateObj: Date | undefined;
		let endDateObj: Date | undefined;

		if (startDate) {
			startDateObj = new Date(startDate);
			if (isNaN(startDateObj.getTime())) {
				throw new BadRequestError('startDate 格式无效，请使用 ISO 8601 格式 (YYYY-MM-DD)');
			}
		}

		if (endDate) {
			endDateObj = new Date(endDate);
			if (isNaN(endDateObj.getTime())) {
				throw new BadRequestError('endDate 格式无效，请使用 ISO 8601 格式 (YYYY-MM-DD)');
			}
			// 设置为当天的 23:59:59
			endDateObj.setHours(23, 59, 59, 999);
		}

		// 获取所有符合条件的记录
		const allRecords = await this.billingService.getUsageHistory(
			workspaceId,
			startDateObj,
			endDateObj,
		);

		// 手动实现分页
		const total = allRecords.length;
		const records = allRecords.slice(skipNum, skipNum + limitNum);

		return {
			workspaceId,
			records,
			pagination: {
				total,
				skip: skipNum,
				limit: limitNum,
				hasMore: skipNum + limitNum < total,
			},
		};
	}

	/**
	 * GET /billing/usage/summary
	 * 获取月度账单汇总
	 *
	 * 返回指定月份的总消费金额、总 token 使用量和记录数。
	 * 如果未指定年月，则返回当前月份的汇总。
	 *
	 * @param query 查询参数
	 * @returns 月度账单汇总
	 */
	@Get('/usage/summary')
	async getUsageSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: UsageSummaryQueryDto,
	) {
		const { workspaceId, year, month } = query;

		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 默认使用当前年月
		const now = new Date();
		const targetYear = year ?? now.getFullYear();
		const targetMonth = month ?? now.getMonth() + 1;

		// 验证月份范围
		if (targetMonth < 1 || targetMonth > 12) {
			throw new BadRequestError('month 参数必须是 1-12 之间的整数');
		}

		// 计算月份的起始和结束日期
		const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
		const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

		// 获取统计数据
		const stats = await this.billingService.getUsageStats(workspaceId, startDate, endDate);

		return {
			workspaceId,
			year: targetYear,
			month: targetMonth,
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
			summary: {
				totalAmount: stats.totalAmount,
				totalTokens: stats.totalTokens,
				recordCount: stats.recordCount,
				currency: 'CNY',
			},
		};
	}

	/**
	 * POST /billing/recharge/callback
	 * 支付回调（支付宝/微信）
	 *
	 * 接收第三方支付平台的异步通知，更新充值状态。
	 * 此接口需要验证签名以确保请求来自可信的支付平台。
	 *
	 * 注意：
	 * 1. 此接口通常由支付平台直接调用，不经过前端
	 * 2. 需要在支付平台配置回调 URL
	 * 3. 必须返回特定格式的响应（如支付宝要求返回 "success"）
	 *
	 * @param data 支付回调数据
	 * @returns 响应对象
	 */
	@Post('/recharge/callback')
	async paymentCallback(_req: AuthenticatedRequest, res: Response, @Body data: PaymentCallbackDto) {
		try {
			// TODO: 实现签名验证
			// 1. 验证签名是否有效（防止伪造请求）
			// 2. 验证订单是否存在
			// 3. 验证订单状态是否为 pending
			// 4. 防止重复处理

			// 示例签名验证逻辑（需要根据实际支付平台文档实现）
			// const isValid = this.verifySignature(data);
			// if (!isValid) {
			//   throw new BadRequestError('签名验证失败');
			// }

			const { orderId } = data;

			if (!orderId) {
				throw new BadRequestError('缺少 orderId 参数');
			}

			// TODO: 根据 orderId 查找充值记录
			// const rechargeRecord = await this.rechargeRecordRepository.findOne({ where: { id: orderId } });
			// if (!rechargeRecord) {
			//   throw new NotFoundError(`充值订单 ${orderId} 不存在`);
			// }

			// TODO: 更新充值状态
			// if (status === 'success') {
			//   await this.billingService.recharge(
			//     rechargeRecord.workspaceId,
			//     rechargeRecord.amountCny,
			//     rechargeRecord.paymentMethod,
			//     transactionId
			//   );
			// } else {
			//   await this.rechargeRecordRepository.updateStatus(orderId, 'failed', transactionId);
			// }

			// 支付宝/微信要求返回特定格式
			// 支付宝：返回 "success" 字符串
			// 微信：返回 XML 格式
			return res.status(200).send('success');
		} catch (error) {
			// 记录错误日志
			console.error('Payment callback error:', error);

			// 返回失败响应（支付平台会重试）
			return res.status(500).send('fail');
		}
	}

	/**
	 * Helper method: 验证支付签名（私有方法，暂未实现）
	 *
	 * 根据不同的支付平台，验证逻辑会有所不同：
	 * - 支付宝：使用 RSA 公钥验证签名
	 * - 微信：使用 MD5 或 HMAC-SHA256 验证签名
	 *
	 * @param data 支付回调数据
	 * @returns 是否验证通过
	 */
	// private verifySignature(data: PaymentCallbackDto): boolean {
	//   // TODO: 实现签名验证逻辑
	//   return true;
	// }
}
