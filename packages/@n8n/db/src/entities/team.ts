import { Column, Entity, Index, ManyToOne, OneToMany } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { Project } from './project';
import type { TeamMember } from './team-member';
import { User } from './user';

/**
 * 团队实体
 *
 * 多租户架构中的团队概念，作为计费主体和成员管理的单位
 * 团队可以拥有多个项目，每个项目都属于一个特定的团队
 */
@Entity()
@Index(['ownerId'])
export class Team extends WithTimestampsAndStringId {
	/** 团队名称 */
	@Column({ length: 255 })
	name: string;

	/** 团队标识符（用于 URL 或子域名） */
	@Column({ length: 100, unique: true, nullable: true })
	slug: string | null;

	/** 团队描述 */
	@Column({ type: 'text', nullable: true })
	description: string | null;

	/** 团队图标 */
	@Column({ type: 'json', nullable: true })
	icon: { type: 'emoji' | 'icon'; value: string } | null;

	/** 团队状态 */
	@Column({
		type: 'varchar',
		length: 50,
		default: 'active',
	})
	status: 'active' | 'suspended' | 'deleted';

	/** 计费模式：owner_pays 或 member_pays */
	@Column({
		type: 'varchar',
		length: 50,
		default: 'owner_pays',
	})
	billingMode: 'owner_pays' | 'member_pays';

	/** 最大成员数量 */
	@Column({ default: 10 })
	maxMembers: number;

	/** 团队所有者 */
	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	owner: User;

	/** 团队所有者 ID */
	@Column({ type: 'varchar', length: 36 })
	ownerId: string;

	/** 团队成员关系 */
	@OneToMany('TeamMember', 'team')
	members: TeamMember[];

	/** 团队拥有的项目 */
	@OneToMany('Project', 'team')
	projects: Project[];
}
