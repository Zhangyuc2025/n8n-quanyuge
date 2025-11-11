import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';

/**
 * 系统配置表
 * System configuration entity for storing platform-wide settings
 */
@Entity()
export class SystemConfig {
	/**
	 * 配置键（主键）
	 * Configuration key (primary key)
	 */
	@PrimaryColumn({ type: 'varchar', length: 100 })
	key: string;

	/**
	 * 配置值
	 * Configuration value
	 */
	@Column({ type: 'text' })
	value: string;

	/**
	 * 更新时间
	 * Last updated timestamp
	 */
	@DateTimeColumn({ name: 'updated_at' })
	updatedAt: Date;
}
