import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * ExtendPlatformServiceForPlugins Migration
 *
 * 此迁移扩展 platform_service 表以支持三层插件管理系统：
 * 1. 🏢 平台插件（Platform-Managed）- 管理员配置，按量计费
 * 2. 🔌 第三方插件（Platform-Approved）- 用户配置 API Key，不计费
 * 3. 🛠️ 自定义插件（User-Uploaded）- 用户上传，工作空间可见，可提交审核
 *
 * 添加的字段：
 * - visibility: 'global' (全局可见) 或 'workspace' (工作空间可见)
 * - owner_workspace_id: 自定义插件的所属工作空间
 * - plugin_code: 自定义插件的 TypeScript 代码
 * - plugin_version: 插件版本号
 * - service_mode: 'platform_managed' (平台管理) 或 'user_managed' (用户管理)
 * - user_config_schema: 用户配置字段的 JSON Schema
 * - submission_status: 'pending' (待审核), 'approved' (已通过), 'rejected' (已拒绝)
 * - submitted_at, reviewed_at, reviewed_by, review_notes: 审核相关字段
 * - category: 插件分类 (messaging, cloud, ai, database, etc.)
 * - icon_url: 插件图标 URL
 * - enabled: 是否启用
 */

const table = {
	platformService: 'platform_service',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		platformService: escape.tableName(table.platformService),
		project: escape.tableName('project'),
		user: escape.tableName('user'),
	};

	const c = {
		// 新增字段
		visibility: escape.columnName('visibility'),
		ownerWorkspaceId: escape.columnName('owner_workspace_id'),
		pluginCode: escape.columnName('plugin_code'),
		pluginVersion: escape.columnName('plugin_version'),
		serviceMode: escape.columnName('service_mode'),
		userConfigSchema: escape.columnName('user_config_schema'),
		submissionStatus: escape.columnName('submission_status'),
		submittedAt: escape.columnName('submitted_at'),
		reviewedAt: escape.columnName('reviewed_at'),
		reviewedBy: escape.columnName('reviewed_by'),
		reviewNotes: escape.columnName('review_notes'),
		category: escape.columnName('category'),
		iconUrl: escape.columnName('icon_url'),
		enabled: escape.columnName('enabled'),

		// 现有字段
		serviceKey: escape.columnName('service_key'),
		pricingConfig: escape.columnName('pricing_config'),
	};

	return { t, c };
}

export class ExtendPlatformServiceForPlugins1762511302660 implements ReversibleMigration {
	/**
	 * 执行迁移：扩展 platform_service 表
	 */
	async up(context: MigrationContext) {
		const {
			logger,
			schemaBuilder: { addColumns, column },
		} = context;

		logger.info('Starting ExtendPlatformServiceForPlugins migration (up)');

		// 添加插件相关字段
		logger.info('Adding plugin management columns to platform_service table');
		await addColumns(table.platformService, [
			// visibility: 全局可见 或 工作空间可见
			// 默认 'global' 用于现有 AI 模型和 RAG 服务
			column('visibility')
				.varchar(50)
				.notNull.default('global'),

			// owner_workspace_id: 自定义插件的所属工作空间
			// 仅当 visibility = 'workspace' 时有值
			column('owner_workspace_id').uuid,

			// plugin_code: 自定义插件的 TypeScript 代码
			// 仅自定义插件使用
			column('plugin_code').text,

			// plugin_version: 插件版本号
			column('plugin_version').varchar(50),

			// service_mode: 服务模式
			// 'platform_managed': 平台托管（平台提供 API Key 并计费）
			// 'user_managed': 用户托管（用户提供 API Key，不计费）
			column('service_mode').varchar(50),

			// user_config_schema: 用户配置字段的 JSON Schema
			// 用于 user_managed 模式，定义用户需要填写的字段
			column('user_config_schema').json,

			// submission_status: 自定义插件提交审核状态
			// 'pending': 待审核, 'approved': 已通过, 'rejected': 已拒绝
			column('submission_status').varchar(50),

			// submitted_at: 提交审核时间
			column('submitted_at').timestamp(),

			// reviewed_at: 审核完成时间
			column('reviewed_at').timestamp(),

			// reviewed_by: 审核人 ID
			column('reviewed_by').uuid,

			// review_notes: 审核备注
			column('review_notes').text,

			// category: 插件分类
			// 例如: 'messaging', 'cloud', 'ai', 'database', 'analytics', etc.
			column('category').varchar(100),

			// description: 插件描述
			// 插件或服务的详细描述
			column('description').text,

			// icon_url: 插件图标 URL
			column('icon_url').varchar(500),

			// enabled: 是否启用
			// 默认 true，管理员可以禁用某个插件
			column('enabled').bool.notNull.default(true),
		]);

		logger.info('Adding foreign key constraints');

		// 添加外键约束
		await this.addForeignKeys(context);

		logger.info('Creating indexes for plugin management');

		// 创建索引以优化查询性能
		await this.createIndexes(context);

		logger.info('Adding CHECK constraint for visibility logic');

		// 添加约束：全局插件不能有 owner_workspace_id
		await this.addCheckConstraint(context);

		logger.info('ExtendPlatformServiceForPlugins migration (up) completed successfully');
	}

