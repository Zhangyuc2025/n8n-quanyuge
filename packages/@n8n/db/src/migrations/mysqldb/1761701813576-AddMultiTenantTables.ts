import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

export class AddMultiTenantTables1761701813576 implements MigrationInterface {
	name = 'AddMultiTenantTables1761701813576';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = this.getTablePrefix();

		// 1. 创建团队表 (team)
		await queryRunner.query(`
			CREATE TABLE \`${tablePrefix}team\` (
				\`id\` varchar(36) NOT NULL,
				\`name\` varchar(255) NOT NULL,
				\`slug\` varchar(100) NULL,
				\`description\` text NULL,
				\`icon\` json NULL,
				\`status\` varchar(50) NOT NULL DEFAULT 'active',
				\`billingMode\` varchar(50) NOT NULL DEFAULT 'owner_pays',
				\`maxMembers\` int NOT NULL DEFAULT 10,
				\`ownerId\` varchar(36) NOT NULL,
				\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
				\`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
				PRIMARY KEY (\`id\`),
				UNIQUE INDEX \`IDX_${tablePrefix}team_slug\` (\`slug\`),
				INDEX \`IDX_${tablePrefix}team_owner\` (\`ownerId\`),
				CONSTRAINT \`CHK_${tablePrefix}team_status\` CHECK (\`status\` IN ('active', 'suspended', 'deleted')),
				CONSTRAINT \`CHK_${tablePrefix}team_billing\` CHECK (\`billingMode\` IN ('owner_pays', 'member_pays'))
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`);

		// 2. 创建团队成员表 (team_member)
		await queryRunner.query(`
			CREATE TABLE \`${tablePrefix}team_member\` (
				\`id\` varchar(36) NOT NULL,
				\`teamId\` varchar(36) NOT NULL,
				\`userId\` varchar(36) NOT NULL,
				\`role\` varchar(50) NOT NULL DEFAULT 'team:member',
				\`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
				\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
				\`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
				PRIMARY KEY (\`id\`),
				UNIQUE INDEX \`IDX_${tablePrefix}team_member_unique\` (\`teamId\`, \`userId\`),
				INDEX \`IDX_${tablePrefix}team_member_team\` (\`teamId\`),
				INDEX \`IDX_${tablePrefix}team_member_user\` (\`userId\`),
				CONSTRAINT \`CHK_${tablePrefix}team_member_role\` CHECK (\`role\` IN ('team:owner', 'team:admin', 'team:member', 'team:viewer'))
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`);

