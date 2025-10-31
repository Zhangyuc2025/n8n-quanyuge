import type { CredentialsEntity, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type EntityManager } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TransferCredentialError } from '@/errors/response-errors/transfer-credential.error';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

import { CredentialsFinderService } from './credentials-finder.service';
import { CredentialsService } from './credentials.service';

/**
 * [PLAN_A 独占模式] Enterprise Credentials Service
 * - 移除了 SharedCredentialsRepository 依赖
 * - shareWithProjects() 已废弃（独占模式不支持跨项目共享）
 */
@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/**
	 * [PLAN_A 独占模式] 已废弃 - 凭据不支持跨项目共享
	 */
	async shareWithProjects(
		_user: User,
		_credentialId: string,
		_shareWithIds: string[],
		_entityManager?: EntityManager,
	) {
		throw new BadRequestError(
			'Credential sharing across projects is not supported in exclusive mode. ' +
				'To share access to a credential, add users as members of the project that owns the credential.',
		);
	}

	async getOne(user: User, credentialId: string, includeDecryptedData: boolean) {
		let credential: CredentialsEntity | null = null;
		let decryptedData: ICredentialDataDecryptedObject | null = null;

		credential = includeDecryptedData
			? // Try to get the credential with `credential:update` scope, which
				// are required for decrypting the data.
				await this.credentialsFinderService.findCredentialForUser(
					credentialId,
					user,
					// TODO: replace credential:update with credential:decrypt once it lands
					// see: https://n8nio.slack.com/archives/C062YRE7EG4/p1708531433206069?thread_ts=1708525972.054149&cid=C062YRE7EG4
					['credential:read', 'credential:update'],
				)
			: null;

		if (credential) {
			// Decrypt the data if we found the credential with the `credential:update`
			// scope.
			decryptedData = this.credentialsService.decrypt(credential);
		} else {
			// Otherwise try to find them with only the `credential:read` scope. In
			// that case we return them without the decrypted data.
			credential = await this.credentialsFinderService.findCredentialForUser(credentialId, user, [
				'credential:read',
			]);
		}

		if (!credential) {
			throw new NotFoundError(
				'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
			);
		}

		credential = this.ownershipService.addOwnedByAndSharedWith(credential);

		const { data: _, ...rest } = credential;

		if (decryptedData) {
			// We never want to expose the oauthTokenData to the frontend, but it
			// expects it to check if the credential is already connected.
			if (decryptedData?.oauthTokenData) {
				decryptedData.oauthTokenData = true;
			}
			return { data: decryptedData, ...rest };
		}

		return { ...rest };
	}

	/**
	 * [PLAN_A 独占模式] 简化后的 transferOne
	 * - 直接更新 credential.projectId
	 * - 无需操作 SharedCredentials 表
	 */
	async transferOne(user: User, credentialId: string, destinationProjectId: string) {
		// 1. get credential
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:move'],
		);
		NotFoundError.isDefinedAndNotNull(
			credential,
			`Could not find the credential with the id "${credentialId}". Make sure you have the permission to move it.`,
		);

		// 2. get destination project
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['credential:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create credentials in it.`,
		);

		// 3. checks
		if (credential.projectId === destinationProject.id) {
			throw new TransferCredentialError(
				"You can't transfer a credential into the project that's already owning it.",
			);
		}

		// 4. [PLAN_A 独占模式] 直接更新 projectId
		await this.credentialsRepository.update(credential.id, {
			projectId: destinationProject.id,
		});
	}
}
