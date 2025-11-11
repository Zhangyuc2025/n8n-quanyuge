import { z } from 'zod';
import { Z } from 'zod-class';

export class RegisterRequestDto extends Z.class({
	email: z.string().email(),
	password: z.string().min(8),
	firstName: z.string().min(1).max(32),
	lastName: z.string().min(1).max(32),
}) {}
