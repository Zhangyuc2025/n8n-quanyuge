import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
	projects: 'project',
} as const;

/**
 * [多租户改造] 为 Chat Hub 添加 Project 关联
 * 在 sessions 和 messages 表中添加 projectId 字段
 * 符合 n8n 现有架构（WorkflowEntity、CredentialsEntity 都关联 Project）
 */
export class AddProjectIdToChatHub1761745000000 implements ReversibleMigration {
	async up({ runQuery, schemaBuilder: { addColumns, column, addForeignKey } }: MigrationContext) {
		// 1. 为 chat_hub_sessions 添加 projectId 列
		await addColumns(table.sessions, [
			column('projectId')
				.varchar(36)
				.comment('[多租户改造] Project ID，用于多租户数据隔离和权限控制'),
		]);

		// 2. 为 chat_hub_messages 添加 projectId 列
		await addColumns(table.messages, [
			column('projectId').varchar(36).comment('[多租户改造] Project ID，用于多租户数据隔离'),
		]);

		// 3. 为现有数据填充 projectId（如果有数据的话）
		// 从 user 所属的默认个人 project 获取 projectId
		await runQuery(`
			UPDATE ${table.sessions} s
			SET projectId = (
				SELECT p.id
				FROM ${table.projects} p
				INNER JOIN project_relation pr ON pr.projectId = p.id
				WHERE pr.userId = s.ownerId
				  AND p.type = 'personal'
				  AND (p.isDefault = true OR p.isDefault IS NULL)
				LIMIT 1
			)
			WHERE s.projectId IS NULL
		`);

		await runQuery(`
			UPDATE ${table.messages} m
			SET projectId = (
				SELECT s.projectId
				FROM ${table.sessions} s
				WHERE s.id = m.sessionId
			)
			WHERE m.projectId IS NULL
		`);

		// 4. 添加外键约束
		await addForeignKey(table.sessions, 'projectId', [table.projects, 'id'], 'CASCADE');
		await addForeignKey(table.messages, 'projectId', [table.projects, 'id'], 'CASCADE');

		// 5. 为 projectId 添加索引以提升查询性能
		await runQuery(`CREATE INDEX idx_chat_hub_sessions_projectid ON ${table.sessions}(projectId)`);
		await runQuery(`CREATE INDEX idx_chat_hub_messages_projectid ON ${table.messages}(projectId)`);
	}

	async down({ runQuery, schemaBuilder: { dropColumns } }: MigrationContext) {
		// 删除索引
		await runQuery(`DROP INDEX IF EXISTS idx_chat_hub_sessions_projectid`);
		await runQuery(`DROP INDEX IF EXISTS idx_chat_hub_messages_projectid`);

		// 删除列（外键会自动删除）
		await dropColumns(table.sessions, ['projectId']);
		await dropColumns(table.messages, ['projectId']);
	}
}
