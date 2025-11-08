import { Service } from '@n8n/di';
import type { PlatformService } from '@n8n/db';
import { PlatformServiceRepository } from '@n8n/db';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * 平台服务未找到错误
 */
export class ServiceNotFoundError extends NotFoundError {
	constructor(serviceKey: string) {
		super(`Platform service not found: ${serviceKey}`);
	}
}

/**
 * 无效的定价配置错误
 */
export class InvalidPricingConfigError extends Error {
	constructor(serviceKey: string) {
		super(`Invalid pricing config for service: ${serviceKey}`);
	}
}

/**
 * 平台 AI 服务管理服务
 *
 * 负责管理平台 AI 服务（GPT-4、Claude 等）的配置、定价和费用计算
 */
@Service()
export class PlatformServiceService {
	constructor(private readonly platformServiceRepository: PlatformServiceRepository) {}

	/**
	 * 通过服务键获取平台服务
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @returns 平台服务实体
	 * @throws {ServiceNotFoundError} 当服务不存在时
	 */
	async getServiceByKey(serviceKey: string): Promise<PlatformService> {
		const service = await this.platformServiceRepository.findOneBy({ serviceKey });

		if (!service) {
			throw new ServiceNotFoundError(serviceKey);
		}

		return service;
	}

	/**
	 * 获取所有活跃的平台服务
	 *
	 * @returns 活跃的平台服务列表
	 */
	async getActiveServices(): Promise<PlatformService[]> {
		return await this.platformServiceRepository.findBy({ isActive: true });
	}

	/**
	 * 按服务类型获取平台服务
	 *
	 * @param serviceType - 服务类型（如 'llm', 'embedding'）
	 * @returns 指定类型的平台服务列表
	 */
	async getServicesByType(serviceType: string): Promise<PlatformService[]> {
		return await this.platformServiceRepository.findBy({ serviceType });
	}

	/**
	 * 更新服务定价配置
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @param pricingConfig - 定价配置对象
	 * @throws {ServiceNotFoundError} 当服务不存在时
	 */
	async updatePricing(serviceKey: string, pricingConfig: Record<string, unknown>): Promise<void> {
		const service = await this.getServiceByKey(serviceKey);

		service.pricingConfig = pricingConfig;

		await this.platformServiceRepository.save(service);
	}

	/**
	 * 计算服务使用费用
	 *
	 * 根据 token 使用量和服务定价配置计算费用（人民币）
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @param tokensUsed - 使用的 token 数量
	 * @returns 费用金额（人民币）
	 * @throws {ServiceNotFoundError} 当服务不存在时
	 * @throws {InvalidPricingConfigError} 当定价配置无效时
	 */
	async calculateCost(serviceKey: string, tokensUsed: number): Promise<number> {
		const service = await this.getServiceByKey(serviceKey);

		const { pricingConfig } = service;

		if (
			!pricingConfig ||
			typeof pricingConfig !== 'object' ||
			!('pricePerThousandTokens' in pricingConfig)
		) {
			throw new InvalidPricingConfigError(serviceKey);
		}

		const pricePerThousandTokens = Number(pricingConfig.pricePerThousandTokens);

		if (Number.isNaN(pricePerThousandTokens) || pricePerThousandTokens < 0) {
			throw new InvalidPricingConfigError(serviceKey);
		}

		// 计算费用: (使用的 token 数 / 1000) * 千 token 单价
		return (tokensUsed / 1000) * pricePerThousandTokens;
	}

	// ===========================
	// 插件管理相关方法
	// Plugin Management Methods
	// ===========================

	/**
	 * 获取工作空间可用的插件列表
	 *
	 * 包括：
	 * 1. 全局可见的插件（platform_managed 和 user_managed）
	 * 2. 当前工作空间的自定义插件
	 *
	 * @param workspaceId - 工作空间 ID
	 * @param enabledOnly - 是否只返回已启用的插件（默认 true）
	 * @returns 可用插件列表
	 */
	async getAvailablePlugins(
		workspaceId: string,
		enabledOnly: boolean = true,
	): Promise<PlatformService[]> {
		const where = enabledOnly ? { enabled: true } : {};

		// 1. 获取全局插件
		const globalPlugins = await this.platformServiceRepository.find({
			where: { serviceType: 'plugin', visibility: 'global', ...where },
		});

		// 2. 获取当前工作空间的自定义插件
		const workspacePlugins = await this.platformServiceRepository.find({
			where: {
				serviceType: 'plugin',
				visibility: 'workspace',
				ownerWorkspaceId: workspaceId,
				...where,
			},
		});

		return [...globalPlugins, ...workspacePlugins];
	}

	/**
	 * 获取工作空间的自定义插件
	 *
	 * @param workspaceId - 工作空间 ID
	 * @returns 自定义插件列表
	 */
	async getCustomPluginsByWorkspace(workspaceId: string): Promise<PlatformService[]> {
		return await this.platformServiceRepository.find({
			where: { visibility: 'workspace', ownerWorkspaceId: workspaceId },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * 获取所有插件（管理员使用）
	 *
	 * @param filters - 过滤条件
	 * @returns 插件列表
	 */
	async getAllPlugins(filters?: {
		visibility?: 'global' | 'workspace';
		serviceMode?: 'platform_managed' | 'user_managed';
		submissionStatus?: 'pending' | 'approved' | 'rejected';
	}): Promise<PlatformService[]> {
		const where: Record<string, unknown> = { serviceType: 'plugin' };

		if (filters?.visibility) where.visibility = filters.visibility;
		if (filters?.serviceMode) where.serviceMode = filters.serviceMode;
		if (filters?.submissionStatus) where.submissionStatus = filters.submissionStatus;

		return await this.platformServiceRepository.find({
			where,
			relations: ['ownerWorkspace'],
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * 获取待审核的插件提交列表
	 *
	 * @param status - 提交状态过滤
	 * @returns 待审核的插件列表
	 */
	async getPluginSubmissions(
		status?: 'pending' | 'approved' | 'rejected',
	): Promise<PlatformService[]> {
		const where: Record<string, unknown> = {
			visibility: 'workspace',
		};

		if (status) {
			where.submissionStatus = status;
		}

		return await this.platformServiceRepository.find({
			where,
			relations: ['ownerWorkspace'],
			order: { submittedAt: 'DESC' },
		});
	}

	/**
	 * 检查插件是否存在
	 *
	 * @param serviceKey - 插件标识
	 * @param visibility - 可见性过滤（可选）
	 * @returns 是否存在
	 */
	async pluginExists(serviceKey: string, visibility?: 'global' | 'workspace'): Promise<boolean> {
		const where: Record<string, unknown> = { serviceKey, serviceType: 'plugin' };

		if (visibility) {
			where.visibility = visibility;
		}

		const count = await this.platformServiceRepository.count({ where });
		return count > 0;
	}

	/**
	 * 启用/禁用插件
	 *
	 * @param serviceKey - 插件标识
	 * @param enabled - 是否启用
	 * @throws {ServiceNotFoundError} 当插件不存在时
	 */
	async togglePlugin(serviceKey: string, enabled: boolean): Promise<void> {
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, serviceType: 'plugin' },
		});

		if (!plugin) {
			throw new ServiceNotFoundError(serviceKey);
		}

		plugin.enabled = enabled;
		await this.platformServiceRepository.save(plugin);
	}
}
