import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * CreateUserAuthInitTables Migration
 *
 * This migration creates the user authentication and initialization system for n8n.
 * It adds platform admin management, system configuration storage, and balance transfer tracking.
 * It also extends existing tables to support user balance, membership tiers, and billing modes.
 *
 * Tables Created:
 * 1. platform_admin: Manages platform administrator accounts
 * 2. system_config: Stores system-level configuration key-value pairs
 * 3. balance_transfer_record: Tracks balance transfers from users to workspaces
 *
 * Tables Extended:
 * 1. user: Adds balance, membership_tier, membership_expire_at columns
 * 2. project: Adds billing_mode column
 * 3. usage_record: Adds balance_source column
 *
 * Migration Steps (up):
 * - Create platform_admin table for platform administrator management
 * - Create system_config table and initialize with platform_initialized=false
 * - Create balance_transfer_record table for tracking user-to-workspace balance transfers
 * - Extend user table with balance and membership fields
 * - Extend project table with billing_mode field
 * - Extend usage_record table with balance_source field
 * - Update existing projects with default billing_mode='executor' for personal workspaces
 * - Create necessary indexes for performance optimization
 *
 * Rollback Steps (down):
 * - Drop all new tables
 * - Remove added columns from existing tables
 * - Drop all created indexes
 *
 * Cross-Database Compatibility:
 * - Uses .double for balance fields (PostgreSQL: double precision, MySQL: double, SQLite: real)
 * - Uses .boolean for flags (PostgreSQL: boolean, MySQL: tinyint(1), SQLite: integer)
 * - Uses .varchar(36) for UUID fields to ensure MySQL/SQLite compatibility
 * - Uses .date for membership_expire_at (date only, no time component)
 * - Uses .timestampTimezone for datetime fields with timezone support
 */

const table = {
	platformAdmin: 'platform_admin',
	systemConfig: 'system_config',
	balanceTransferRecord: 'balance_transfer_record',
	user: 'user',
	project: 'project',
	usageRecord: 'usage_record',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		platformAdmin: escape.tableName(table.platformAdmin),
		systemConfig: escape.tableName(table.systemConfig),
		balanceTransferRecord: escape.tableName(table.balanceTransferRecord),
		user: escape.tableName(table.user),
		project: escape.tableName(table.project),
		usageRecord: escape.tableName(table.usageRecord),
	};

	const c = {
		id: escape.columnName('id'),
		email: escape.columnName('email'),
		password: escape.columnName('password'),
		name: escape.columnName('name'),
		role: escape.columnName('role'),
		isActive: escape.columnName('is_active'),
		lastLoginAt: escape.columnName('last_login_at'),
		key: escape.columnName('key'),
		value: escape.columnName('value'),
		fromUserId: escape.columnName('from_user_id'),
		toWorkspaceId: escape.columnName('to_workspace_id'),
		amount: escape.columnName('amount'),
		balance: escape.columnName('balance'),
		membershipTier: escape.columnName('membership_tier'),
		membershipExpireAt: escape.columnName('membership_expire_at'),
		billingMode: escape.columnName('billing_mode'),
		balanceSource: escape.columnName('balance_source'),
		type: escape.columnName('type'),
		createdAt: escape.columnName('created_at'),
		updatedAt: escape.columnName('updated_at'),
	};

	return { t, c };
}

