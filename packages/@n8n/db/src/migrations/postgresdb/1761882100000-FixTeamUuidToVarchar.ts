import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * 修复 Team 表的 UUID 类型问题
 *
 * 原因：Team 实体使用 WithTimestampsAndStringId 生成 nanoid，
 * 但迁移文件错误使用了 PostgreSQL 的 uuid 类型，导致类型不匹配
 *
 * 解决方案：将所有 uuid 类型改为 varchar
 */
export class FixTeamUuidToVarchar1761882100000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// 1. 删除外键约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member" DROP CONSTRAINT IF EXISTS "FK_team_member_team";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member" DROP CONSTRAINT IF EXISTS "FK_team_member_user";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project" DROP CONSTRAINT IF EXISTS "FK_project_team";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team" DROP CONSTRAINT IF EXISTS "FK_team_owner";
		`);

		// 2. 修改 team 表的列类型
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team"
			ALTER COLUMN "id" TYPE varchar(21),
			ALTER COLUMN "id" DROP DEFAULT,
			ALTER COLUMN "ownerId" TYPE varchar(36);
		`);

		// 3. 修改 team_member 表的列类型
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
			ALTER COLUMN "id" TYPE varchar(21),
			ALTER COLUMN "id" DROP DEFAULT,
			ALTER COLUMN "teamId" TYPE varchar(21),
			ALTER COLUMN "userId" TYPE varchar(36);
		`);

		// 4. 修改 project 表的 teamId 列类型
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			ALTER COLUMN "teamId" TYPE varchar(21);
		`);

		// 5. 重新添加外键约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
			ADD CONSTRAINT "FK_team_member_team" FOREIGN KEY ("teamId") REFERENCES "${tablePrefix}team"("id") ON DELETE CASCADE;
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
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
		// 回滚：删除外键约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member" DROP CONSTRAINT "FK_team_member_team";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member" DROP CONSTRAINT "FK_team_member_user";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project" DROP CONSTRAINT "FK_project_team";
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team" DROP CONSTRAINT "FK_team_owner";
		`);

		// 回滚：恢复为 uuid 类型
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team"
			ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
			ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
			ALTER COLUMN "ownerId" TYPE uuid USING "ownerId"::uuid;
		`);

		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
			ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
			ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
			ALTER COLUMN "teamId" TYPE uuid USING "teamId"::uuid,
			ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
		`);

		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}project"
			ALTER COLUMN "teamId" TYPE uuid USING "teamId"::uuid;
		`);

		// 回滚：重新添加外键约束
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
			ADD CONSTRAINT "FK_team_member_team" FOREIGN KEY ("teamId") REFERENCES "${tablePrefix}team"("id") ON DELETE CASCADE;
		`);
		await queryRunner.query(`
			ALTER TABLE "${tablePrefix}team_member"
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
}
