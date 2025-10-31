import {
	Column,
	Entity,
	Index,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
} from '@n8n/typeorm';
import { Length } from 'class-validator';
import { IConnections, IDataObject, IWorkflowSettings, WorkflowFEMeta } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { JsonColumn, WithTimestampsAndStringId, dbType } from './abstract-entity';
import { type Folder } from './folder';
import { Project } from './project';
import type { TagEntity } from './tag-entity';
import type { TestRun } from './test-run.ee';
import type { ISimplifiedPinData, IWorkflowDb } from './types-db';
import type { WorkflowStatistics } from './workflow-statistics';
import type { WorkflowTagMapping } from './workflow-tag-mapping';
import { objectRetriever, sqlite } from '../utils/transformers';

@Entity()
export class WorkflowEntity extends WithTimestampsAndStringId implements IWorkflowDb {
	// TODO: Add XSS check
	@Index({ unique: true })
	@Length(1, 128, {
		message: 'Workflow name must be $constraint1 to $constraint2 characters long.',
	})
	@Column({ length: 128 })
	name: string;

	@Column()
	active: boolean;

	/**
	 * Indicates whether the workflow has been soft-deleted (`true`) or not (`false`).
	 *
	 * Archived workflows can be restored (unarchived) or deleted permanently,
	 * and they can still be executed as sub workflow executions, but they
	 * cannot be activated or modified.
	 */
	@Column({ default: false })
	isArchived: boolean;

	@JsonColumn()
	nodes: INode[];

	@JsonColumn()
	connections: IConnections;

	@JsonColumn({ nullable: true })
	settings?: IWorkflowSettings;

	@JsonColumn({
		nullable: true,
		transformer: objectRetriever,
	})
	staticData?: IDataObject;

	@JsonColumn({
		nullable: true,
		transformer: objectRetriever,
	})
	meta?: WorkflowFEMeta;

	@ManyToMany('TagEntity', 'workflows')
	@JoinTable({
		name: 'workflows_tags', // table name for the junction table of this relation
		joinColumn: {
			name: 'workflowId',
			referencedColumnName: 'id',
		},
		inverseJoinColumn: {
			name: 'tagId',
			referencedColumnName: 'id',
		},
	})
	tags?: TagEntity[];

	@OneToMany('WorkflowTagMapping', 'workflows')
	tagMappings: WorkflowTagMapping[];

	@OneToMany('WorkflowStatistics', 'workflow')
	@JoinColumn({ referencedColumnName: 'workflow' })
	statistics: WorkflowStatistics[];

	@Column({
		type: dbType === 'sqlite' ? 'text' : 'json',
		nullable: true,
		transformer: sqlite.jsonColumn,
	})
	pinData?: ISimplifiedPinData;

	@Column({ length: 36 })
	versionId: string;

	@Column({ default: 1 })
	versionCounter: number;

	@Column({ default: 0 })
	triggerCount: number;

	/**
	 * Exclusive mode: Each workflow belongs to exactly one project
	 */
	@ManyToOne(
		() => Project,
		(project) => project.workflows,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column({ type: 'varchar', length: 36 })
	@Index()
	projectId: string;

	@ManyToOne('Folder', 'workflows', {
		nullable: true,
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'parentFolderId' })
	parentFolder: Folder | null;

	@OneToMany('TestRun', 'workflow')
	testRuns: TestRun[];

	// [应用市场扩展字段] 用于后续功能
	@Column({ default: false })
	isMarketplaceTemplate: boolean; // 是否为应用市场的公开模板

	@Column({ type: 'varchar', length: 36, nullable: true })
	sourceMarketplaceAppId: string | null; // 如果是从市场安装，记录来源
}
