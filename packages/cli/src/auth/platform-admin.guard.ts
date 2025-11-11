/**
 * Platform Admin Guard
 *
 * Utility to check if the current request is from a platform administrator.
 * Platform admins are authenticated via separate JWT with userType='platform_admin'.
 */

import type { PlatformAdmin, User } from '@n8n/db';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Type guard to check if user is a PlatformAdmin
 */
export function isPlatformAdmin(user: User | PlatformAdmin): user is PlatformAdmin {
	// Check for explicit userType marker added by auth service
	// This is more reliable than checking role structure
	return 'userType' in user && (user as any).userType === 'platform_admin';
}

/**
 * Assert that the user is a platform administrator
 * @throws {ForbiddenError} if user is not a platform admin
 */
export function assertPlatformAdmin(user: User | PlatformAdmin): asserts user is PlatformAdmin {
	if (!isPlatformAdmin(user)) {
		throw new ForbiddenError('This operation requires platform administrator privileges');
	}
}