	/**
	 * 添加外键约束
	 */
	private async addForeignKeys({ schemaBuilder: { addForeignKey } }: MigrationContext) {
		// owner_workspace_id 引用 project.id
		await addForeignKey(table.platformService, 'owner_workspace_id', ['project', 'id']);

		// reviewed_by 引用 user.id
		await addForeignKey(table.platformService, 'reviewed_by', ['user', 'id']);
	}

	/**
	 * 创建索引
	 */
	private async createIndexes({ schemaBuilder: { createIndex } }: MigrationContext) {
		// 按 visibility 查询（获取全局插件 或 工作空间插件）
		await createIndex(table.platformService, ['visibility']);

		// 按 owner_workspace_id 查询（获取特定工作空间的自定义插件）
		await createIndex(table.platformService, ['owner_workspace_id']);

		// 按 submission_status 查询（获取待审核的插件）
		await createIndex(table.platformService, ['submission_status']);

		// 按 category 查询（按分类过滤插件）
		await createIndex(table.platformService, ['category']);

		// 按 enabled 查询（只查询启用的插件）
		await createIndex(table.platformService, ['enabled']);
	}

	/**
	 * 添加 CHECK 约束
	 * 全局插件不能有 owner_workspace_id，工作空间插件必须有 owner_workspace_id
	 */
	private async addCheckConstraint({ escape, runQuery, isMysql, isPostgres }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		// SQLite 不支持 CHECK 约束（或支持有限）
		// MySQL 8.0.16+ 支持 CHECK 约束
		// PostgreSQL 完全支持 CHECK 约束

		if (isPostgres || isMysql) {
			await runQuery(`
				ALTER TABLE ${t.platformService}
				ADD CONSTRAINT chk_platform_service_visibility CHECK (
					(${c.visibility} = 'global' AND ${c.ownerWorkspaceId} IS NULL) OR
					(${c.visibility} = 'workspace' AND ${c.ownerWorkspaceId} IS NOT NULL)
				)
			`);
		}
		// SQLite: 暂时不添加约束，在应用层验证
	}

	/**
	 * 回滚迁移：删除扩展的字段和约束
	 */
	async down(context: MigrationContext) {
		const {
			logger,
			schemaBuilder: { dropColumns },
			isMysql,
			isPostgres,
			escape,
			runQuery,
		} = context;

		logger.info('Starting ExtendPlatformServiceForPlugins migration rollback (down)');

		// 删除 CHECK 约束
		if (isPostgres || isMysql) {
			logger.info('Dropping CHECK constraint');
			const { t } = escapeNames(escape);
			await runQuery(`
				ALTER TABLE ${t.platformService}
				DROP CONSTRAINT IF EXISTS chk_platform_service_visibility
			`);
		}

		// 删除索引（通过 schemaBuilder 自动处理）

		// 删除外键约束（通过 dropColumns 自动处理）

		// 删除列
		logger.info('Dropping plugin management columns');
		await dropColumns(table.platformService, [
			'visibility',
			'owner_workspace_id',
			'plugin_code',
			'plugin_version',
			'service_mode',
			'user_config_schema',
			'submission_status',
			'submitted_at',
			'reviewed_at',
			'reviewed_by',
			'review_notes',
			'category',
			'description',
			'icon_url',
			'enabled',
		]);

		logger.info('ExtendPlatformServiceForPlugins migration rollback (down) completed');
	}
}
