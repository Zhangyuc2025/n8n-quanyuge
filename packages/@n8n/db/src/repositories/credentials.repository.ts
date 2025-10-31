import { Service } from '@n8n/di';
import { DataSource, In, Repository, Like } from '@n8n/typeorm';
import type { FindManyOptions } from '@n8n/typeorm';

import { CredentialsEntity } from '../entities';
import type { User } from '../entities';
import type { ListQuery } from '../entities/types-db';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(CredentialsEntity, dataSource.manager);
	}

	async findStartingWith(credentialName: string) {
		return await this.find({
			select: ['name'],
			where: { name: Like(`${credentialName}%`) },
		});
	}

	async findMany(
		listQueryOptions?: ListQuery.Options & { includeData?: boolean; user?: User },
		credentialIds?: string[],
	) {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		return await this.find(findManyOptions);
	}

	/**
	 * [PLAN_A 独占模式] 重构后的查询选项生成
	 * - 使用 project 关系替代已删除的 shared 关系
	 */
	private toFindManyOptions(listQueryOptions?: ListQuery.Options & { includeData?: boolean }) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const defaultRelations = ['project', 'project.projectRelations'];
		const defaultSelect: Select = ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'];

		if (!listQueryOptions) return { select: defaultSelect, relations: defaultRelations };

		const { filter, select, take, skip } = listQueryOptions;

		if (typeof filter?.name === 'string' && filter?.name !== '') {
			filter.name = Like(`%${filter.name}%`);
		}

		if (typeof filter?.type === 'string' && filter?.type !== '') {
			filter.type = Like(`%${filter.type}%`);
		}

		this.handleSharedFilters(listQueryOptions);

		if (filter) findManyOptions.where = filter;
		if (select) findManyOptions.select = select;
		if (take) findManyOptions.take = take;
		if (skip) findManyOptions.skip = skip;

		if (take && select && !select?.id) {
			findManyOptions.select = { ...findManyOptions.select, id: true }; // pagination requires id
		}

		if (!findManyOptions.select) {
			findManyOptions.select = defaultSelect;
			findManyOptions.relations = defaultRelations;
		}

		if (listQueryOptions.includeData) {
			if (Array.isArray(findManyOptions.select)) {
				findManyOptions.select.push('data');
			} else {
				findManyOptions.select.data = true;
			}
		}

		return findManyOptions;
	}

	/**
	 * [PLAN_A 独占模式] 重构后的过滤器处理
	 * - 使用 project 关系替代 shared 关系
	 * - 直接使用 credential.projectId 字段
	 */
	private handleSharedFilters(
		listQueryOptions?: ListQuery.Options & { includeData?: boolean },
	): void {
		if (!listQueryOptions?.filter) return;

		const { filter } = listQueryOptions;

		// 独占模式：直接使用 projectId 字段，不需要通过 shared 关系
		if (typeof filter.projectId === 'string' && filter.projectId !== '') {
			// projectId 已经在 filter 中，不需要额外处理
			// 保留 filter.projectId，TypeORM 会直接查询 credential.projectId 字段
		}

		// 独占模式：withRole 参数已废弃（不再有 shared.role）
		// 角色信息现在在 ProjectRelation 中
		if (typeof filter.withRole === 'string' && filter.withRole !== '') {
			// 保留以兼容旧代码，但实际不使用
			filter.project = {
				...(filter?.project ? filter.project : {}),
				projectRelations: {
					role: filter.withRole,
				},
			};
			delete filter.withRole;
		}

		// 独占模式：通过 project.projectRelations 过滤用户
		if (
			filter.user &&
			typeof filter.user === 'object' &&
			'id' in filter.user &&
			typeof filter.user.id === 'string'
		) {
			// TypeORM 嵌套过滤
			filter.project = {
				...(filter?.project ? filter.project : {}),
				projectRelations: {
					// @ts-expect-error
					...(filter?.project?.projectRelations ? filter.project.projectRelations : {}),
					userId: filter.user.id,
				},
			};
			delete filter.user;
		}
	}

	async getManyByIds(ids: string[], { withSharings } = { withSharings: false }) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = { where: { id: In(ids) } };

		// Exclusive mode: Load project relation if requested
		if (withSharings) {
			findManyOptions.relations = {
				project: {
					projectRelations: true,
				},
			};
		}

		return await this.find(findManyOptions);
	}

	/**
	 * Find all credentials that are owned by a personal project.
	 */
	async findAllPersonalCredentials(): Promise<CredentialsEntity[]> {
		// Exclusive mode: Query by project type directly
		return await this.find({
			where: {
				project: {
					type: 'personal',
				},
			},
		});
	}

	/**
	 * Find all credentials that are part of any project that the workflow is
	 * part of.
	 *
	 * This is useful to for finding credentials that can be used in the
	 * workflow.
	 */
	async findAllCredentialsForWorkflow(workflowId: string): Promise<CredentialsEntity[]> {
		// Exclusive mode: Workflow belongs to one project, find credentials in the same project
		return await this.createQueryBuilder('credentials')
			.innerJoin('credentials.project', 'project')
			.innerJoin('project.workflows', 'workflow')
			.where('workflow.id = :workflowId', { workflowId })
			.getMany();
	}

	/**
	 * Find all credentials that are part of that project.
	 *
	 * This is useful for finding credentials that can be used in workflows that
	 * are part of this project.
	 */
	async findAllCredentialsForProject(projectId: string): Promise<CredentialsEntity[]> {
		// Exclusive mode: Query by projectId directly
		return await this.findBy({ projectId });
	}
}
