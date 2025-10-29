import type { LicenseProvider } from '@n8n/backend-common';
import {
	UNLIMITED_LICENSE_QUOTA,
	isReverseLicenseFeature,
	type BooleanLicenseFeature,
} from '@n8n/constants';
import { Service } from '@n8n/di';

import type { FeatureReturnType } from '@/license';

/**
 * 🔓 自托管企业版 License Provider
 *
 * 这个憨批类提供了完全解除限制的 License 实现
 * 所有企业功能全部启用，配额全部无限制
 *
 * 老王说：这就是满血版本！
 */
@Service()
export class SelfHostedLicenseProvider implements LicenseProvider {
	/**
	 * 功能检查 - 全部返回 true（反向逻辑功能除外）
	 * 艹，所有企业功能都给老子启用！
	 *
	 * 老王说：统一用工具函数判断反向逻辑，符合DRY原则！
	 */
	isLicensed(feature: BooleanLicenseFeature): boolean {
		// 反向逻辑功能返回 false，其他功能返回 true
		return !isReverseLicenseFeature(feature);
	}

	/**
	 * 获取配额值
	 * AI学分给超大值，其他配额返回无限制
	 */
	getValue<T extends keyof FeatureReturnType>(feature: T): FeatureReturnType[T] {
		// AI Credits 特殊处理 - 给个超大值
		if (feature === 'quota:aiCredits') {
			return 999999 as FeatureReturnType[T];
		}

		// planName 返回自托管企业版
		if (feature === 'planName') {
			return 'Self-Hosted Enterprise' as FeatureReturnType[T];
		}

		// 其他所有配额返回无限制 (-1)
		return UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
	}

	/**
	 * 获取当前权限列表 - 返回空数组
	 * 自托管版本不需要权限列表
	 */
	getCurrentEntitlements(): unknown[] {
		return [];
	}

	/**
	 * 获取管理 JWT - 返回空字符串
	 * 自托管版本不需要管理令牌
	 */
	getManagementJwt(): string {
		return '';
	}

	/**
	 * 获取主计划信息 - 返回 undefined
	 * 自托管版本没有主计划概念
	 */
	getMainPlan(): undefined {
		return undefined;
	}

	/**
	 * 获取消费者ID - 返回自托管标识
	 */
	getConsumerId(): string {
		return 'self-hosted-enterprise';
	}

	/**
	 * 获取触发器限制 - 返回无限制
	 */
	getTriggerLimit(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	/**
	 * 获取计划名称 - 返回自托管企业版
	 */
	getPlanName(): string {
		return 'Self-Hosted Enterprise';
	}

	/**
	 * 获取 License 信息 - 返回自托管企业版信息
	 */
	getInfo(): string {
		return 'Self-Hosted Enterprise Edition - All features enabled';
	}

	/**
	 * 激活 License - 自托管版本无需激活
	 */
	async activate(_activationKey: string): Promise<void> {
		// 自托管版本无需激活，直接返回
		return;
	}

	/**
	 * 重载 License - 自托管版本无需重载
	 */
	async reload(): Promise<void> {
		// 自托管版本无需重载，直接返回
		return;
	}

	/**
	 * 续订 License - 自托管版本无需续订
	 */
	async renew(): Promise<void> {
		// 自托管版本无需续订，直接返回
		return;
	}

	/**
	 * 清除 License - 自托管版本无需清除
	 */
	async clear(): Promise<void> {
		// 自托管版本无需清除，直接返回
		return;
	}

	/**
	 * 关闭 License - 自托管版本无需关闭
	 */
	async shutdown(): Promise<void> {
		// 自托管版本无需关闭，直接返回
		return;
	}

	/**
	 * 启用自动续订 - 自托管版本无需续订
	 */
	enableAutoRenewals(): void {
		// 自托管版本无需续订，直接返回
	}

	/**
	 * 禁用自动续订 - 自托管版本无需续订
	 */
	disableAutoRenewals(): void {
		// 自托管版本无需续订，直接返回
	}
}
