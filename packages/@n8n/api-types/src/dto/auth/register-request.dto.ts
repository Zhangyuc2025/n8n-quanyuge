import { z } from 'zod';
import { Z } from 'zod-class';

export class RegisterRequestDto extends Z.class({
	email: z.string().email().trim().toLowerCase(),
	password: z.string().min(8),
	firstName: z.string().trim().min(1).max(32),
	lastName: z.string().trim().min(1).max(32),
}) {}
