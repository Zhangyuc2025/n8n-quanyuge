import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { StatisticsNames } from './types-db';
import { WorkflowEntity } from './workflow-entity';

@Entity()
export class WorkflowStatistics {
	@Column()
	count: number;

	@Column()
	rootCount: number;

	@DateTimeColumn()
	latestEvent: Date;

	@PrimaryColumn({ length: 128 })
	name: StatisticsNames;

	/**
	 * [PLAN_A 独占模式] 修正反向关系名称
	 * - 从 'shared' 改为 'statistics'（WorkflowEntity 中的属性名）
	 */
	@ManyToOne('WorkflowEntity', 'statistics')
	workflow: WorkflowEntity;

	@PrimaryColumn()
	workflowId: string;
}
