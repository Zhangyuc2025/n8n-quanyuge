import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Team } from './team';
import { User } from './user';

/**
 * 团队成员实体
 *
 * 多租户架构中的团队成员关系，管理用户在团队中的角色和权限
 * 角色层级：owner > admin > member > viewer
 */
@Entity()
@Index(['teamId'])
@Index(['userId'])
export class TeamMember extends WithTimestampsAndStringId {
	/** 所属团队 */
	@ManyToOne(() => Team, { onDelete: 'CASCADE' })
	team: Team;

	/** 所属团队 ID */
	@Column({ type: 'varchar', length: 36 })
	teamId: string;

	/** 团队成员用户 */
	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	user: User;

	/** 团队成员用户 ID */
	@Column({ type: 'varchar', length: 36 })
	userId: string;

	/** 团队角色 */
	@Column({
		type: 'varchar',
		length: 50,
		default: 'team:member',
	})
	role: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer';

	/** 加入时间 */
	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	joinedAt: Date;
}
