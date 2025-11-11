/**
 * Permission checking composable
 */

import { computed, type ComputedRef } from 'vue';
import type { PlatformAdmin } from '../types/admin.types';

export interface UsePermissionReturn {
	canManageNodes: ComputedRef<boolean>;
	canManageProviders: ComputedRef<boolean>;
	canManageWorkspaces: ComputedRef<boolean>;
	canViewStatistics: ComputedRef<boolean>;
	canManageAdmins: ComputedRef<boolean>;
	isSuperAdmin: ComputedRef<boolean>;
}

export function usePermission(admin: PlatformAdmin | null): UsePermissionReturn {
	const isSuperAdmin = computed(() => admin?.role === 'super_admin');

	// For now, all admins have full permissions
	// In the future, implement granular permission control
	const canManageNodes = computed(() => !!admin && admin.isActive);
	const canManageProviders = computed(() => !!admin && admin.isActive);
	const canManageWorkspaces = computed(() => !!admin && admin.isActive);
	const canViewStatistics = computed(() => !!admin && admin.isActive);
	const canManageAdmins = computed(() => isSuperAdmin.value);

	return {
		canManageNodes,
		canManageProviders,
		canManageWorkspaces,
		canViewStatistics,
		canManageAdmins,
		isSuperAdmin,
	};
}
