import { z } from 'zod';
import { Z } from 'zod-class';

import { teamMemberRoleSchema } from '../../schemas/team.schema';

export class AddMembersToTeamDto extends Z.class({
	userIds: z.array(z.string().uuid()).min(1).max(100),
	role: teamMemberRoleSchema.exclude(['team:owner']).optional(),
}) {}

export class AddMemberToTeamDto extends Z.class({
	userId: z.string().uuid(),
	role: teamMemberRoleSchema.exclude(['team:owner']).optional(),
}) {}
