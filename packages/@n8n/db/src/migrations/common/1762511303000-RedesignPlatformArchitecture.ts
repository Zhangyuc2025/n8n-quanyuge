import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * RedesignPlatformArchitecture Migration
 *
 * 此迁移修正之前的架构设计错误，重新设计平台服务架构。
 *
 * 核心概念修正：
 * 1. 大模型不是节点 - 它们是 AI 节点的参数选项
 * 2. 插件 = 节点 - 没有独立的"插件"概念
 * 3. 平台管理提供商，不是模型 - OpenAI 是提供商，GPT-4 是模型
 * 4. 统一的节点市场 - 所有节点（平台、第三方、自定义）在一个地方展示
 * 5. 用户级别的节点配置 - 替代原有的凭证系统
 *
 * 创建的新表：
 * 1. platform_ai_provider - AI 服务提供商（OpenAI, Anthropic 等）
 * 2. platform_node - 平台节点/插件（平台官方和第三方审核通过的节点）
 * 3. custom_node - 用户自定义节点（工作空间上传的节点）
 * 4. user_node_config - 用户节点配置（替代 credentials_entity）
 *
 * 删除的表：
 * - workspace_plugin_credentials（设计错误，功能冗余）
 *
 * 弃用但保留的表（用于数据迁移）：
 * - platform_service（标记为 deprecated，暂不删除）
 */

const table = {
	// 新表
	platformAIProvider: 'platform_ai_provider',
	platformNode: 'platform_node',
	customNode: 'custom_node',
	userNodeConfig: 'user_node_config',
	// 旧表（需删除）
	workspacePluginCredentials: 'workspace_plugin_credentials',
	// 旧表（标记弃用）
	platformService: 'platform_service',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		platformAIProvider: escape.tableName(table.platformAIProvider),
		platformNode: escape.tableName(table.platformNode),
		customNode: escape.tableName(table.customNode),
		userNodeConfig: escape.tableName(table.userNodeConfig),
		workspacePluginCredentials: escape.tableName(table.workspacePluginCredentials),
		platformService: escape.tableName(table.platformService),
		project: escape.tableName('project'),
		user: escape.tableName('user'),
	};

	return { t };
}

