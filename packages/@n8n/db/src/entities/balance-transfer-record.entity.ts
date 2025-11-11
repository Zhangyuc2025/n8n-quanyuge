import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { Project } from './project';
import type { User } from './user';

/**
 * 余额转账记录表
 * Balance transfer record entity for tracking transfers from user balance to workspace balance pool
 */
@Entity()
export class BalanceTransferRecord extends WithTimestampsAndStringId {
	/**
	 * 转出用户ID（个人余额）
	 * User ID who transfers the balance
	 */
	@Column({ type: 'varchar', length: 36, name: 'from_user_id' })
	@Index()
	fromUserId: string;

	/**
	 * 关联的用户
	 * Associated user
	 */
	@ManyToOne('User', {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'from_user_id' })
	fromUser: User;

	/**
	 * 转入工作空间ID（团队共享余额池）
	 * Workspace ID that receives the balance
	 */
	@Column({ type: 'varchar', length: 36, name: 'to_workspace_id' })
	@Index()
	toWorkspaceId: string;

	/**
	 * 关联的工作空间
	 * Associated workspace
	 */
	@ManyToOne('Project', {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'to_workspace_id' })
	toWorkspace: Project;

	/**
	 * 转账金额（人民币）
	 * Transfer amount in CNY
	 */
	@Column({ type: 'double', name: 'amount' })
	amount: number;
}
