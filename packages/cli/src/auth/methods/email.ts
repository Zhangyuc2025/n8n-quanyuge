import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { isEmail } from 'class-validator';

import { AuthError } from '@/errors/response-errors/auth.error';
import { EventService } from '@/events/event.service';
import { isLdapLoginEnabled } from '@/ldap.ee/helpers.ee';
import { PasswordUtility } from '@/services/password.utility';

/**
 * Handle email or username login.
 *
 * Supports both email and username (firstName) for login.
 * This is the multi-tenant SaaS login entry point.
 *
 * @param emailOrUsername - Email address or username (firstName)
 * @param password - Plain text password
 * @returns User if credentials are valid, undefined otherwise
 */
export const handleEmailLogin = async (
	emailOrUsername: string,
	password: string,
): Promise<User | undefined> => {
	const userRepository = Container.get(UserRepository);

	// Try to find user by email first, then by username (firstName)
	let user: User | null = null;

	if (isEmail(emailOrUsername)) {
		// If it's an email format, search by email
		user = await userRepository.findOne({
			where: { email: emailOrUsername },
			relations: ['authIdentities', 'role'],
		});
	} else {
		// Otherwise, search by username (firstName)
		user = await userRepository.findOne({
			where: { firstName: emailOrUsername },
			relations: ['authIdentities', 'role'],
		});
	}

	if (user?.password && (await Container.get(PasswordUtility).compare(password, user.password))) {
		return user;
	}

	// At this point if the user has a LDAP ID, means it was previously an LDAP user,
	// so suggest to reset the password to gain access to the instance.
	const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
	if (user && ldapIdentity && !isLdapLoginEnabled()) {
		Container.get(EventService).emit('login-failed-due-to-ldap-disabled', { userId: user.id });

		throw new AuthError('Reset your password to gain access to the instance.');
	}

	return undefined;
};
