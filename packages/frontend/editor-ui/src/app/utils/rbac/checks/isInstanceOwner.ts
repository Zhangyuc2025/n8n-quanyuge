import { useUsersStore } from '@/features/settings/users/users.store';
import type { InstanceOwnerMiddlewareOptions, RBACPermissionCheck } from '@/app/types/rbac';

export const isInstanceOwner: RBACPermissionCheck<InstanceOwnerMiddlewareOptions> = () =>
	useUsersStore().isInstanceOwner;
