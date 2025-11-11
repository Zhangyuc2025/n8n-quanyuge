import { useUsersStore } from '@/features/settings/users/users.store';
import type { RBACPermissionCheck, RolePermissionOptions } from '@/app/types/rbac';
import type { Role } from '@n8n/api-types';

export const hasRole: RBACPermissionCheck<RolePermissionOptions> = (checkRoles) => {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	if (currentUser?.role && checkRoles) {
		return checkRoles.includes(currentUser.role as Role);
	}

	return false;
};