export class RedesignPlatformArchitecture1762511303000 implements ReversibleMigration {
	/**
	 * 创建 platform_ai_provider 表
	 * 存储平台托管的 AI 服务提供商（OpenAI, Anthropic, Google）
	 */
	async createPlatformAIProviderTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(table.platformAIProvider).withColumns(
			// 主键 - 提供商标识 (例如: 'openai', 'anthropic', 'google')
			column('provider_key').varchar(100).primary,

			// 提供商名称 (例如: 'OpenAI', 'Anthropic', 'Google')
			column('provider_name').varchar(200).notNull,

			// 平台统一配置的 API Key（加密存储）
			column('api_key_encrypted').text.notNull,

			// API 端点 (例如: 'https://api.openai.com')
			column('api_endpoint').varchar(500).notNull,

			// 支持的模型列表（JSONB）
			// 格式: { models: [{ id, name, description, pricePerToken, contextWindow, ... }] }
			column('models_config').json.notNull,

			// 配额配置（JSONB）
			// 格式: { monthlyTokens: 10000000, currentUsed: 0 }
			column('quota_config').json,

			// 状态标志
			column('is_active').bool.notNull.default(true),
			column('enabled').bool.notNull.default(true),
		).withTimestamps;
	}

	/**
	 * 创建 platform_node 表
	 * 存储平台官方节点和第三方审核通过的节点
	 */
	async createPlatformNodeTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.platformNode).withColumns(
			// 主键 - 节点标识 (例如: 'weather-query', 'ocr-service')
			column('node_key').varchar(100).primary,

			// 节点名称 (例如: '天气查询', 'OCR 识别')
			column('node_name').varchar(200).notNull,

			// 节点类型: 'platform_official' | 'third_party_approved'
			column('node_type').varchar(50).notNull,

			// 节点定义（完整的 INodeTypeDescription）
			column('node_definition').json.notNull,

			// 节点执行代码（TypeScript 代码）
			column('node_code').text,

			// 分类和元信息
			column('category').varchar(100),
			column('description').text,
			column('icon_url').varchar(500),
			column('version').varchar(50).notNull.default("'1.0.0'"),

			// 计费配置（如果是平台托管服务）
			column('is_billable').bool.notNull.default(false),
			column('price_per_request').double, // 每次请求价格（CNY）

			// 审核字段（仅第三方节点）
			column('submission_status').varchar(50), // 'approved' | 'rejected'
			column('submitted_by').uuid,
			column('submitted_at').timestampNoTimezone(),
			column('reviewed_by').uuid,
			column('reviewed_at').timestampNoTimezone(),
			column('review_notes').text,

			// 状态
			column('is_active').bool.notNull.default(true),
			column('enabled').bool.notNull.default(true),
		).withTimestamps;
	}

	/**
	 * 创建 custom_node 表
	 * 存储用户自定义节点（工作空间上传的节点）
	 */
	async createCustomNodeTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.customNode)
			.withColumns(
				// 主键
				column('id').uuid.primary.autoGenerate,

				// 节点标识（工作空间内唯一）
				column('node_key').varchar(100).notNull,

				// 节点名称
				column('node_name').varchar(200).notNull,

				// 所属工作空间
				column('workspace_id').uuid.notNull,

				// 节点定义和代码
				column('node_definition').json.notNull,
				column('node_code').text.notNull,

				// 配置模式: 'personal' | 'shared'
				column('config_mode')
					.varchar(20)
					.notNull.default("'personal'"),

				// 团队共享配置（仅 shared 模式）
				column('shared_config_data').text,
				column('shared_config_by').uuid,

				// 配置字段定义（供用户填写）
				column('config_schema').json,

				// 分类和元信息
				column('category').varchar(100),
				column('description').text,
				column('icon_url').varchar(500),
				column('version').varchar(50).notNull.default("'1.0.0'"),

				// 可见性（始终为 workspace）
				column('visibility')
					.varchar(50)
					.notNull.default("'workspace'"),

				// 提交审核（可选）
				column('submission_status').varchar(50), // 'draft' | 'pending' | 'approved' | 'rejected'
				column('submitted_at').timestampNoTimezone(),
				column('reviewed_by').uuid,
				column('reviewed_at').timestampNoTimezone(),
				column('review_notes').text,

				// 状态
				column('is_active').bool.notNull.default(true),

				// 创建者
				column('created_by').uuid.notNull,
			)
			.withUniqueConstraintOn(['workspace_id', 'node_key']).withTimestamps;
	}

	/**
	 * 创建 user_node_config 表
	 * 存储用户的节点配置（替代 credentials_entity 和 workspace_plugin_credentials）
	 */
	async createUserNodeConfigTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.userNodeConfig)
			.withColumns(
				// 主键
				column('id').uuid.primary.autoGenerate,

				// 用户 ID（哪个用户的配置）
				column('user_id').uuid.notNull,

				// 节点类型（按节点类型存储，实现自动复用）
				// 例如: 'n8n-nodes-base.github', 'custom.company-api'
				column('node_type').varchar(100).notNull,

				// 加密的配置数据（JSON 格式）
				// 例如: {"apiKey": "ghp_xxx", "baseUrl": "..."}
				column('config_data').text.notNull,

				// 配置状态
				column('is_configured').bool.notNull.default(true),

				// 最后使用时间（用于清理过期配置）
				column('last_used_at').timestampNoTimezone(),
			)
			.withUniqueConstraintOn(['user_id', 'node_type']).withTimestamps;
	}

	/**
	 * 添加外键约束
	 */
	async addForeignKeys({ schemaBuilder: { addForeignKey } }: MigrationContext) {
		// platform_node 表的外键
		await addForeignKey(table.platformNode, 'submitted_by', ['user', 'id']);
		await addForeignKey(table.platformNode, 'reviewed_by', ['user', 'id']);

		// custom_node 表的外键
		await addForeignKey(table.customNode, 'workspace_id', ['project', 'id']);
		await addForeignKey(table.customNode, 'created_by', ['user', 'id']);
		await addForeignKey(table.customNode, 'reviewed_by', ['user', 'id']);
		await addForeignKey(table.customNode, 'shared_config_by', ['user', 'id']);

		// user_node_config 表的外键
		await addForeignKey(table.userNodeConfig, 'user_id', ['user', 'id']);
	}

	/**
	 * 创建索引
	 */
	async createIndexes({ schemaBuilder: { createIndex } }: MigrationContext) {
		// platform_node 表索引
		await createIndex(table.platformNode, ['node_type']);
		await createIndex(table.platformNode, ['category']);
		await createIndex(table.platformNode, ['submission_status']);
		await createIndex(table.platformNode, ['is_active']);

		// custom_node 表索引
		await createIndex(table.customNode, ['workspace_id']);
		await createIndex(table.customNode, ['config_mode']);
		await createIndex(table.customNode, ['submission_status']);
		await createIndex(table.customNode, ['is_active']);

		// user_node_config 表索引
		await createIndex(table.userNodeConfig, ['user_id', 'node_type']);
		await createIndex(table.userNodeConfig, ['last_used_at']);
	}

	/**
	 * 初始化平台 AI 提供商数据
	 */
	async insertInitialAIProviders({ escape, runQuery, logger }: MigrationContext) {
		const { t } = escapeNames(escape);

		logger.info('Inserting initial AI providers');

		// OpenAI
		await runQuery(
			`INSERT INTO ${t.platformAIProvider}
			(provider_key, provider_name, api_key_encrypted, api_endpoint, models_config, quota_config, is_active, enabled, createdAt, updatedAt)
			VALUES (
				'openai',
				'OpenAI',
				:apiKeyPlaceholder,
				'https://api.openai.com',
				:modelsConfig,
				:quotaConfig,
				true,
				true,
				CURRENT_TIMESTAMP,
				CURRENT_TIMESTAMP
			)`,
			{
				apiKeyPlaceholder: 'PLATFORM_CONFIG_REQUIRED', // 需要管理员配置
				modelsConfig: JSON.stringify({
					models: [
						{
							id: 'gpt-4-turbo',
							name: 'GPT-4 Turbo',
							description: 'Most capable GPT-4 model',
							pricePerToken: 0.00001,
							currency: 'CNY',
							contextWindow: 128000,
							maxOutputTokens: 4096,
							supportsFunctions: true,
							supportsVision: false,
						},
						{
							id: 'gpt-4o',
							name: 'GPT-4o',
							description: 'Multimodal flagship model',
							pricePerToken: 0.000005,
							currency: 'CNY',
							contextWindow: 128000,
							maxOutputTokens: 16384,
							supportsFunctions: true,
							supportsVision: true,
						},
						{
							id: 'gpt-3.5-turbo',
							name: 'GPT-3.5 Turbo',
							description: 'Fast and efficient',
							pricePerToken: 0.000001,
							currency: 'CNY',
							contextWindow: 16000,
							maxOutputTokens: 4096,
							supportsFunctions: true,
							supportsVision: false,
						},
					],
				}),
				quotaConfig: JSON.stringify({
					monthlyTokens: 10000000,
					currentUsed: 0,
				}),
			},
		);

		// Anthropic
		await runQuery(
			`INSERT INTO ${t.platformAIProvider}
			(provider_key, provider_name, api_key_encrypted, api_endpoint, models_config, quota_config, is_active, enabled, createdAt, updatedAt)
			VALUES (
				'anthropic',
				'Anthropic',
				:apiKeyPlaceholder,
				'https://api.anthropic.com',
				:modelsConfig,
				:quotaConfig,
				true,
				true,
				CURRENT_TIMESTAMP,
				CURRENT_TIMESTAMP
			)`,
			{
				apiKeyPlaceholder: 'PLATFORM_CONFIG_REQUIRED',
				modelsConfig: JSON.stringify({
					models: [
						{
							id: 'claude-3-opus-20240229',
							name: 'Claude 3 Opus',
							description: 'Most capable Claude 3 model',
							pricePerToken: 0.000015,
							currency: 'CNY',
							contextWindow: 200000,
							maxOutputTokens: 4096,
							supportsFunctions: true,
							supportsVision: true,
						},
						{
							id: 'claude-3-5-sonnet-20241022',
							name: 'Claude 3.5 Sonnet',
							description: 'Balanced performance and speed',
							pricePerToken: 0.000003,
							currency: 'CNY',
							contextWindow: 200000,
							maxOutputTokens: 8192,
							supportsFunctions: true,
							supportsVision: true,
						},
						{
							id: 'claude-3-haiku-20240307',
							name: 'Claude 3 Haiku',
							description: 'Fastest Claude 3 model',
							pricePerToken: 0.00000025,
							currency: 'CNY',
							contextWindow: 200000,
							maxOutputTokens: 4096,
							supportsFunctions: true,
							supportsVision: false,
						},
					],
				}),
				quotaConfig: JSON.stringify({
					monthlyTokens: 10000000,
					currentUsed: 0,
				}),
			},
		);

		logger.info('Successfully inserted initial AI providers');
	}

	/**
	 * 执行迁移
	 */
	async up(context: MigrationContext) {
		const { logger } = context;

		logger.info('Starting RedesignPlatformArchitecture migration (up)');

		// Step 1: 创建新表
		logger.info('Creating platform_ai_provider table');
		await this.createPlatformAIProviderTable(context);

		logger.info('Creating platform_node table');
		await this.createPlatformNodeTable(context);

		logger.info('Creating custom_node table');
		await this.createCustomNodeTable(context);

		logger.info('Creating user_node_config table');
		await this.createUserNodeConfigTable(context);

		// Step 2: 添加外键约束
		logger.info('Adding foreign key constraints');
		await this.addForeignKeys(context);

		// Step 3: 创建索引
		logger.info('Creating indexes');
		await this.createIndexes(context);

		// Step 4: 初始化 AI 提供商数据
		await this.insertInitialAIProviders(context);

		// Step 5: 删除 workspace_plugin_credentials 表（设计错误）
		logger.info('Dropping workspace_plugin_credentials table (deprecated design)');
		await this.dropWorkspacePluginCredentialsTable(context);

		logger.info('RedesignPlatformArchitecture migration (up) completed successfully');
		logger.info('');
		logger.info('⚠️  IMPORTANT NOTES:');
		logger.info('1. The platform_service table is marked as DEPRECATED but NOT deleted');
		logger.info('2. Please migrate data from platform_service to new tables manually');
		logger.info('3. AI provider API keys need to be configured by platform admin');
		logger.info('4. The credentials_entity table is NOT touched - keep for backward compatibility');
	}

	/**
	 * 删除 workspace_plugin_credentials 表
	 */
	async dropWorkspacePluginCredentialsTable({
		schemaBuilder: { dropTable },
		logger,
	}: MigrationContext) {
		try {
			await dropTable(table.workspacePluginCredentials);
			logger.info('workspace_plugin_credentials table dropped successfully');
		} catch (error) {
			logger.warn('workspace_plugin_credentials table does not exist or already dropped');
		}
	}

	/**
	 * 回滚迁移
	 */
	async down(context: MigrationContext) {
		const {
			logger,
			schemaBuilder: { dropTable },
		} = context;

		logger.info('Starting RedesignPlatformArchitecture migration rollback (down)');

		// 删除新表（逆序）
		logger.info('Dropping user_node_config table');
		await dropTable(table.userNodeConfig);

		logger.info('Dropping custom_node table');
		await dropTable(table.customNode);

		logger.info('Dropping platform_node table');
		await dropTable(table.platformNode);

		logger.info('Dropping platform_ai_provider table');
		await dropTable(table.platformAIProvider);

		// 注意：workspace_plugin_credentials 表不会重新创建，因为它设计有误

		logger.info('RedesignPlatformArchitecture migration rollback (down) completed');
		logger.info('⚠️  workspace_plugin_credentials table was NOT recreated (deprecated design)');
	}
}
