import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * CreateWorkspacePluginCredentialsTable Migration
 *
 * 此迁移创建 workspace_plugin_credentials 表，用于存储工作空间为第三方插件配置的凭证信息。
 *
 * 使用场景：
 * - 第三方插件（user_managed 模式）需要用户自己提供 API Key
 * - 例如：GitHub 插件需要 personal access token，Notion 插件需要 integration token
 * - 每个工作空间可以为同一个插件配置不同的凭证
 *
 * 表结构：
 * - id: 主键
 * - workspace_id: 工作空间 ID
 * - service_key: 插件标识 (引用 platform_service.service_key)
 * - encrypted_config: 加密后的配置数据 (JSON)
 * - created_at, updated_at: 时间戳
 *
 * 约束：
 * - 每个工作空间对每个插件只能有一份配置 (unique constraint)
 */

const table = {
	workspacePluginCredentials: 'workspace_plugin_credentials',
} as const;

export class CreateWorkspacePluginCredentialsTable1762511302880 implements ReversibleMigration {
	/**
	 * 执行迁移：创建 workspace_plugin_credentials 表
	 */
	async up(context: MigrationContext) {
		const {
			logger,
			schemaBuilder: { createTable, column },
		} = context;

		logger.info('Starting CreateWorkspacePluginCredentialsTable migration (up)');

		logger.info('Creating workspace_plugin_credentials table');
		await // 添加时间戳
		createTable(table.workspacePluginCredentials)
			.withColumns(
				// 主键
				column('id').uuid.primary.default('uuid_generate_v4()'),

				// workspace_id: 工作空间 ID (引用 project.id)
				column('workspace_id').uuid.notNull,

				// service_key: 插件标识 (引用 platform_service.service_key)
				column('service_key').varchar(100).notNull,

				// encrypted_config: 加密后的配置数据
				// 存储用户为该插件配置的 API Key、Token 等敏感信息
				// 格式: { apiKey: '...', appId: '...', ... }
				column('encrypted_config').text.notNull,
			)
			// 添加唯一约束：每个工作空间对每个插件只能有一份配置
			.withUniqueConstraintOn(['workspace_id', 'service_key'])
			// 添加索引
			.withIndexOn('workspace_id') // 查询工作空间的所有插件配置
			.withIndexOn('service_key').withTimestamps; // 查询某个插件的所有工作空间配置

		logger.info('Adding foreign key constraints');

		// workspace_id 引用 project.id
		await this.addForeignKeys(context);

		logger.info('CreateWorkspacePluginCredentialsTable migration (up) completed successfully');
	}

	/**
	 * 添加外键约束
	 */
	private async addForeignKeys({ schemaBuilder: { addForeignKey } }: MigrationContext) {
		// workspace_id 引用 project.id
		await addForeignKey(table.workspacePluginCredentials, 'workspace_id', ['project', 'id']);

		// service_key 引用 platform_service.service_key
		await addForeignKey(table.workspacePluginCredentials, 'service_key', [
			'platform_service',
			'service_key',
		]);
	}

	/**
	 * 回滚迁移：删除 workspace_plugin_credentials 表
	 */
	async down({ logger, schemaBuilder: { dropTable } }: MigrationContext) {
		logger.info('Starting CreateWorkspacePluginCredentialsTable migration rollback (down)');

		logger.info('Dropping workspace_plugin_credentials table');
		await dropTable(table.workspacePluginCredentials);

		logger.info('CreateWorkspacePluginCredentialsTable migration rollback (down) completed');
	}
}
