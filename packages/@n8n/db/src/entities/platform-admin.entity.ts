import { Column, Entity, Index } from '@n8n/typeorm';

import { WithTimestampsAndStringId, DateTimeColumn } from './abstract-entity';

/**
 * 平台管理员表
 * Platform administrator entity for managing platform-level operations and configurations
 */
@Entity()
export class PlatformAdmin extends WithTimestampsAndStringId {
	/**
	 * 邮箱（唯一）
	 * Email address (unique)
	 */
	@Column({ type: 'varchar', length: 255, unique: true })
	@Index()
	email: string;

	/**
	 * 密码（加密存储）
	 * Password (encrypted)
	 */
	@Column({ type: 'varchar', length: 255 })
	password: string;

	/**
	 * 管理员姓名
	 * Admin name
	 */
	@Column({ type: 'varchar', length: 100 })
	name: string;

	/**
	 * 角色：'super_admin' | 'admin'
	 * Role: 'super_admin' | 'admin'
	 */
	@Column({ type: 'varchar', length: 50, default: 'admin' })
	role: string;

	/**
	 * 是否激活
	 * Whether the admin is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive: boolean;

	/**
	 * 最后登录时间
	 * Last login timestamp
	 */
	@DateTimeColumn({ nullable: true, name: 'last_login_at' })
	lastLoginAt: Date | null;
}
