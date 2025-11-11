import { Logger } from '@n8n/backend-common';
import { PlatformNodeRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ITaskData } from 'n8n-workflow';

import { BillingService, type DeductBalanceMetadata } from './billing.service';

interface ChargeForNodeParams {
	nodeType: string;
	nodeName: string;
	executionTime: number; // 毫秒
	taskData: ITaskData;
	workspaceId: string;
	userId: string;
	executionId: string;
}

@Service()
export class NodeBillingService {
	constructor(
		private readonly platformNodeRepository: PlatformNodeRepository,
		private readonly billingService: BillingService,
		private readonly logger: Logger,
	) {}

	/**
	 * 对节点执行进行计费
	 */
	async chargeForNode(params: ChargeForNodeParams): Promise<void> {
		const { nodeType, executionTime, taskData, workspaceId, userId } = params;

		try {
			// 1. 检查是否是平台节点
			if (!nodeType.startsWith('platform:')) {
				// 内置节点不计费
				return;
			}

			// 2. 获取节点定义（包含计费配置）
			const nodeKey = nodeType.replace('platform:', '');
			const platformNode = await this.platformNodeRepository.findOne({
				where: { nodeKey },
			});

			if (!platformNode) {
				this.logger.warn(`Platform node not found: ${nodeKey}`);
				return;
			}

			// 3. 检查计费模式
			const billingMode = platformNode.billingMode || 'free';
			if (billingMode === 'free') {
				// 免费节点
				return;
			}

			// 4. 根据计费模式计算费用
			let amount = 0;
			const metadata: Record<string, any> = {
				nodeType,
				nodeName: params.nodeName,
				billingMode,
				executionId: params.executionId,
			};

			const billingConfig = platformNode.billingConfig as any;
			if (!billingConfig) {
				this.logger.warn(`Billing config not found for node: ${nodeKey}`);
				return;
			}

			switch (billingMode) {
				case 'token-based': {
					// Token计费：从节点输出数据中提取 tokensUsed
					const tokensUsed = this.extractTokensUsed(taskData);
					if (tokensUsed > 0) {
						const pricePerToken = billingConfig.pricePerToken || 0;
						amount = (tokensUsed * pricePerToken) / 1000;
						metadata.tokensUsed = tokensUsed;
						metadata.pricePerToken = pricePerToken;
					}
					break;
				}

				case 'per-execution': {
					// 按次计费：固定价格
					amount = billingConfig.pricePerExecution || 0;
					break;
				}

				case 'duration-based': {
					// 时长计费：执行时间（秒）× 单价
					const durationSeconds = executionTime / 1000;
					const pricePerSecond = billingConfig.pricePerSecond || 0;
					amount = durationSeconds * pricePerSecond;
					metadata.durationSeconds = durationSeconds;
					metadata.pricePerSecond = pricePerSecond;
					break;
				}

				default:
					this.logger.warn(`Unknown billing mode: ${billingMode}`);
					return;
			}

			// 5. 扣费
			if (amount > 0) {
				await this.billingService.deductBalance(workspaceId, amount, {
					serviceKey: `node:${nodeKey}`,
					userId,
					metadata,
				});

				this.logger.info(`Node billing charged: ${nodeKey}, amount: ${amount} CNY`);
			}
		} catch (error) {
			// 计费失败不影响工作流执行，只记录日志
			this.logger.error(`Failed to charge for node execution: ${error}`, {
				nodeType: params.nodeType,
				nodeName: params.nodeName,
				executionId: params.executionId,
			});
		}
	}

	/**
	 * 从节点输出数据中提取 Token 使用量
	 * 节点需要在输出数据中包含 { json: { tokensUsed: 1500 } }
	 */
	private extractTokensUsed(taskData: ITaskData): number {
		try {
			// 检查第一个输出项的 json.tokensUsed
			const firstOutput = taskData.data?.main?.[0]?.[0];
			if (firstOutput?.json?.tokensUsed) {
				return Number(firstOutput.json.tokensUsed);
			}

			// 检查是否有 usage 字段（OpenAI格式）
			const usage = firstOutput?.json?.usage;
			if (usage && typeof usage === 'object' && 'total_tokens' in usage) {
				return Number(usage.total_tokens);
			}

			return 0;
		} catch (error) {
			this.logger.warn(`Failed to extract tokens used: ${error}`);
			return 0;
		}
	}
}
