import { Column, Entity, Index, ManyToOne, OneToMany } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { CredentialsEntity } from './credentials-entity';
import type { ProjectRelation } from './project-relation';
import { Team } from './team';
import type { Variables } from './variables';
import { WorkflowEntity } from './workflow-entity';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 36 })
	type: 'personal' | 'team';

	@Column({ type: 'json', nullable: true })
	icon: { type: 'emoji' | 'icon'; value: string } | null;

	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

	@OneToMany('ProjectRelation', 'project')
	projectRelations: ProjectRelation[];

	@OneToMany('Variables', 'project')
	variables: Variables[];

	/**
	 * Exclusive mode: Workflows belong directly to projects
	 */
	@OneToMany(
		() => WorkflowEntity,
		(workflow) => workflow.project,
	)
	workflows: WorkflowEntity[];

	/**
	 * Exclusive mode: Credentials belong directly to projects
	 */
	@OneToMany(
		() => CredentialsEntity,
		(credential) => credential.project,
	)
	credentials: CredentialsEntity[];

	// === 多租户字段 ===

	/** 关联团队（team项目才有） */
	@ManyToOne(() => Team, { nullable: true, onDelete: 'CASCADE' })
	team: Team | null;

	/** 关联团队 ID */
	@Column({ type: 'varchar', length: 36, nullable: true })
	@Index()
	teamId: string | null;

	/** 是否为用户的默认项目 */
	@Column({ type: 'boolean', default: false })
	@Index()
	isDefault: boolean;
}
