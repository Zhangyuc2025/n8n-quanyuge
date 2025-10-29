import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * DTO for user registration in multi-tenant SaaS system.
 *
 * Simple validation rules for MVP:
 * - email: Basic email format validation
 * - password: At least 6 characters (simplified for development)
 * - username: At least 2 characters (maps to user.firstName)
 *
 * Note: We use 'username' instead of 'firstName/lastName' to make the
 * registration form more concise and user-friendly.
 */
export class RegisterRequestDto extends Z.class({
	email: z.string().trim().email('Invalid email format'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
	username: z.string().trim().min(2, 'Username must be at least 2 characters'),
}) {}
