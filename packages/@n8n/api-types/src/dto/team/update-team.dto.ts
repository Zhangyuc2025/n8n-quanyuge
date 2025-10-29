import { z } from 'zod';
import { Z } from 'zod-class';

import {
	teamNameSchema,
	teamSlugSchema,
	teamDescriptionSchema,
	teamIconSchema,
	teamBillingModeSchema,
} from '../../schemas/team.schema';

export class UpdateTeamDto extends Z.class({
	name: teamNameSchema.optional(),
	slug: teamSlugSchema.nullable().optional(),
	description: teamDescriptionSchema.nullable().optional(),
	icon: teamIconSchema.nullable().optional(),
	billingMode: teamBillingModeSchema.optional(),
	maxMembers: z.number().int().min(1).max(1000).optional(),
}) {}
