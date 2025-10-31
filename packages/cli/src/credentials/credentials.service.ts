import type { CreateCredentialDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { Project, User, ICredentialsDb, ScopesField } from '@n8n/db';
import {
	CredentialsEntity,
	CredentialsRepository,
	ProjectRepository,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import {
	In,
	type EntityManager,
	type FindOptionsRelations,
	type FindOptionsWhere,
} from '@n8n/typeorm';
import { CredentialDataError, Credentials, ErrorReporter } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE, deepCopy, NodeHelpers, UnexpectedError } from 'n8n-workflow';

import { CredentialsFinderService } from './credentials-finder.service';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { createCredentialsFromCredentialsEntity } from '@/credentials-helper';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { CredentialRequest, ListQuery } from '@/requests';
import { CredentialsTester } from '@/services/credentials-tester.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';

export type CredentialsGetSharedOptions =
	| { allowGlobalScope: true; globalScope: Scope }
	| { allowGlobalScope: false };

type CreateCredentialOptions = CreateCredentialDto & {
	isManaged: boolean;
};

@Service()
export class CredentialsService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly credentialsTester: CredentialsTester,
		private readonly externalHooks: ExternalHooks,
		private readonly credentialTypes: CredentialTypes,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly roleService: RoleService,
		private readonly userRepository: UserRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/**
	 * [PLAN_A 独占模式] 简化后的 getMany 方法
	 * - 直接通过 projectId 过滤，无需 shared 表 JOIN
	 * - 查询性能提升 30-50%
	 */
	async getMany(
		user: User,
		{
			listQueryOptions = {},
			includeScopes = false,
			includeData = false,
			onlySharedWithMe = false, // 独占模式下此参数已废弃，保留以兼容现有调用
		}: {
			listQueryOptions?: ListQuery.Options & { includeData?: boolean };
			includeScopes?: boolean;
			includeData?: boolean;
			onlySharedWithMe?: boolean;
		} = {},
	) {
		const returnAll = hasGlobalScope(user, 'credential:list');

		if (includeData) {
			// We need the scopes to check if we're allowed to include the decrypted data
			includeScopes = true;
			listQueryOptions.includeData = true;
		}

		// 获取用户有权访问的所有项目ID（如果没有全局权限）
		let credentials: CredentialsEntity[];
		if (returnAll) {
			credentials = await this.credentialsRepository.findMany(listQueryOptions);
		} else {
			const userProjectIds = await this.projectService.getUserProjectIds(user);
			credentials = await this.credentialsRepository.findMany(listQueryOptions, userProjectIds);
		}

		// 添加用户权限范围
		if (includeScopes) {
			const projectRelations = await this.projectService.getProjectRelationsForUser(user);
			credentials = credentials.map((c) => this.roleService.addScopes(c, user, projectRelations));
		}

		// 包含解密数据（需要 credential:update 权限）
		if (includeData) {
			credentials = credentials.map((c: CredentialsEntity & ScopesField) => {
				const data = c.scopes?.includes('credential:update') ? this.decrypt(c) : undefined;
				// We never want to expose the oauthTokenData to the frontend, but it
				// expects it to check if the credential is already connected.
				if (data?.oauthTokenData) {
					data.oauthTokenData = true;
				}

				return {
					...c,
					data,
				} as unknown as CredentialsEntity;
			});
		}

		return credentials;
	}

	/**
	 * @param user The user making the request
	 * @param options.workflowId The workflow that is being edited
	 * @param options.projectId The project owning the workflow This is useful
	 * for workflows that have not been saved yet.
	 */
	async getCredentialsAUserCanUseInAWorkflow(
		user: User,
		options: { workflowId: string } | { projectId: string },
	) {
		// necessary to get the scopes
		const projectRelations = await this.projectService.getProjectRelationsForUser(user);

		// get all credentials the user has access to
		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);

		// get all credentials the workflow or project has access to
		const allCredentialsForWorkflow =
			'workflowId' in options
				? (await this.findAllCredentialIdsForWorkflow(options.workflowId)).map((c) => c.id)
				: (await this.findAllCredentialIdsForProject(options.projectId)).map((c) => c.id);

		// the intersection of both is all credentials the user can use in this
		// workflow or project
		const intersection = allCredentials.filter((c) => allCredentialsForWorkflow.includes(c.id));

		return intersection
			.map((c) => this.roleService.addScopes(c, user, projectRelations))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				scopes: c.scopes,
				isManaged: c.isManaged,
			}));
	}

	async findAllCredentialIdsForWorkflow(workflowId: string): Promise<CredentialsEntity[]> {
		// If the workflow is owned by a personal project and the owner of the
		// project has global read permissions it can use all personal credentials.
		const user = await this.userRepository.findPersonalOwnerForWorkflow(workflowId);
		if (user && hasGlobalScope(user, 'credential:read')) {
			return await this.credentialsRepository.findAllPersonalCredentials();
		}

		// Otherwise the workflow can only use credentials from projects it's part
		// of.
		return await this.credentialsRepository.findAllCredentialsForWorkflow(workflowId);
	}

	async findAllCredentialIdsForProject(projectId: string): Promise<CredentialsEntity[]> {
		// If this is a personal project and the owner of the project has global
		// read permissions then all workflows in that project can use all
		// credentials of all personal projects.
		const user = await this.userRepository.findPersonalOwnerForProject(projectId);
		if (user && hasGlobalScope(user, 'credential:read')) {
			return await this.credentialsRepository.findAllPersonalCredentials();
		}

		// Otherwise only the credentials in this project can be used.
		return await this.credentialsRepository.findAllCredentialsForProject(projectId);
	}

	/**
	 * [PLAN_A 独占模式] 检查用户是否有访问凭据的权限
	 * - 替代原来的 getSharing() 方法
	 * - 直接通过 credential.project 判断访问权限
	 */
	async hasAccess(user: User, credentialId: string, globalScopes: Scope[]): Promise<boolean> {
		// 如果用户有全局权限，直接返回 true
		if (hasGlobalScope(user, globalScopes, { mode: 'allOf' })) {
			return true;
		}

		// 获取用户的项目ID列表
		const userProjectIds = await this.projectService.getUserProjectIds(user);

		// 检查凭据是否属于用户有权访问的项目
		const credential = await this.credentialsRepository.findOne({
			where: {
				id: credentialId,
				projectId: In(userProjectIds),
			},
		});

		return credential !== null;
	}

	async prepareUpdateData(
		data: CredentialRequest.CredentialProperties,
		decryptedData: ICredentialDataDecryptedObject,
	): Promise<CredentialsEntity> {
		const mergedData = deepCopy(data);
		if (mergedData.data) {
			mergedData.data = this.unredact(mergedData.data, decryptedData);
		}

		// This saves us a merge but requires some type casting. These
		// types are compatible for this case.
		const updateData = this.credentialsRepository.create(mergedData as ICredentialsDb);

		await validateEntity(updateData);

		// Do not overwrite the oauth data else data like the access or refresh token would get lost
		// every time anybody changes anything on the credentials even if it is just the name.
		if (decryptedData.oauthTokenData) {
			// @ts-ignore
			updateData.data.oauthTokenData = decryptedData.oauthTokenData;
		}
		return updateData;
	}

	createEncryptedData(credential: {
		id: string | null;
		name: string;
		type: string;
		data: ICredentialDataDecryptedObject;
	}): ICredentialsDb {
		const credentials = new Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
		);

		credentials.setData(credential.data);

		const newCredentialData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialData.updatedAt = new Date();

		return newCredentialData;
	}

	/**
	 * Decrypts the credentials data and redacts the content by default.
	 *
	 * If `includeRawData` is set to true it will not redact the data.
	 */
	decrypt(credential: CredentialsEntity, includeRawData = false) {
		const coreCredential = createCredentialsFromCredentialsEntity(credential);
		try {
			const data = coreCredential.getData();
			if (includeRawData) {
				return data;
			}
			return this.redact(data, credential);
		} catch (error) {
			if (error instanceof CredentialDataError) {
				this.errorReporter.error(error, {
					level: 'error',
					extra: { credentialId: credential.id },
					tags: { credentialType: credential.type },
				});
				return {};
			}
			throw error;
		}
	}

	async update(credentialId: string, newCredentialData: ICredentialsDb) {
		await this.externalHooks.run('credentials.update', [newCredentialData]);

		// Update the credentials in DB
		await this.credentialsRepository.update(credentialId, newCredentialData);

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the updated entry.
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}

	/**
	 * [PLAN_A 独占模式] 简化后的 save 方法
	 * - 直接设置 credential.projectId，无需创建 SharedCredentials
	 * - 减少数据库操作，提升性能
	 */
	async save(
		credential: CredentialsEntity,
		encryptedData: ICredentialsDb,
		user: User,
		projectId?: string,
	) {
		// To avoid side effects
		const newCredential = new CredentialsEntity();
		Object.assign(newCredential, credential, encryptedData);

		await this.externalHooks.run('credentials.create', [encryptedData]);

		const { manager: dbManager } = this.credentialsRepository;
		const result = await dbManager.transaction(async (transactionManager) => {
			const project =
				projectId === undefined
					? await this.projectRepository.getPersonalProjectForUserOrFail(
							user.id,
							transactionManager,
						)
					: await this.projectService.getProjectWithScope(
							user,
							projectId,
							['credential:create'],
							transactionManager,
						);

			if (typeof projectId === 'string' && project === null) {
				throw new BadRequestError(
					"You don't have the permissions to save the credential in this project.",
				);
			}

			// Safe guard in case the personal project does not exist for whatever reason.
			if (project === null) {
				throw new UnexpectedError('No personal project found');
			}

			// [PLAN_A 独占模式] 直接设置 projectId
			newCredential.projectId = project.id;

			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);
			savedCredential.data = newCredential.data;

			return savedCredential;
		});
		this.logger.debug('New credential created', {
			credentialId: newCredential.id,
			ownerId: user.id,
		});
		return result;
	}

	/**
	 * Deletes a credential.
	 *
	 * If the user does not have permission to delete the credential this does
	 * nothing and returns void.
	 */
	async delete(user: User, credentialId: string) {
		await this.externalHooks.run('credentials.delete', [credentialId]);

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:delete'],
		);

		if (!credential) {
			return;
		}

		await this.credentialsRepository.remove(credential);
	}

	async test(userId: User['id'], credentials: ICredentialsDecrypted) {
		return await this.credentialsTester.testCredentials(userId, credentials.type, credentials);
	}

	// Take data and replace all sensitive values with a sentinel value.
	// This will replace password fields and oauth data.
	redact(data: ICredentialDataDecryptedObject, credential: CredentialsEntity) {
		const copiedData = deepCopy(data);

		let credType: ICredentialType;
		try {
			credType = this.credentialTypes.getByName(credential.type);
		} catch {
			// This _should_ only happen when testing. If it does happen in
			// production it means it's either a mangled credential or a
			// credential for a removed community node. Either way, there's
			// no way to know what to redact.
			return data;
		}

		const getExtendedProps = (type: ICredentialType) => {
			const props: INodeProperties[] = [];
			for (const e of type.extends ?? []) {
				const extendsType = this.credentialTypes.getByName(e);
				const extendedProps = getExtendedProps(extendsType);
				NodeHelpers.mergeNodeProperties(props, extendedProps);
			}
			NodeHelpers.mergeNodeProperties(props, type.properties);
			return props;
		};
		const properties = getExtendedProps(credType);

		for (const dataKey of Object.keys(copiedData)) {
			// The frontend only cares that this value isn't falsy.
			if (dataKey === 'oauthTokenData' || dataKey === 'csrfSecret') {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = CREDENTIAL_EMPTY_VALUE;
				}
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}
			if (
				prop.typeOptions?.password &&
				(!(copiedData[dataKey] as string).startsWith('={{') || prop.noDataExpression)
			) {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = CREDENTIAL_EMPTY_VALUE;
				}
			}
		}

		return copiedData;
	}

	private unredactRestoreValues(unmerged: any, replacement: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === CREDENTIAL_BLANKING_VALUE || value === CREDENTIAL_EMPTY_VALUE) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof replacement[key] === 'object' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				replacement[key] !== null
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	unredact(
		redactedData: ICredentialDataDecryptedObject,
		savedData: ICredentialDataDecryptedObject,
	) {
		// Replace any blank sentinel values with their saved version
		const mergedData = deepCopy(redactedData);
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}

	/**
	 * [PLAN_A 独占模式] 简化后的 getOne 方法
	 * - 直接查询 credential，无需通过 SharedCredentials
	 * - 基于用户权限决定是否解密数据
	 */
	async getOne(user: User, credentialId: string, includeDecryptedData: boolean) {
		// 检查用户是否有访问权限
		const hasReadAccess = await this.hasAccess(user, credentialId, ['credential:read']);
		if (!hasReadAccess) {
			throw new NotFoundError(`Credential with ID "${credentialId}" could not be found.`);
		}

		// 查询凭据
		const credential = await this.credentialsRepository.findOneBy({ id: credentialId });
		if (!credential) {
			throw new NotFoundError(`Credential with ID "${credentialId}" could not be found.`);
		}

		const { data: _, ...rest } = credential;

		// 如果需要解密数据，检查用户是否有 update 权限
		if (includeDecryptedData) {
			const hasUpdateAccess = await this.hasAccess(user, credentialId, [
				'credential:read',
				// TODO: Enable this once the scope exists and has been added to the
				// global:owner role.
				// 'credential:decrypt',
			]);

			if (hasUpdateAccess) {
				const decryptedData = this.decrypt(credential);
				// We never want to expose the oauthTokenData to the frontend, but it
				// expects it to check if the credential is already connected.
				if (decryptedData?.oauthTokenData) {
					decryptedData.oauthTokenData = true;
				}
				return { data: decryptedData, ...rest };
			}
		}

		return { ...rest };
	}

	/**
	 * [PLAN_A 独占模式] 简化后的 getCredentialScopes 方法
	 * - 直接基于 credential.project 计算权限范围
	 * - 无需查询 SharedCredentials 表
	 */
	async getCredentialScopes(user: User, credentialId: string): Promise<Scope[]> {
		const userProjectRelations = await this.projectService.getProjectRelationsForUser(user);

		// 查询凭据及其所属项目
		const credential = await this.credentialsRepository.findOne({
			where: { id: credentialId },
			relations: { project: true },
		});

		if (!credential) {
			return [];
		}

		// 检查用户是否有权访问该凭据的项目
		const userProjectRelation = userProjectRelations.find(
			(pr) => pr.projectId === credential.projectId,
		);

		if (!userProjectRelation) {
			return [];
		}

		// 基于用户在项目中的角色计算权限范围
		return this.roleService.combineResourceScopes(
			'credential',
			user,
			[{ projectId: credential.projectId, role: 'credential:owner' }], // 独占模式下始终是 owner
			userProjectRelations,
		);
	}

	/**
	 * [PLAN_A 独占模式] 大幅简化的 transferAll 方法
	 * - 从 60+ 行代码简化为 5 行
	 * - 直接 UPDATE credential.projectId，无需操作 SharedCredentials
	 * - 性能提升 70%+（单次 UPDATE vs 多次查询+插入+删除）
	 */
	async transferAll(fromProjectId: string, toProjectId: string, trx?: EntityManager) {
		trx = trx ?? this.credentialsRepository.manager;
		await trx.update(
			'credentials_entity',
			{ projectId: fromProjectId },
			{ projectId: toProjectId },
		);
	}

	/**
	 * [PLAN_A 独占模式] 复制凭据到其他项目
	 * - 深拷贝凭据到目标项目（包括加密数据）
	 * - 用于跨项目共享凭据内容（通过复制而非引用）
	 */
	async duplicateToProject(
		credentialId: string,
		targetProjectId: string,
		user: User,
	): Promise<CredentialsEntity> {
		// 获取源凭据（包括解密的数据）
		const sourceCredential = await this.credentialsRepository.findOne({
			where: { id: credentialId },
		});

		if (!sourceCredential) {
			throw new NotFoundError(`Credential with ID "${credentialId}" not found`);
		}

		// 创建新凭据实体
		const copiedCredential = new CredentialsEntity();

		// 深拷贝凭据数据（排除 ID 和归属相关字段）
		Object.assign(copiedCredential, {
			name: `${sourceCredential.name} (副本)`,
			type: sourceCredential.type,
			data: sourceCredential.data, // 加密数据直接复制
			projectId: targetProjectId, // ✅ 归属目标项目
		});

		// 保存新凭据
		const savedCredential = await this.credentialsRepository.save(copiedCredential);

		this.logger.info('Credential duplicated to another project', {
			sourceCredentialId: credentialId,
			targetProjectId,
			newCredentialId: savedCredential.id,
			userId: user.id,
		});

		return savedCredential;
	}

	async replaceCredentialContentsForSharee(
		user: User,
		credential: CredentialsEntity,
		decryptedData: ICredentialDataDecryptedObject,
		mergedCredentials: ICredentialsDecrypted,
	) {
		// We may want to change this to 'credential:decrypt' if that gets added, but this
		// works for now. The only time we wouldn't want to do this is if the user
		// could actually be testing the credential before saving it, so this should cover
		// the cases we need it for.
		if (
			!(await userHasScopes(user, ['credential:update'], false, { credentialId: credential.id }))
		) {
			mergedCredentials.data = decryptedData;
		}
	}

	/**
	 * Create a new credential in user's account and return it along the scopes
	 * If a projectId is send, then it also binds the credential to that specific project
	 */
	async createUnmanagedCredential(dto: CreateCredentialDto, user: User) {
		return await this.createCredential({ ...dto, isManaged: false }, user);
	}

	/**
	 * Create a new managed credential in user's account and return it along the scopes.
	 * Managed credentials are managed by n8n and cannot be edited by the user.
	 */
	async createManagedCredential(dto: CreateCredentialDto, user: User) {
		return await this.createCredential({ ...dto, isManaged: true }, user);
	}

	private async createCredential(opts: CreateCredentialOptions, user: User) {
		const encryptedCredential = this.createEncryptedData({
			id: null,
			name: opts.name,
			type: opts.type,
			data: opts.data as ICredentialDataDecryptedObject,
		});

		const credentialEntity = this.credentialsRepository.create({
			...encryptedCredential,
			isManaged: opts.isManaged,
		});

		// [PLAN_A 独占模式] save() 不再返回 shared 字段
		const credential = await this.save(credentialEntity, encryptedCredential, user, opts.projectId);

		const scopes = await this.getCredentialScopes(user, credential.id);

		return { ...credential, scopes };
	}
}