export class CreateUserAuthInitTables1768000000000 implements ReversibleMigration {
	/**
	 * Create platform_admin table
	 * Manages platform administrator accounts with email-based authentication
	 */
	async createPlatformAdminTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.platformAdmin)
			.withColumns(
				// Primary key
				column('id').varchar(36).primary,
				// Email address (unique, used for login)
				column('email').varchar(255).notNull,
				// Hashed password
				column('password').varchar(255).notNull,
				// Display name
				column('name').varchar(100).notNull,
				// Admin role (default: 'admin', could be extended to 'super_admin', etc.)
				column('role')
					.varchar(50)
					.notNull.default("'admin'"),
				// Active status flag
				column('is_active').bool.notNull.default(true),
				// Last login timestamp
				column('last_login_at').timestampTimezone(3),
			)
			.withIndexOn('email', true).withTimestamps; // Unique index for email-based login // Adds created_at and updated_at columns
	}

	/**
	 * Create system_config table
	 * Key-value store for system-level configuration
	 */
	async createSystemConfigTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.systemConfig).withColumns(
			// Primary key (configuration key)
			column('key').varchar(100).primary,
			// Configuration value (stored as text)
			column('value').text.notNull,
			// Last update timestamp
			column('updated_at').timestampTimezone(3).default('NOW()').notNull,
		);
	}

	/**
	 * Initialize system_config table with default values
	 * Sets platform_initialized to 'false' to indicate platform needs initialization
	 */
	async initializeSystemConfig({ escape, runQuery, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Initializing system_config table with default values');

		await runQuery(
			`INSERT INTO ${t.systemConfig} (${c.key}, ${c.value}, ${c.updatedAt})
			VALUES (:key, :value, CURRENT_TIMESTAMP)`,
			{
				key: 'platform_initialized',
				value: 'false',
			},
		);

		logger.info('System config initialized with platform_initialized=false');
	}

	/**
	 * Create balance_transfer_record table
	 * Tracks balance transfers from user accounts to workspace accounts
	 */
	async createBalanceTransferRecordTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(table.balanceTransferRecord)
			.withColumns(
				// Primary key
				column('id').varchar(36).primary,
				// Foreign key to user (source of balance transfer)
				column('from_user_id').varchar(36).notNull,
				// Foreign key to project (destination workspace)
				column('to_workspace_id').varchar(36).notNull,
				// Transfer amount in CNY
				column('amount').double.notNull,
			)
			.withForeignKey('from_user_id', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete transfer records when user is deleted
			})
			.withForeignKey('to_workspace_id', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete transfer records when workspace is deleted
			})
			.withIndexOn('from_user_id') // Query by user
			.withIndexOn('to_workspace_id').withTimestamps; // Query by workspace // Adds created_at and updated_at columns
	}

	/**
	 * Extend user table with balance and membership fields
	 * Adds support for user-level balance and membership tier management
	 */
	async extendUserTable({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table.user, [
			// User balance in CNY (default: 0.0)
			column('balance').double.notNull.default(0.0),
			// Membership tier: 'free', 'basic', 'pro', 'enterprise'
			column('membership_tier')
				.varchar(20)
				.notNull.default("'free'"),
			// Membership expiration date (NULL for 'free' tier)
			column('membership_expire_at').timestampTimezone(3),
		]);
	}

	/**
	 * Extend project table with billing_mode field
	 * Supports different billing modes: 'executor' (usage-based), 'subscription' (fixed price)
	 */
	async extendProjectTable({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table.project, [
			// Billing mode: 'executor' (pay-per-use), 'subscription' (fixed monthly)
			column('billing_mode')
				.varchar(20)
				.notNull.default("'executor'"),
		]);
	}

	/**
	 * Extend usage_record table with balance_source field
	 * Tracks whether usage was charged to user balance or workspace balance
	 */
	async extendUsageRecordTable({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table.usageRecord, [
			// Balance source: 'user' (charged to user), 'workspace' (charged to workspace)
			column('balance_source')
				.varchar(20)
				.notNull.default("'user'"),
		]);
	}

	/**
	 * Update existing projects with default billing_mode='executor' for personal workspaces
	 */
	async updateExistingProjects({ escape, runQuery, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Updating existing personal workspaces with billing_mode=executor');

		await runQuery(
			`UPDATE ${t.project} SET ${c.billingMode} = :billingMode WHERE ${c.type} = :type`,
			{
				billingMode: 'executor',
				type: 'personal',
			},
		);

		logger.info('Updated existing personal workspaces with billing_mode=executor');
	}

	/**
	 * Create indexes for performance optimization
	 */
	async createIndexes({ schemaBuilder: { createIndex } }: MigrationContext) {
		// User table indexes
		await createIndex(table.user, ['balance'], false, 'idx_user_balance');
		await createIndex(table.user, ['membership_tier'], false, 'idx_user_membership');

		// Project table indexes
		await createIndex(table.project, ['billing_mode'], false, 'idx_project_billing_mode');

		// Balance transfer record indexes (already created with withIndexOn)
		// Additional composite indexes could be added here if needed
	}

	/**
	 * Execute the forward migration
	 */
	async up(context: MigrationContext) {
		const { logger } = context;

		logger.info('Starting CreateUserAuthInitTables migration (up)');

		// Step 1: Create platform_admin table
		logger.info('Creating platform_admin table');
		await this.createPlatformAdminTable(context);

		// Step 2: Create system_config table
		logger.info('Creating system_config table');
		await this.createSystemConfigTable(context);

		// Step 3: Initialize system_config table
		await this.initializeSystemConfig(context);

		// Step 4: Create balance_transfer_record table
		logger.info('Creating balance_transfer_record table');
		await this.createBalanceTransferRecordTable(context);

		// Step 5: Extend user table
		logger.info('Extending user table with balance and membership fields');
		await this.extendUserTable(context);

		// Step 6: Extend project table
		logger.info('Extending project table with billing_mode field');
		await this.extendProjectTable(context);

		// Step 7: Extend usage_record table
		logger.info('Extending usage_record table with balance_source field');
		await this.extendUsageRecordTable(context);

		// Step 8: Update existing projects
		await this.updateExistingProjects(context);

		// Step 9: Create indexes
		logger.info('Creating indexes for performance optimization');
		await this.createIndexes(context);

		logger.info('CreateUserAuthInitTables migration (up) completed successfully');
	}

	/**
	 * Rollback the migration
	 */
	async down({ logger, schemaBuilder: { dropTable, dropColumns, dropIndex } }: MigrationContext) {
		logger.info('Starting CreateUserAuthInitTables migration rollback (down)');

		// Step 1: Drop indexes
		logger.info('Dropping indexes');
		await dropIndex(table.user, ['balance'], { customIndexName: 'idx_user_balance' });
		await dropIndex(table.user, ['membership_tier'], { customIndexName: 'idx_user_membership' });
		await dropIndex(table.project, ['billing_mode'], {
			customIndexName: 'idx_project_billing_mode',
		});

		// Step 2: Drop columns from extended tables
		logger.info('Dropping balance_source column from usage_record table');
		await dropColumns(table.usageRecord, ['balance_source']);

		logger.info('Dropping billing_mode column from project table');
		await dropColumns(table.project, ['billing_mode']);

		logger.info('Dropping balance and membership columns from user table');
		await dropColumns(table.user, ['balance', 'membership_tier', 'membership_expire_at']);

		// Step 3: Drop new tables (in reverse order of foreign key dependencies)
		logger.info('Dropping balance_transfer_record table');
		await dropTable(table.balanceTransferRecord);

		logger.info('Dropping system_config table');
		await dropTable(table.systemConfig);

		logger.info('Dropping platform_admin table');
		await dropTable(table.platformAdmin);

		logger.info('CreateUserAuthInitTables migration rollback (down) completed successfully');
	}
}
