import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tables = {
	workflow: 'workflow_entity',
	credentials: 'credentials_entity',
	project: 'project',
} as const;

/**
 * [PLAN_A 独占模式改造] Phase 3: 数据库迁移
 *
 * 为 Workflow 和 Credentials 添加 projectId 独占归属字段
 * - 每个资源（Workflow/Credentials）只能归属一个工作区（Project）
 * - 工作区之间数据完全隔离
 * - 简化查询路径：从 workflow→shared→project 改为 workflow→project
 */
export class AddProjectIdToWorkflowAndCredentials1761868326258 implements ReversibleMigration {
	async up({
		runQuery,
		schemaBuilder: { addColumns, column, addForeignKey, createIndex },
	}: MigrationContext) {
		// ============================================================
		// 步骤 1: 为 workflow_entity 添加 projectId 字段
		// ============================================================
		await addColumns(tables.workflow, [
			column('projectId')
				.varchar(36)
				.notNull.comment('[独占模式] Project ID - 工作流独占归属一个工作区'),
		]);

		// ============================================================
		// 步骤 2: 为 credentials_entity 添加 projectId 字段
		// ============================================================
		await addColumns(tables.credentials, [
			column('projectId')
				.varchar(36)
				.notNull.comment('[独占模式] Project ID - 凭证独占归属一个工作区'),
		]);

		// ============================================================
		// 步骤 3: 为现有数据填充 projectId（开发阶段可能没有数据）
		// ============================================================
		// 注意：这里假设从 shared_workflow 和 shared_credentials 表迁移数据
		// 取每个资源的第一个 project 关联作为独占归属
		// 如果是全新数据库，这些语句不会有任何影响

		// 为 workflow_entity 填充 projectId
		await runQuery(`
			UPDATE ${tables.workflow} w
			SET "projectId" = COALESCE(
				(
					SELECT sw."projectId"
					FROM shared_workflow sw
					WHERE sw."workflowId" = w.id
					LIMIT 1
				),
				-- 如果没有 shared_workflow 记录，使用用户的默认个人项目
				(
					SELECT p.id
					FROM ${tables.project} p
					INNER JOIN project_relation pr ON pr."projectId" = p.id
					WHERE p.type = 'personal'
					  AND (p."isDefault" = true OR p."isDefault" IS NULL)
					LIMIT 1
				)
			)
			WHERE w."projectId" IS NULL OR w."projectId" = ''
		`);

		// 为 credentials_entity 填充 projectId
		await runQuery(`
			UPDATE ${tables.credentials} c
			SET "projectId" = COALESCE(
				(
					SELECT sc."projectId"
					FROM shared_credentials sc
					WHERE sc."credentialsId" = c.id
					LIMIT 1
				),
				-- 如果没有 shared_credentials 记录，使用用户的默认个人项目
				(
					SELECT p.id
					FROM ${tables.project} p
					INNER JOIN project_relation pr ON pr."projectId" = p.id
					WHERE p.type = 'personal'
					  AND (p."isDefault" = true OR p."isDefault" IS NULL)
					LIMIT 1
				)
			)
			WHERE c."projectId" IS NULL OR c."projectId" = ''
		`);

		// ============================================================
		// 步骤 4: 添加外键约束
		// ============================================================
		await addForeignKey(
			tables.workflow,
			'projectId',
			[tables.project, 'id'],
			'FK_workflow_projectId_project', // 唯一的约束名称
		);

		await addForeignKey(
			tables.credentials,
			'projectId',
			[tables.project, 'id'],
			'FK_credentials_projectId_project', // 唯一的约束名称
		);

		// ============================================================
		// 步骤 5: 添加索引以提升查询性能
		// ============================================================
		await createIndex(tables.workflow, ['projectId']);
		await createIndex(tables.credentials, ['projectId']);

		// ============================================================
		// 步骤 6: [可选] 添加应用市场扩展字段（为未来功能预留）
		// ============================================================
		await addColumns(tables.workflow, [
			column('isMarketplaceTemplate')
				.bool.default(false)
				.comment('[应用市场] 是否为应用市场的公开模板'),
			column('sourceMarketplaceAppId')
				.varchar(36)
				.comment('[应用市场] 如果是从市场安装，记录来源模板ID'),
		]);

		await addColumns(tables.credentials, [
			column('isMarketplaceTemplate')
				.bool.default(false)
				.comment('[应用市场] 是否为应用市场的公开模板'),
			column('sourceMarketplaceAppId')
				.varchar(36)
				.comment('[应用市场] 如果是从市场安装，记录来源模板ID'),
		]);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		// ============================================================
		// 回滚操作：删除所有添加的字段和索引
		// ============================================================

		// 删除索引
		await dropIndex(tables.workflow, ['projectId']);
		await dropIndex(tables.credentials, ['projectId']);

		// 删除列（外键会自动删除）
		await dropColumns(tables.workflow, [
			'projectId',
			'isMarketplaceTemplate',
			'sourceMarketplaceAppId',
		]);
		await dropColumns(tables.credentials, [
			'projectId',
			'isMarketplaceTemplate',
			'sourceMarketplaceAppId',
		]);
	}
}
