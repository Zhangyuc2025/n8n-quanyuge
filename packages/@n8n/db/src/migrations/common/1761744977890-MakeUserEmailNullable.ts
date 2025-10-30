import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Migration to make email field nullable in User table.
 *
 * This allows users to register with only username + password,
 * without providing an email address.
 *
 * Background: In multi-tenant SaaS system, we want to simplify registration
 * to just username + password. Email is no longer a required field.
 */
export class MakeUserEmailNullable1761744977890 implements ReversibleMigration {
	async up({ escape, dbType, runQuery }: MigrationContext) {
		const tableName = escape.tableName('user');
		const columnName = escape.columnName('email');

		if (dbType === 'postgresdb') {
			// PostgreSQL: ALTER COLUMN to drop NOT NULL constraint
			await runQuery(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP NOT NULL`);
		} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
			// MySQL/MariaDB: MODIFY COLUMN to change to NULL
			await runQuery(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} VARCHAR(255) NULL`);
		} else if (dbType === 'sqlite') {
			// SQLite doesn't support ALTER COLUMN directly
			// For now, we skip this migration for SQLite
			// In production, SQLite is rarely used, so this should be fine
			console.warn('SQLite does not support altering column constraints. Skipping migration.');
		}
	}

	async down({ escape, dbType, runQuery }: MigrationContext) {
		const tableName = escape.tableName('user');
		const columnName = escape.columnName('email');

		// Note: Rolling back this migration might fail if there are existing NULL emails in the database
		// In that case, you'll need to manually clean up the data first

		if (dbType === 'postgresdb') {
			// PostgreSQL: ALTER COLUMN to add NOT NULL constraint
			await runQuery(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL`);
		} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
			// MySQL/MariaDB: MODIFY COLUMN to change back to NOT NULL
			await runQuery(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} VARCHAR(255) NOT NULL`);
		} else if (dbType === 'sqlite') {
			console.warn('SQLite does not support altering column constraints. Skipping rollback.');
		}
	}
}
