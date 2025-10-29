import { Z } from 'zod-class';

import { teamMemberRoleSchema } from '../../schemas/team.schema';

export class UpdateMemberRoleDto extends Z.class({
	role: teamMemberRoleSchema.exclude(['team:owner']),
}) {}
