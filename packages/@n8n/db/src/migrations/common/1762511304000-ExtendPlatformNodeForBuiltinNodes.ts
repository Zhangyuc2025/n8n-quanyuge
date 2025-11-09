import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * 扩展 platform_node 表以支持内置节点统一管理
 *
 * 新增字段：
 * - source_type: 节点来源类型（builtin/platform_official/third_party）
 * - documentation_url: 教学文档链接（可后台修改）
 * - documentation_config: 完整文档配置（JSON）
 * - codex: 完整 codex 配置（JSON）
 */
export class ExtendPlatformNodeForBuiltinNodes1762511304000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		const tableName = 'platform_node';

		// 添加新字段
		await addColumns(tableName, [
			// 节点来源类型：builtin（内置）、platform_official（平台官方）、third_party（第三方）
			column('source_type')
				.varchar(50)
				.notNull.default("'platform_official'"),

			// 主要教学文档URL（可在后台管理界面修改）
			column('documentation_url').text,

			// 完整文档配置（JSONB：包含教程链接、视频、博客等）
			column('documentation_config').json,

			// 节点 codex 配置（包含分类、标签等）
			column('codex').json,
		]);

		// 在 source_type 字段上创建索引，优化查询性能
		await createIndex(tableName, ['source_type']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		const tableName = 'platform_node';

		// 删除索引
		await dropIndex(tableName, ['source_type']);

		// 删除字段
		await dropColumns(tableName, [
			'source_type',
			'documentation_url',
			'documentation_config',
			'codex',
		]);
	}
}
