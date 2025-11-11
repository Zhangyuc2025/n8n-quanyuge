import { z } from 'zod';
import { Z } from 'zod-class';

import { passwordSchema } from '../../schemas/password.schema';

export class PlatformAdminSetupDto extends Z.class({
	email: z.string().email(),
	password: passwordSchema,
	name: z.string().min(1, 'Administrator name is required'),
}) {}
