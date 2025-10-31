import { Column, Entity, Index, ManyToOne, JoinColumn } from '@n8n/typeorm';
import { IsObject, IsString, Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import type { ICredentialsDb } from './types-db';

@Entity()
export class CredentialsEntity extends WithTimestampsAndStringId implements ICredentialsDb {
	@Column({ length: 128 })
	@IsString({ message: 'Credential `name` must be of type string.' })
	@Length(3, 128, {
		message: 'Credential name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	@Column('text')
	@IsObject()
	data: string;

	@Index()
	@IsString({ message: 'Credential `type` must be of type string.' })
	@Column({
		length: 128,
	})
	type: string;

	/**
	 * Exclusive mode: Each credential belongs to exactly one project
	 */
	@ManyToOne(
		() => Project,
		(project) => project.credentials,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column({ type: 'varchar', length: 36 })
	@Index()
	projectId: string;

	/**
	 * Whether the credential is managed by n8n. We currently use this flag
	 * to provide OpenAI free credits on cloud. Managed credentials cannot be
	 * edited by the user.
	 */
	@Column({ default: false })
	isManaged: boolean;

	// [应用市场扩展字段] 用于后续功能
	@Column({ default: false })
	isMarketplaceTemplate: boolean; // 是否为应用市场的公开模板

	@Column({ type: 'varchar', length: 36, nullable: true })
	sourceMarketplaceAppId: string | null; // 如果是从市场安装，记录来源
}
