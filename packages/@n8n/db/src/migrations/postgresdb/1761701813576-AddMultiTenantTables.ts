import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddMultiTenantTables1761701813576 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// 1. 创建团队表 (team)
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "${tablePrefix}team" (
				"id" varchar(21) NOT NULL,
				"name" varchar(255) NOT NULL,
				"slug" varchar(100) NULL,
				"description" text NULL,
				"icon" json NULL,
				"status" varchar(50) NOT NULL DEFAULT 'active',
				"billingMode" varchar(50) NOT NULL DEFAULT 'owner_pays',
				"maxMembers" int NOT NULL DEFAULT 10,
				"ownerId" uuid NOT NULL,
				"createdAt" timestamp NOT NULL DEFAULT NOW(),
				"updatedAt" timestamp NOT NULL DEFAULT NOW(),
				PRIMARY KEY ("id"),
				CONSTRAINT "CHK_team_status" CHECK ("status" IN ('active', 'suspended', 'deleted')),
				CONSTRAINT "CHK_team_billing" CHECK ("billingMode" IN ('owner_pays', 'member_pays'))
			);
		`);

		// 创建唯一索引
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_${tablePrefix}team_slug" ON "${tablePrefix}team" ("slug") WHERE "slug" IS NOT NULL;
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}team_owner" ON "${tablePrefix}team" ("ownerId");
		`);

		// 2. 创建团队成员表 (team_member)
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "${tablePrefix}team_member" (
				"id" varchar(21) NOT NULL,
				"teamId" varchar(21) NOT NULL,
				"userId" uuid NOT NULL,
				"role" varchar(50) NOT NULL DEFAULT 'team:member',
				"joinedAt" timestamp NOT NULL DEFAULT NOW(),
				"createdAt" timestamp NOT NULL DEFAULT NOW(),
				"updatedAt" timestamp NOT NULL DEFAULT NOW(),
				PRIMARY KEY ("id"),
				CONSTRAINT "CHK_team_member_role" CHECK ("role" IN ('team:owner', 'team:admin', 'team:member', 'team:viewer'))
			);
		`);

		// 创建唯一索引和普通索引
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
			ALTER TABLE "${tablePrefix}user"
			ADD COLUMN "tier" varchar(50) NOT NULL DEFAULT 'free',
			ADD COLUMN "maxTeams" int NOT NULL DEFAULT 3,
			ADD COLUMN "maxStorageMb" int NOT NULL DEFAULT 1024,
			ADD COLUMN "tenantStatus" varchar(50) NOT NULL DEFAULT 'active';
		`);

		// 4. 扩展项目表，添加多租户字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			ADD COLUMN "teamId" varchar(21) NULL,
			ADD COLUMN "isDefault" boolean NOT NULL DEFAULT false;
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

		// 6. 添加约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user"
			ADD CONSTRAINT "CHK_user_tier" CHECK ("tier" IN ('free', 'pro', 'enterprise')),
			ADD CONSTRAINT "CHK_user_tenant_status" CHECK ("tenantStatus" IN ('active', 'suspended', 'deleted'));
		`);

		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			ADD CONSTRAINT "CHK_project_team_consistency" CHECK (
				("type" = 'personal' AND "teamId" IS NULL) OR
				("type" = 'team' AND "teamId" IS NOT NULL)
			);
		`);

		// 7. 添加外键约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
			ADD CONSTRAINT "FK_team_member_team" FOREIGN KEY ("teamId") REFERENCES "${tablePrefix}team"("id") ON DELETE CASCADE,
			ADD CONSTRAINT "FK_team_member_user" FOREIGN KEY ("userId") REFERENCES "${tablePrefix}user"("id") ON DELETE CASCADE;
		`);

		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			ADD CONSTRAINT "FK_project_team" FOREIGN KEY ("teamId") REFERENCES "${tablePrefix}team"("id") ON DELETE CASCADE;
		`);

		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team"
			ADD CONSTRAINT "FK_team_owner" FOREIGN KEY ("ownerId") REFERENCES "${tablePrefix}user"("id") ON DELETE CASCADE;
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// 删除外键约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member" DROP CONSTRAINT "FK_team_member_team";
			ALTER TABLE "${tablePrefix}team_member" DROP CONSTRAINT "FK_team_member_user";
			ALTER TABLE "${tablePrefix}project" DROP CONSTRAINT "FK_project_team";
			ALTER TABLE "${tablePrefix}team" DROP CONSTRAINT "FK_team_owner";
		`);

		// 删除约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user" DROP CONSTRAINT "CHK_user_tier";
			ALTER TABLE "${tablePrefix}user" DROP CONSTRAINT "CHK_user_tenant_status";
			ALTER TABLE "${tablePrefix}project" DROP CONSTRAINT "CHK_project_team_consistency";
		`);

		// 删除索引
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}user_tier"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}user_tenant_status"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}project_team"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}project_is_default"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}team_member_unique"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}team_member_team"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}team_member_user"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}team_slug"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}team_owner"`);

		// 删除扩展的字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project" DROP COLUMN "teamId";
			ALTER TABLE "${tablePrefix}project" DROP COLUMN "isDefault";
			ALTER TABLE "${tablePrefix}user" DROP COLUMN "tier";
			ALTER TABLE "${tablePrefix}user" DROP COLUMN "maxTeams";
			ALTER TABLE "${tablePrefix}user" DROP COLUMN "maxStorageMb";
			ALTER TABLE "${tablePrefix}user" DROP COLUMN "tenantStatus";
		`);

		// 删除表
		await queryRunner.query(`DROP TABLE "${tablePrefix}team_member"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}team"`);
	}
}