		// 3. 扩展用户表，添加多租户字段
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}user\`
			ADD COLUMN \`tier\` varchar(50) NOT NULL DEFAULT 'free',
			ADD COLUMN \`maxTeams\` int NOT NULL DEFAULT 3,
			ADD COLUMN \`maxStorageMb\` int NOT NULL DEFAULT 1024,
			ADD COLUMN \`tenantStatus\` varchar(50) NOT NULL DEFAULT 'active';
		`);

		// 4. 扩展项目表，添加多租户字段
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}project\`
			ADD COLUMN \`teamId\` varchar(36) NULL,
			ADD COLUMN \`isDefault\` boolean NOT NULL DEFAULT false;
		`);

		// 5. 添加索引
		await queryRunner.query(`
			CREATE INDEX \`IDX_${tablePrefix}user_tier\` ON \`${tablePrefix}user\` (\`tier\`);
			CREATE INDEX \`IDX_${tablePrefix}user_tenant_status\` ON \`${tablePrefix}user\` (\`tenantStatus\`);
			CREATE INDEX \`IDX_${tablePrefix}project_team\` ON \`${tablePrefix}project\` (\`teamId\`);
			CREATE INDEX \`IDX_${tablePrefix}project_owner_default\` ON \`${tablePrefix}project_relation\` (\`userId\`, \`isDefault\`);
		`);

		// 6. 添加约束
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}user\`
			ADD CONSTRAINT \`CHK_${tablePrefix}user_tier\` CHECK (\`tier\` IN ('free', 'pro', 'enterprise')),
			ADD CONSTRAINT \`CHK_${tablePrefix}user_tenant_status\` CHECK (\`tenantStatus\` IN ('active', 'suspended', 'deleted'));
		`);

		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}project\`
			ADD CONSTRAINT \`CHK_${tablePrefix}project_team_consistency\` CHECK (
				(\`type\` = 'personal' AND \`teamId\` IS NULL) OR
				(\`type\` = 'team' AND \`teamId\` IS NOT NULL)
			);
		`);

		// 7. 添加外键约束
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}team_member\`
			ADD CONSTRAINT \`FK_${tablePrefix}team_member_team\` FOREIGN KEY (\`teamId\`) REFERENCES \`${tablePrefix}team\`(\`id\`) ON DELETE CASCADE,
			ADD CONSTRAINT \`FK_${tablePrefix}team_member_user\` FOREIGN KEY (\`userId\`) REFERENCES \`${tablePrefix}user\`(\`id\`) ON DELETE CASCADE;
		`);

		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}project\`
			ADD CONSTRAINT \`FK_${tablePrefix}project_team\` FOREIGN KEY (\`teamId\`) REFERENCES \`${tablePrefix}team\`(\`id\`) ON DELETE CASCADE;
		`);

		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}team\`
			ADD CONSTRAINT \`FK_${tablePrefix}team_owner\` FOREIGN KEY (\`ownerId\`) REFERENCES \`${tablePrefix}user\`(\`id\`) ON DELETE CASCADE;
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = this.getTablePrefix();

		// 删除外键约束
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}team_member\` DROP FOREIGN KEY \`FK_${tablePrefix}team_member_team\`;
			ALTER TABLE \`${tablePrefix}team_member\` DROP FOREIGN KEY \`FK_${tablePrefix}team_member_user\`;
			ALTER TABLE \`${tablePrefix}project\` DROP FOREIGN KEY \`FK_${tablePrefix}project_team\`;
			ALTER TABLE \`${tablePrefix}team\` DROP FOREIGN KEY \`FK_${tablePrefix}team_owner\`;
		`);

		// 删除约束
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}user\` DROP CHECK \`CHK_${tablePrefix}user_tier\`;
			ALTER TABLE \`${tablePrefix}user\` DROP CHECK \`CHK_${tablePrefix}user_tenant_status\`;
			ALTER TABLE \`${tablePrefix}project\` DROP CHECK \`CHK_${tablePrefix}project_team_consistency\`;
		`);

		// 删除索引
		await queryRunner.query(`
			DROP INDEX \`IDX_${tablePrefix}user_tier\` ON \`${tablePrefix}user\`;
			DROP INDEX \`IDX_${tablePrefix}user_tenant_status\` ON \`${tablePrefix}user\`;
			DROP INDEX \`IDX_${tablePrefix}project_team\` ON \`${tablePrefix}project\`;
			DROP INDEX \`IDX_${tablePrefix}project_owner_default\` ON \`${tablePrefix}project_relation\`;
			DROP INDEX \`IDX_${tablePrefix}team_member_unique\` ON \`${tablePrefix}team_member\`;
			DROP INDEX \`IDX_${tablePrefix}team_member_team\` ON \`${tablePrefix}team_member\`;
			DROP INDEX \`IDX_${tablePrefix}team_member_user\` ON \`${tablePrefix}team_member\`;
			DROP INDEX \`IDX_${tablePrefix}team_slug\` ON \`${tablePrefix}team\`;
			DROP INDEX \`IDX_${tablePrefix}team_owner\` ON \`${tablePrefix}team\`;
		`);

		// 删除扩展的字段
		await queryRunner.query(`
			ALTER TABLE \`${tablePrefix}project\` DROP COLUMN \`teamId\`;
			ALTER TABLE \`${tablePrefix}project\` DROP COLUMN \`isDefault\`;
			ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`tier\`;
			ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`maxTeams\`;
			ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`maxStorageMb\`;
			ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`tenantStatus\`;
		`);

		// 删除表
		await queryRunner.query(`DROP TABLE \`${tablePrefix}team_member\``);
		await queryRunner.query(`DROP TABLE \`${tablePrefix}team\``);
	}

	/**
	 * 获取表前缀
	 */
	private getTablePrefix(): string {
		// 在 n8n 中，表没有前缀，直接返回空字符串
		return '';
	}
}
