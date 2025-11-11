import type { RegisterRequestDto, RoleChangeRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { PublicUser } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { getGlobalScopes, type AssignableGlobalRole } from '@n8n/permissions';
import type { IUserSettings } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import type { Invitation } from '@/interfaces';
import type { UserRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UrlService } from '@/services/url.service';
import { UserOnboardingService } from '@/services/user-onboarding.service';
import { UserManagementMailer } from '@/user-management/email';

import { PublicApiKeyService } from './public-api-key.service';
import { RoleService } from './role.service';
import { GlobalConfig } from '@n8n/config';

@Service()
export class UserService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly roleService: RoleService,
		private readonly globalConfig: GlobalConfig,
		private readonly passwordUtility: PasswordUtility,
		private readonly userOnboardingService: UserOnboardingService,
	) {}

	async update(userId: string, data: Partial<User>) {
		const user = await this.userRepository.findOneBy({ id: userId });

		if (user) {
			await this.userRepository.save({ ...user, ...data }, { transaction: true });
		}

		return;
	}

	getManager() {
		return this.userRepository.manager;
	}

	async updateSettings(userId: string, newSettings: Partial<IUserSettings>) {
		const user = await this.userRepository.findOneOrFail({ where: { id: userId } });

		if (user.settings) {
			Object.assign(user.settings, newSettings);
		} else {
			user.settings = newSettings;
		}

		await this.userRepository.save(user);
	}

	/**
	 * Register a new user with public signup
	 */
	async registerUser(payload: RegisterRequestDto): Promise<User> {
		const { email, password, firstName, lastName } = payload;

		// Check if user already exists
		const existingUser = await this.userRepository.findOne({ where: { email } });
		if (existingUser) {
			throw new BadRequestError('User with this email already exists');
		}

		// Hash password
		const hashedPassword = await this.passwordUtility.hash(password);

		// Create user with personal workspace
		const { user } = await this.userRepository.createUserWithProject({
			email,
			password: hashedPassword,
			firstName,
			lastName,
			role: GLOBAL_MEMBER_ROLE,
		});

		// Emit signup event
		this.eventService.emit('user-signed-up', {
			user,
			userType: 'email',
			wasDisabledLdapUser: false,
		});

		// Onboard new user (create personal workspace if not already created)
		try {
			await this.userOnboardingService.onboardNewUser(user.id);
		} catch (error) {
			this.logger.warn('Failed to onboard new user', { userId: user.id, error });
			// Don't fail the registration, just log the error
		}

		return user;
	}

	async toPublic(
		user: User,
		options?: {
			withInviteUrl?: boolean;
			inviterId?: string;
			withScopes?: boolean;
			mfaAuthenticated?: boolean;
		},
	) {
		const { password, updatedAt, authIdentities, mfaRecoveryCodes, mfaSecret, role, ...rest } =
			user;

		const providerType = authIdentities?.[0]?.providerType;

		let publicUser: PublicUser = {
			...rest,
			role: role?.slug,
			signInType: providerType ?? 'email',
			isOwner: user.role.slug === 'global:owner',
		};

		if (options?.withInviteUrl && !options?.inviterId) {
			throw new UnexpectedError('Inviter ID is required to generate invite URL');
		}

		const inviteLinksEmailOnly = this.globalConfig.userManagement.inviteLinksEmailOnly;

		if (
			!inviteLinksEmailOnly &&
			options?.withInviteUrl &&
			options?.inviterId &&
			publicUser.isPending
		) {
			publicUser = this.addInviteUrl(options.inviterId, publicUser);
		}

		// Feature flags disabled - return empty object
		publicUser.featureFlags = {};

		// TODO: resolve these directly in the frontend
		if (options?.withScopes) {
			publicUser.globalScopes = getGlobalScopes(user);
		}

		publicUser.mfaAuthenticated = options?.mfaAuthenticated ?? false;

		return publicUser;
	}

	private addInviteUrl(inviterId: string, invitee: PublicUser) {
		const url = new URL(this.urlService.getInstanceBaseUrl());
		url.pathname = '/signup';
		url.searchParams.set('inviterId', inviterId);
		url.searchParams.set('inviteeId', invitee.id);

		invitee.inviteAcceptUrl = url.toString();

		return invitee;
	}

	private async sendEmails(
		owner: User,
		toInviteUsers: { [key: string]: string },
		role: AssignableGlobalRole,
	) {
		const domain = this.urlService.getInstanceBaseUrl();

		const inviteLinksEmailOnly = this.globalConfig.userManagement.inviteLinksEmailOnly;

		return await Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				const inviteAcceptUrl = `${domain}/signup?inviterId=${owner.id}&inviteeId=${id}`;
				const invitedUser: UserRequest.InviteResponse = {
					user: {
						id,
						email,
						emailSent: false,
						role,
					},
					error: '',
				};

				try {
					const result = await this.mailer.invite({
						email,
						inviteAcceptUrl,
					});
					if (result.emailSent) {
						invitedUser.user.emailSent = true;

						this.eventService.emit('user-transactional-email-sent', {
							userId: id,
							messageType: 'New user invite',
							publicApi: false,
						});
					}

					// Only include the invite URL in the response if
					// the users configuration allows it
					// and the email was not sent (to allow manual copy-paste)
					if (!inviteLinksEmailOnly && !result.emailSent) {
						invitedUser.user.inviteAcceptUrl = inviteAcceptUrl;
					}

					this.eventService.emit('user-invited', {
						user: owner,
						targetUserId: Object.values(toInviteUsers),
						publicApi: false,
						emailSent: result.emailSent,
						inviteeRole: role, // same role for all invited users
					});
				} catch (e) {
					if (e instanceof Error) {
						this.eventService.emit('email-failed', {
							user: owner,
							messageType: 'New user invite',
							publicApi: false,
						});
						this.logger.error('Failed to send email', {
							userId: owner.id,
							inviteAcceptUrl,
							email,
						});
						invitedUser.error = e.message;
					}
				}

				return invitedUser;
			}),
		);
	}

	async inviteUsers(owner: User, invitations: Invitation[]) {
		const emails = invitations.map(({ email }) => email);

		const existingUsers = await this.userRepository.findManyByEmail(emails);

		const existUsersEmails = existingUsers.map((user) => user.email);

		const toCreateUsers = invitations.filter(({ email }) => !existUsersEmails.includes(email));

		const pendingUsersToInvite = existingUsers.filter((email) => email.isPending);

		const createdUsers = new Map<string, string>();

		this.logger.debug(
			toCreateUsers.length > 1
				? `Creating ${toCreateUsers.length} user shells...`
				: 'Creating 1 user shell...',
		);

		// Check that all roles in the invitations exist in the database
		await this.roleService.checkRolesExist(
			invitations.map(({ role }) => role),
			'global',
		);

		try {
			await this.getManager().transaction(
				async (transactionManager) =>
					await Promise.all(
						toCreateUsers.map(async ({ email, role }) => {
							const { user: savedUser } = await this.userRepository.createUserWithProject(
								{
									email,
									role: {
										slug: role,
									},
								},
								transactionManager,
							);
							createdUsers.set(email, savedUser.id);
							return savedUser;
						}),
					),
			);
		} catch (error) {
			this.logger.error('Failed to create user shells', { userShells: createdUsers });
			throw new InternalServerError('An error occurred during user creation', error);
		}

		pendingUsersToInvite.forEach(({ email, id }) => createdUsers.set(email, id));

		const usersInvited = await this.sendEmails(
			owner,
			Object.fromEntries(createdUsers),
			invitations[0].role, // same role for all invited users
		);

		return { usersInvited, usersCreated: toCreateUsers.map(({ email }) => email) };
	}

	async changeUserRole(user: User, targetUser: User, newRole: RoleChangeRequestDto) {
		// Check that new role exists
		await this.roleService.checkRolesExist([newRole.newRoleName], 'global');

		return await this.userRepository.manager.transaction(async (trx) => {
			await trx.update(User, { id: targetUser.id }, { role: { slug: newRole.newRoleName } });

			const adminDowngradedToMember =
				user.role.slug === 'global:owner' &&
				targetUser.role.slug === 'global:admin' &&
				newRole.newRoleName === 'global:member';

			if (adminDowngradedToMember) {
				await this.publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(targetUser, trx);
			}
		});
	}
}
