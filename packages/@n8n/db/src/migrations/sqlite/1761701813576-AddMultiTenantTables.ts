import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddMultiTenantTables1761701813576 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// 1. 创建团队表 (team)
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "${tablePrefix}team" (
				"id" varchar(36) NOT NULL,
				"name" varchar(255) NOT NULL,
				"slug" varchar(100) NULL,
				"description" text NULL,
				"icon" text NULL,
				"status" varchar(50) NOT NULL DEFAULT 'active',
				"billingMode" varchar(50) NOT NULL DEFAULT 'owner_pays',
				"maxMembers" integer NOT NULL DEFAULT 10,
				"ownerId" varchar(36) NOT NULL,
				"createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY ("id"),
				CHECK ("status" IN ('active', 'suspended', 'deleted')),
				CHECK ("billingMode" IN ('owner_pays', 'member_pays'))
			);
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_${tablePrefix}team_slug" ON "${tablePrefix}team" ("slug") WHERE "slug" IS NOT NULL;
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}team_owner" ON "${tablePrefix}team" ("ownerId");
		`);

		// 2. 创建团队成员表 (team_member)
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "${tablePrefix}team_member" (
				"id" varchar(36) NOT NULL,
				"teamId" varchar(36) NOT NULL,
				"userId" varchar(36) NOT NULL,
				"role" varchar(50) NOT NULL DEFAULT 'team:member',
				"joinedAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY ("id"),
				CHECK ("role" IN ('team:owner', 'team:admin', 'team:member', 'team:viewer'))
			);
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_${tablePrefix}team_member_unique" ON "${tablePrefix}team_member" ("teamId", "userId");
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}team_member_team" ON "${tablePrefix}team_member" ("teamId");
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}team_member_user" ON "${tablePrefix}team_member" ("userId");
		`);

		// 3. 扩展用户表，添加多租户字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user" ADD COLUMN "tier" varchar(50) NOT NULL DEFAULT 'free';
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user" ADD COLUMN "maxTeams" integer NOT NULL DEFAULT 3;
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user" ADD COLUMN "maxStorageMb" integer NOT NULL DEFAULT 1024;
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user" ADD COLUMN "tenantStatus" varchar(50) NOT NULL DEFAULT 'active';
		`);

		// 4. 扩展项目表，添加多租户字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project" ADD COLUMN "teamId" varchar(36) NULL;
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project" ADD COLUMN "isDefault" boolean NOT NULL DEFAULT 0;
		`);

		// 5. 添加索引
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}user_tier" ON "${tablePrefix}user" ("tier")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}user_tenant_status" ON "${tablePrefix}user" ("tenantStatus")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}project_team" ON "${tablePrefix}project" ("teamId")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}project_is_default" ON "${tablePrefix}project" ("isDefault")`,
		);

		// 注意：SQLite 不支持 ALTER TABLE ADD CONSTRAINT
		// CHECK 约束已在表创建时添加
		// 外键约束需要在表创建时定义，或通过重建表来添加
	}

	async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// 删除索引
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}user_tier"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}user_tenant_status"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}project_team"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}project_is_default"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}team_member_unique"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}team_member_team"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}team_member_user"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}team_slug"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}team_owner"`);

		// 注意：SQLite 不支持 ALTER TABLE DROP COLUMN
		// 需要通过重建表来删除列，这里为了简化，我们只删除表
		// 在生产环境中，应该保留 user 和 project 表的其他数据

		// 删除扩展表
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}team_member"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}team"`);

		// 警告：SQLite 不支持 DROP COLUMN，如果需要回滚字段，需要重建整个表
		// 这里我们不处理 user 和 project 表的回滚
	}
}
