import { z } from 'zod';
import { Z } from 'zod-class';

import {
	teamNameSchema,
	teamSlugSchema,
	teamDescriptionSchema,
	teamIconSchema,
	teamBillingModeSchema,
} from '../../schemas/team.schema';

export class CreateTeamDto extends Z.class({
	name: teamNameSchema,
	slug: teamSlugSchema.optional(),
	description: teamDescriptionSchema.optional(),
	icon: teamIconSchema.optional(),
	billingMode: teamBillingModeSchema.optional(),
	maxMembers: z.number().int().min(1).max(1000).optional(),
}) {}
