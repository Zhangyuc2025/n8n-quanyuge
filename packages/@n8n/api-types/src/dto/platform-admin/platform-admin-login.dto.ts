import { z } from 'zod';
import { Z } from 'zod-class';

export class PlatformAdminLoginDto extends Z.class({
	email: z.string().email(),
	password: z.string().min(1, 'Password is required'),
}) {}
