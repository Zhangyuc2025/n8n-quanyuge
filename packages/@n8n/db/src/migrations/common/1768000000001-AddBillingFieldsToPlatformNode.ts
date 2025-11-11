import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * 为 platform_node 表添加计费相关字段
 *
 * 新增字段：
 * - billing_mode: 计费模式（free/token-based/per-execution/duration-based）
 * - billing_config: 计费配置（JSON，包含各种价格信息）
 */
export class AddBillingFieldsToPlatformNode1768000000001 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, escape, runQuery }: MigrationContext) {
		const tableName = 'platform_node';

		// 添加计费字段
		await addColumns(tableName, [
			// 计费模式
			column('billing_mode')
				.varchar(50)
				.default("'free'"),

			// 计费配置（JSON）
			column('billing_config').json,
		]);

		// 迁移现有数据：如果 is_billable = true，设置 billing_mode = 'per-execution'
		await runQuery(
			`UPDATE ${escape.tableName(tableName)}
			 SET ${escape.columnName('billing_mode')} = 'per-execution'
			 WHERE ${escape.columnName('is_billable')} = 1`,
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		const tableName = 'platform_node';

		// 删除字段
		await dropColumns(tableName, ['billing_mode', 'billing_config']);
	}
}
