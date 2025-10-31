import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * 重新创建 Team 表使用正确的类型
 *
 * 问题：原始迁移使用 uuid 类型，但实体生成 nanoid 字符串
 * 解决：删除表并使用正确类型重新创建（数据库应该为空）
 */
export class RecreateTeamTablesWithCorrectTypes1761882200000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// 1. 删除外键约束（如果存在）
		await queryRunner.query(`
			ALTER TABLE IF EXISTS "${tablePrefix}team_member" DROP CONSTRAINT IF EXISTS "FK_team_member_team";
		`);
		await queryRunner.query(`
			ALTER TABLE IF EXISTS "${tablePrefix}team_member" DROP CONSTRAINT IF EXISTS "FK_team_member_user";
		`);
		await queryRunner.query(`
			ALTER TABLE IF EXISTS "${tablePrefix}project" DROP CONSTRAINT IF EXISTS "FK_project_team";
		`);
		await queryRunner.query(`
			ALTER TABLE IF EXISTS "${tablePrefix}team" DROP CONSTRAINT IF EXISTS "FK_team_owner";
		`);

		// 2. 删除表
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}team_member" CASCADE;`);
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}team" CASCADE;`);

		// 3. 从 project 表删除 teamId 和 isDefault 列
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			DROP COLUMN IF EXISTS "teamId",
			DROP COLUMN IF EXISTS "isDefault";
		`);

		// 4. 从 user 表删除多租户字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user"
			DROP COLUMN IF EXISTS "tier",
			DROP COLUMN IF EXISTS "maxTeams",
			DROP COLUMN IF EXISTS "maxStorageMb",
			DROP COLUMN IF EXISTS "tenantStatus";
		`);

		// 5. 重新创建 team 表（使用 varchar 类型）
		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}team" (
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

		// 6. 重新创建 team_member 表（使用 varchar 类型）
		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}team_member" (
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

		// 7. 重新添加 project 表的多租户字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			ADD COLUMN "teamId" varchar(21) NULL,
			ADD COLUMN "isDefault" boolean NOT NULL DEFAULT false;
		`);

		// 8. 重新添加 user 表的多租户字段
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user"
			ADD COLUMN "tier" varchar(50) NOT NULL DEFAULT 'free',
			ADD COLUMN "maxTeams" int NOT NULL DEFAULT 3,
			ADD COLUMN "maxStorageMb" int NOT NULL DEFAULT 1024,
			ADD COLUMN "tenantStatus" varchar(50) NOT NULL DEFAULT 'active';
		`);

		// 9. 创建索引
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_${tablePrefix}team_slug" ON "${tablePrefix}team" ("slug") WHERE "slug" IS NOT NULL;
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}team_owner" ON "${tablePrefix}team" ("ownerId");
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
		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}user_tier" ON "${tablePrefix}user" ("tier");
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}user_tenant_status" ON "${tablePrefix}user" ("tenantStatus");
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}project_team" ON "${tablePrefix}project" ("teamId");
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_${tablePrefix}project_is_default" ON "${tablePrefix}project" ("isDefault");
		`);

		// 10. 添加约束
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

		// 11. 添加外键约束
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
		// 回滚：删除所有内容
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}team_member" CASCADE;`);
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}team" CASCADE;`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			DROP COLUMN IF EXISTS "teamId",
			DROP COLUMN IF EXISTS "isDefault";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}user"
			DROP COLUMN IF EXISTS "tier",
			DROP COLUMN IF EXISTS "maxTeams",
			DROP COLUMN IF EXISTS "maxStorageMb",
			DROP COLUMN IF EXISTS "tenantStatus";
		`);
	}
}
