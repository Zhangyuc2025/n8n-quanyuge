import { z } from 'zod';

export const teamNameSchema = z.string().trim().min(1).max(255);

export const teamSlugSchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(/^[a-z0-9-]+$/);

export const teamDescriptionSchema = z.string().max(1000);

export const teamIconSchema = z.object({
	type: z.enum(['emoji', 'icon']),
	value: z.string(),
});

export const teamBillingModeSchema = z.enum(['owner_pays', 'member_pays']);

export const teamStatusSchema = z.enum(['active', 'suspended', 'deleted']);

export const teamMemberRoleSchema = z.enum([
	'team:owner',
	'team:admin',
	'team:member',
	'team:viewer',
]);
