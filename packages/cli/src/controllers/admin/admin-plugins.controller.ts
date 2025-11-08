import { PlatformServiceRepository, AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * Query DTOs for AdminPluginsController
 */
class ListPluginsQueryDto {
	visibility?: 'global' | 'workspace';
	serviceMode?: 'platform_managed' | 'user_managed';
	submissionStatus?: 'pending' | 'approved' | 'rejected';
}

class PluginSubmissionsQueryDto {
	status?: 'pending' | 'approved' | 'rejected';
}

/**
 * AdminPluginsController
 *
 * 管理员插件管理控制器
 *
 * 功能：
 * 1. 管理平台插件（platform_managed）- 平台提供 API Key 并计费
 * 2. 管理第三方插件（user_managed）- 用户自己配置 API Key，不计费
 * 3. 审核用户提交的自定义插件
 * 4. 启用/禁用插件
 * 5. 查看所有插件列表
 *
 * 权限要求：
 * - 所有接口都需要 global:admin 权限
 */
@RestController('/admin/plugins')
export class AdminPluginsController {
	constructor(private readonly platformServiceRepository: PlatformServiceRepository) {}

	/**
	 * GET /admin/plugins
	 * 获取所有插件列表（包括待审核的用户提交）
	 *
	 * @param query 查询参数
	 * @returns 插件列表
	 */
	@Get('/')
	async listAllPlugins(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPluginsQueryDto,
	) {
		const where: Record<string, unknown> = { serviceType: 'plugin' };

		if (query.visibility) where.visibility = query.visibility;
		if (query.serviceMode) where.serviceMode = query.serviceMode;
		if (query.submissionStatus) where.submissionStatus = query.submissionStatus;

		const plugins = await this.platformServiceRepository.find({
			where,
			relations: ['ownerWorkspace'],
			order: { createdAt: 'DESC' },
		});

		return plugins;
	}

	/**
	 * POST /admin/plugins/platform
	 * 创建平台插件（平台提供服务 + 计费）
	 *
	 * 平台插件特点：
	 * - visibility: 'global'（全局可见）
	 * - serviceMode: 'platform_managed'（平台托管）
	 * - 管理员在后台配置 API Key
	 * - 按量计费
	 *
	 * @param data 插件数据
	 * @returns 创建的插件
	 */
	@Post('/platform')
	async createPlatformPlugin(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body
		data: {
			serviceKey: string;
			serviceName: string;
			category: string;
			description?: string;
			pricingModel: 'per_call' | 'per_message' | 'per_character' | 'per_token';
			unitPriceCny: number;
			iconUrl?: string;
		},
	) {
		// 检查 serviceKey 是否已存在
		const existing = await this.platformServiceRepository.findOne({
			where: { serviceKey: data.serviceKey },
		});

		if (existing) {
			throw new BadRequestError(`插件标识 '${data.serviceKey}' 已存在`);
		}

		// 创建平台插件
		const plugin = await this.platformServiceRepository.save({
			serviceKey: data.serviceKey,
			name: data.serviceName,
			serviceType: 'plugin',
			serviceMode: 'platform_managed',
			visibility: 'global',
			pricingConfig: {
				pricingModel: data.pricingModel,
				unitPriceCny: data.unitPriceCny,
				currency: 'CNY',
			},
			category: data.category,
			description: data.description ?? null,
			iconUrl: data.iconUrl ?? null,
			enabled: true,
			isActive: true,
		});

		return plugin;
	}

	/**
	 * POST /admin/plugins/third-party
	 * 添加第三方插件（用户需要自己配置 API Key）
	 *
	 * 第三方插件特点：
	 * - visibility: 'global'（全局可见）
	 * - serviceMode: 'user_managed'（用户托管）
	 * - 用户需要自己配置 API Key
	 * - 不计费
	 *
	 * @param data 插件数据
	 * @returns 创建的插件
	 */
	@Post('/third-party')
	async addThirdPartyPlugin(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body
		data: {
			serviceKey: string;
			serviceName: string;
			category: string;
			description?: string;
			userConfigSchema: Record<string, unknown>; // JSON Schema 定义用户需要填什么字段
			iconUrl?: string;
		},
	) {
		// 检查 serviceKey 是否已存在
		const existing = await this.platformServiceRepository.findOne({
			where: { serviceKey: data.serviceKey },
		});

		if (existing) {
			throw new BadRequestError(`插件标识 '${data.serviceKey}' 已存在`);
		}

		// 创建第三方插件
		const plugin = await this.platformServiceRepository.save({
			serviceKey: data.serviceKey,
			name: data.serviceName,
			serviceType: 'plugin',
			serviceMode: 'user_managed',
			visibility: 'global',
			userConfigSchema: data.userConfigSchema,
			pricingConfig: {}, // 第三方插件不计费，但字段不能为空
			category: data.category,
			description: data.description ?? null,
			iconUrl: data.iconUrl ?? null,
			enabled: true,
			isActive: true,
		});

		return plugin;
	}

	/**
	 * GET /admin/plugins/submissions
	 * 获取用户提交的插件审核列表
	 *
	 * @param query 查询参数
	 * @returns 提交的插件列表
	 */
	@Get('/submissions')
	async getPluginSubmissions(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: PluginSubmissionsQueryDto,
	) {
		const where: Record<string, unknown> = {
			visibility: 'workspace',
		};

		if (query.status) {
			where.submissionStatus = query.status;
		} else {
			// 默认查询所有提交状态
			where.submissionStatus = In(['pending', 'approved', 'rejected']);
		}

		const submissions = await this.platformServiceRepository.find({
			where,
			relations: ['ownerWorkspace'],
			order: { submittedAt: 'DESC' },
		});

		return submissions;
	}

	/**
	 * POST /admin/plugins/submissions/:key/review
	 * 审核用户提交的插件
	 *
	 * 审核通过后：
	 * - visibility 从 'workspace' 变为 'global'
	 * - submissionStatus 变为 'approved'
	 * - ownerWorkspaceId 设为 null
	 * - 插件变为全局可见的第三方插件
	 *
	 * 审核拒绝后：
	 * - submissionStatus 变为 'rejected'
	 * - 插件仍然只在原工作空间可见
	 *
	 * @param serviceKey 插件标识
	 * @param data 审核数据
	 * @returns 审核后的插件
	 */
	@Post('/submissions/:key/review')
	async reviewPluginSubmission(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('key') serviceKey: string,
		@Body data: { action: 'approve' | 'reject'; notes?: string },
	) {
		// 查找待审核的插件
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, submissionStatus: 'pending' },
		});

		if (!plugin) {
			throw new NotFoundError(`待审核插件 '${serviceKey}' 不存在`);
		}

		if (data.action === 'approve') {
			// 审核通过：变成全局第三方插件
			plugin.visibility = 'global';
			plugin.submissionStatus = 'approved';
			plugin.ownerWorkspaceId = null;
			plugin.serviceMode = plugin.userConfigSchema ? 'user_managed' : 'platform_managed';
		} else if (data.action === 'reject') {
			// 审核拒绝
			plugin.submissionStatus = 'rejected';
		} else {
			throw new BadRequestError(`无效的审核操作: ${data.action}`);
		}

		plugin.reviewedAt = new Date();
		plugin.reviewedBy = req.user.id;
		plugin.reviewNotes = data.notes ?? null;

		await this.platformServiceRepository.save(plugin);

		// TODO: 通知提交者审核结果
		// await this.notificationService.notify({
		//   workspaceId: plugin.ownerWorkspaceId,
		//   type: 'plugin_review_result',
		//   data: { pluginName: plugin.name, action: data.action, notes: data.notes }
		// });

		return plugin;
	}

	/**
	 * PATCH /admin/plugins/:key/toggle
	 * 启用/禁用插件
	 *
	 * @param serviceKey 插件标识
	 * @param data 数据
	 * @returns 更新后的插件
	 */
	@Patch('/:key/toggle')
	async togglePlugin(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('key') serviceKey: string,
		@Body data: { enabled: boolean },
	) {
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, serviceType: 'plugin' },
		});

		if (!plugin) {
			throw new NotFoundError(`插件 '${serviceKey}' 不存在`);
		}

		plugin.enabled = data.enabled;
		await this.platformServiceRepository.save(plugin);

		return plugin;
	}

	/**
	 * DELETE /admin/plugins/:key
	 * 删除插件
	 *
	 * 注意：
	 * - 只能删除平台插件和第三方插件
	 * - 自定义插件应该由用户自己删除
	 * - 已审核通过的自定义插件（变成第三方插件）可以删除
	 *
	 * @param serviceKey 插件标识
	 * @returns 成功标志
	 */
	@Delete('/:key')
	async deletePlugin(_req: AuthenticatedRequest, _res: unknown, @Param('key') serviceKey: string) {
		const plugin = await this.platformServiceRepository.findOne({
			where: { serviceKey, serviceType: 'plugin' },
		});

		if (!plugin) {
			throw new NotFoundError(`插件 '${serviceKey}' 不存在`);
		}

		// 如果是自定义插件（workspace 可见），不允许管理员删除
		if (plugin.visibility === 'workspace') {
			throw new ForbiddenError('不能删除用户的自定义插件，请让用户自己删除');
		}

		await this.platformServiceRepository.delete({ serviceKey });

		return { success: true };
	}
}
