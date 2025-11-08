import {
	PlatformServiceRepository,
	WorkspacePluginCredentialsRepository,
	AuthenticatedRequest,
} from '@n8n/db';
import { Body, Delete, Get, Param, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PluginValidatorService } from '@/services/plugin-validator.service';

/**
 * Query DTOs for PluginsController
 */
class WorkspaceQueryDto {
	workspaceId?: string;
}

/**
 * PluginsController
 *
 * 用户端插件管理控制器
 *
 * 功能：
 * 1. 查看可用插件列表（全局插件 + 工作空间自定义插件）
 * 2. 上传自定义插件
 * 3. 提交自定义插件到平台审核
 * 4. 管理自定义插件（查看、删除）
 * 5. 配置插件凭证（第三方插件需要用户配置 API Key）
 *
 * 权限要求：
 * - 查看权限：工作空间 viewer 及以上
 * - 上传/删除权限：工作空间 admin
 */
@RestController('/plugins')
export class PluginsController {
	constructor(
		private readonly platformServiceRepository: PlatformServiceRepository,
		private readonly workspacePluginCredentialsRepository: WorkspacePluginCredentialsRepository,
		private readonly pluginValidatorService: PluginValidatorService,
	) {}

	/**
	 * GET /plugins/available
	 * 获取当前工作空间可用的插件列表
	 *
	 * 返回：
	 * - 全局插件（所有人可见）
	 * - 当前工作空间的自定义插件
	 * - 标注每个插件的配置状态（user_managed 插件需要用户配置）
	 *
	 * @param query 查询参数
	 * @returns 可用插件列表
	 */
	@Get('/available')
	async getAvailablePlugins(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 1. 获取全局插件（所有人可见）
		const globalPlugins = await this.platformServiceRepository.find({
			where: { serviceType: 'plugin', visibility: 'global', enabled: true },
		});

		// 2. 获取当前工作空间的自定义插件
		const workspacePlugins = await this.platformServiceRepository.find({
			where: {
				serviceType: 'plugin',
				visibility: 'workspace',
				ownerWorkspaceId: workspaceId,
				enabled: true,
			},
		});

		const allPlugins = [...globalPlugins, ...workspacePlugins];

		// 3. 获取用户已配置的凭证状态
		const configuredStatus = await this.workspacePluginCredentialsRepository.getConfiguredStatus(
			workspaceId,
			allPlugins.map((p) => p.serviceKey),
		);

		// 4. 标注配置状态
		return allPlugins.map((plugin) => ({
			...plugin,
			isConfigured:
				plugin.serviceMode === 'user_managed'
					? (configuredStatus.get(plugin.serviceKey) ?? false)
					: true, // platform_managed 插件总是已配置
		}));
	}

	/**
	 * POST /plugins/custom
	 * 上传自定义插件（仅当前工作空间可见）
	 *
	 * 自定义插件特点：
	 * - visibility: 'workspace'（工作空间可见）
	 * - 需要验证代码安全性
	 * - 可以提交到平台审核
	 * - 审核通过后变成全局第三方插件
	 *
	 * @param query 查询参数
	 * @param data 插件数据
	 * @returns 创建的插件
	 */
	@Post('/custom')
	async uploadCustomPlugin(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
		@Body
		data: {
			serviceKey: string;
			serviceName: string;
			category: string;
			description?: string;
			userConfigSchema?: Record<string, unknown>;
			pluginCode: string; // TypeScript 代码
			pluginVersion: string;
			iconUrl?: string;
		},
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 1. 验证插件代码安全性
		await this.pluginValidatorService.validateFull(data.pluginCode, 100); // 限制 100KB

		// 2. 检查 serviceKey 是否冲突
		const existing = await this.platformServiceRepository.findOne({
			where: [
				{ serviceKey: data.serviceKey, visibility: 'global' },
				{ serviceKey: data.serviceKey, ownerWorkspaceId: workspaceId },
			],
		});

		if (existing) {
			throw new BadRequestError(`插件标识 '${data.serviceKey}' 已存在`);
		}

		// 3. 创建自定义插件
		const plugin = await this.platformServiceRepository.save({
			serviceKey: data.serviceKey,
			name: data.serviceName,
			serviceType: 'plugin',
			serviceMode: data.userConfigSchema ? 'user_managed' : 'platform_managed',
			visibility: 'workspace',
			ownerWorkspaceId: workspaceId,
			userConfigSchema: data.userConfigSchema ?? null,
			pluginCode: data.pluginCode,
			pluginVersion: data.pluginVersion,
			pricingConfig: {}, // 自定义插件不计费，但字段不能为空
			category: data.category,
			description: data.description ?? null,
			iconUrl: data.iconUrl ?? null,
			enabled: true,
			isActive: true,
		});

		return plugin;
	}

