import { Column, Entity, OneToMany } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import type { Variables } from './variables';
import type { WorkflowEntity } from './workflow-entity';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 36 })
	type: 'personal' | 'team';

	/**
	 * 计费模式：'executor' | 'shared-pool'
	 * executor: 扣执行者的个人余额
	 * shared-pool: 扣工作空间共享余额池
	 * Billing mode: 'executor' | 'shared-pool'
	 * executor: Deduct from executor's personal balance
	 * shared-pool: Deduct from workspace shared balance pool
	 */
	@Column({ type: 'varchar', length: 20, default: 'executor', name: 'billing_mode' })
	billingMode: 'executor' | 'shared-pool';

	@Column({ type: 'json', nullable: true })
	icon: { type: 'emoji' | 'icon'; value: string } | null;

	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

	@OneToMany('ProjectRelation', 'project')
	projectRelations: ProjectRelation[];

	@OneToMany('WorkflowEntity', 'project')
	workflows: WorkflowEntity[];

	@OneToMany('Variables', 'project')
	variables: Variables[];
}