	/**
	 * POST /plugins/:key/submit
	 * 提交自定义插件到平台审核
	 *
	 * 提交后：
	 * - submissionStatus 变为 'pending'
	 * - 插件仍然只在当前工作空间可见
	 * - 等待管理员审核
	 * - 审核通过后变为全局插件
	 *
	 * @param query 查询参数
	 * @param serviceKey 插件标识
	 * @returns 成功标志
	 */
	@Post('/:key/submit')
	async submitPluginForReview(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('key') serviceKey: string,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 查找自定义插件
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, ownerWorkspaceId: workspaceId, visibility: 'workspace' },
		});

		if (!plugin) {
			throw new NotFoundError(`自定义插件 '${serviceKey}' 不存在`);
		}

		if (plugin.submissionStatus === 'pending') {
			throw new BadRequestError('该插件已提交审核，请等待审核结果');
		}

		// 提交审核
		plugin.submissionStatus = 'pending';
		plugin.submittedAt = new Date();
		await this.platformServiceRepository.save(plugin);

		// TODO: 通知管理员有新的插件提交
		// await this.notificationService.notifyAdmins({
		//   type: 'plugin_submission',
		//   data: {
		//     pluginName: plugin.name,
		//     workspaceId: workspaceId,
		//     serviceKey: plugin.serviceKey
		//   }
		// });

		return { success: true };
	}

	/**
	 * GET /plugins/custom
	 * 获取当前工作空间的自定义插件列表
	 *
	 * @param query 查询参数
	 * @returns 自定义插件列表
	 */
	@Get('/custom')
	async getCustomPlugins(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		const plugins = await this.platformServiceRepository.find({
			where: { visibility: 'workspace', ownerWorkspaceId: workspaceId },
			order: { createdAt: 'DESC' },
		});

		return plugins;
	}

	/**
	 * DELETE /plugins/custom/:key
	 * 删除自定义插件
	 *
	 * 限制：
	 * - 只能删除自己工作空间的自定义插件
	 * - 已审核通过的插件（变成全局插件）不能删除
	 *
	 * @param query 查询参数
	 * @param serviceKey 插件标识
	 * @returns 成功标志
	 */
	@Delete('/custom/:key')
	async deleteCustomPlugin(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('key') serviceKey: string,
		@Query query: WorkspaceQueryDto,
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 查找自定义插件
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, ownerWorkspaceId: workspaceId, visibility: 'workspace' },
		});

		if (!plugin) {
			throw new NotFoundError(`自定义插件 '${serviceKey}' 不存在`);
		}

		if (plugin.submissionStatus === 'approved') {
			throw new BadRequestError('已审核通过的插件不能删除');
		}

		await this.platformServiceRepository.delete({ serviceKey });

		return { success: true };
	}

	/**
	 * PATCH /plugins/:key/update
	 * 更新自定义插件
	 *
	 * 限制：
	 * - 只能更新自己工作空间的自定义插件
	 * - 已提交审核的插件不能更新（需要先撤回）
	 * - 已审核通过的插件（变成全局插件）不能更新
	 *
	 * @param query 查询参数
	 * @param serviceKey 插件标识
	 * @param data 更新数据
	 * @returns 更新后的插件
	 */
	@Post('/:key/update')
	async updateCustomPlugin(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('key') serviceKey: string,
		@Query query: WorkspaceQueryDto,
		@Body
		data: {
			serviceName?: string;
			category?: string;
			description?: string;
			pluginCode?: string;
			pluginVersion?: string;
			iconUrl?: string;
		},
	) {
		const { workspaceId } = query;
		if (!workspaceId) {
			throw new BadRequestError('缺少 workspaceId 参数');
		}

		// 查找自定义插件
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, ownerWorkspaceId: workspaceId, visibility: 'workspace' },
		});

		if (!plugin) {
			throw new NotFoundError(`自定义插件 '${serviceKey}' 不存在`);
		}

		if (plugin.submissionStatus === 'pending') {
			throw new BadRequestError('已提交审核的插件不能更新，请先撤回审核');
		}

		if (plugin.submissionStatus === 'approved') {
			throw new BadRequestError('已审核通过的插件不能更新');
		}

		// 如果更新了代码，需要重新验证
		if (data.pluginCode) {
			await this.pluginValidatorService.validateFull(data.pluginCode, 100);
			plugin.pluginCode = data.pluginCode;
		}

		// 更新其他字段
		if (data.serviceName) plugin.name = data.serviceName;
		if (data.category) plugin.category = data.category;
		if (data.description !== undefined) plugin.description = data.description ?? null;
		if (data.pluginVersion) plugin.pluginVersion = data.pluginVersion;
		if (data.iconUrl !== undefined) plugin.iconUrl = data.iconUrl ?? null;

		await this.platformServiceRepository.save(plugin);

		return plugin;
	}
}
