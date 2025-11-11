import { PlatformAdminSetupDto, PlatformAdminLoginDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { PlatformAdmin, User } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Patch, Post, RestController, Param } from '@n8n/decorators';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';
import { PlatformAdminService } from '@/services/platform-admin.service';
import { SystemInitService } from '@/services/system-init.service';

/**
 * Platform Admin Controller
 *
 * Manages platform administrator operations including:
 * - Initial platform setup and admin creation
 * - Admin authentication and session management
 * - Platform initialization status checks
 * - Admin lifecycle management (list, deactivate)
 *
 * Security:
 * - Setup and login endpoints are public (skipAuth: true) with rate limiting
 * - Other endpoints require authentication
 * - Admin credentials are never returned in responses
 */
@RestController('/platform-admin')
export class PlatformAdminController {
	constructor(
		private readonly logger: Logger,
		private readonly platformAdminService: PlatformAdminService,
		private readonly systemInitService: SystemInitService,
		private readonly authService: AuthService,
		private readonly eventService: EventService,
	) {}

	/**
	 * POST /platform-admin/setup
	 * Initialize platform with first administrator account
	 *
	 * This endpoint handles the initial platform setup by creating the first
	 * platform administrator and marking the system as initialized. It can only
	 * be called once - subsequent attempts will be rejected with 403 Forbidden.
	 *
	 * @param req - Request object
	 * @param res - Response object
	 * @param payload - Setup data containing email, password, and admin name
	 * @returns Created admin info (excluding password) with success message
	 * @throws {BadRequestError} When input validation fails
	 * @throws {ForbiddenError} When platform is already initialized
	 */
	@Post('/setup', { skipAuth: true, rateLimit: true })
	async setup(
		req: AuthlessRequest,
		res: Response,
		@Body payload: PlatformAdminSetupDto,
	): Promise<{ success: boolean; message: string; admin: Partial<PlatformAdmin> }> {
		const { email, password, name } = payload;

		// Check if platform is already initialized
		const status = await this.systemInitService.checkInitializationStatus();
		if (status.initialized || status.hasAdmin) {
			this.logger.warn('Attempt to setup already initialized platform', {
				ip: req.ip,
				email,
			});
			throw new ForbiddenError('Platform has already been initialized');
		}

		try {
			// Create the first admin
			const admin = await this.platformAdminService.createAdmin({
				email: email.toLowerCase().trim(),
				password,
				name: name.trim(),
			});

			// Mark platform as initialized
			await this.systemInitService.markPlatformInitialized();

			this.logger.info('Platform setup completed successfully', {
				adminId: admin.id,
				email: admin.email,
			});

			// Return success without password
			const { password: _, ...adminWithoutPassword } = admin;
			return {
				success: true,
				message: 'Platform initialized successfully',
				admin: adminWithoutPassword,
			};
		} catch (error) {
			this.logger.error('Platform setup failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				email,
			});
			throw error;
		}
	}

	/**
	 * POST /platform-admin/login
	 * Authenticate platform administrator
	 *
	 * Validates admin credentials and issues a JWT token for authenticated sessions.
	 * Failed login attempts are logged for security monitoring.
	 *
	 * @param req - Request object
	 * @param res - Response object
	 * @param payload - Login credentials (email and password)
	 * @returns Admin info (excluding password) with authentication token
	 * @throws {BadRequestError} When input validation fails
	 * @throws {AuthError} When credentials are invalid
	 */
	@Post('/login', { skipAuth: true, rateLimit: true })
	async login(
		req: AuthlessRequest,
		res: Response,
		@Body payload: PlatformAdminLoginDto,
	): Promise<{ admin: Partial<PlatformAdmin> }> {
		const { email, password } = payload;

		// Validate credentials
		const admin = await this.platformAdminService.validateLogin(
			email.toLowerCase().trim(),
			password,
		);

		if (!admin) {
			this.logger.warn('Platform admin login failed', {
				email,
				ip: req.ip,
			});
			throw new AuthError('Invalid email or password');
		}

		// Issue authentication cookie for platform admin
		// Pass the platform admin object and specify userType as 'platform_admin'
		// This will be used by the auth middleware to query the correct table
		this.authService.issueCookie(
			res,
			admin,
			false, // usedMfa
			req.browserId,
			'platform_admin', // userType
		);

		// Emit login event (reusing user-logged-in event for platform admins)
		this.eventService.emit('user-logged-in', {
			user: {
				id: admin.id,
				email: admin.email,
				firstName: admin.name,
				lastName: '',
				role: {
					slug: 'platform-admin',
				},
			},
			authenticationMethod: 'email',
		});

		this.logger.info('Platform admin logged in successfully', {
			adminId: admin.id,
			email: admin.email,
		});

		// Return admin info without password
		const { password: _, ...adminWithoutPassword } = admin;
		return {
			admin: adminWithoutPassword,
		};
	}

	/**
	 * POST /platform-admin/logout
	 * Logout platform administrator
	 *
	 * Clears the admin authentication cookie and invalidates the session.
	 *
	 * @param req - Authenticated request object
	 * @param res - Response object
	 * @returns Success indicator
	 */
	@Post('/logout')
	async logout(req: AuthenticatedRequest, res: Response): Promise<{ success: boolean }> {
		await this.authService.invalidateToken(req);
		this.authService.clearCookie(res, 'platform_admin');

		this.logger.info('Platform admin logged out', {
			adminId: req.user?.id,
		});

		return { success: true };
	}

	/**
	 * GET /platform-admin/me
	 * Get current authenticated platform administrator
	 *
	 * Returns information about the currently authenticated platform administrator.
	 * This endpoint is used for authentication checks and displaying admin info in the UI.
	 *
	 * @param req - Authenticated request object
	 * @returns Current admin info (excluding password)
	 */
	@Get('/me')
	async getCurrentAdmin(req: AuthenticatedRequest): Promise<Partial<PlatformAdmin>> {
		// req.user can be either User or PlatformAdmin depending on the userType in JWT
		// For platform-admin routes, it should be a PlatformAdmin
		const admin = req.user as unknown as PlatformAdmin;

		this.logger.debug('Platform admin info retrieved', {
			adminId: admin.id,
		});

		// Return admin info without password
		const { password: _, ...adminWithoutPassword } = admin;
		return adminWithoutPassword;
	}

	/**
	 * GET /platform-admin/status
	 * Check platform initialization status
	 *
	 * This endpoint is public to allow setup wizards and initialization flows
	 * to determine what steps are required. Returns both the initialization
	 * flag and whether any administrators exist.
	 *
	 * @returns Object containing initialization and admin existence status
	 */
	@Get('/status', { skipAuth: true })
	async getStatus(): Promise<{ initialized: boolean; hasAdmin: boolean }> {
		const status = await this.systemInitService.checkInitializationStatus();

		this.logger.debug('Platform status checked', {
			initialized: status.initialized,
			hasAdmin: status.hasAdmin,
		});

		return status;
	}

	/**
	 * GET /platform-admin/list
	 * List all active platform administrators
	 *
	 * Returns a list of all active platform administrators. Passwords and other
	 * sensitive information are excluded from the response.
	 *
	 * @param req - Authenticated request object
	 * @returns Array of active platform admins (excluding passwords)
	 */
	@Get('/list')
	async listAdmins(req: AuthenticatedRequest): Promise<Array<Partial<PlatformAdmin>>> {
		// Get all active admins
		const admins = await this.platformAdminService.listAdmins();

		this.logger.debug('Platform admin list retrieved', {
			requestedBy: req.user?.id,
			count: admins.length,
		});

		// Remove passwords from response
		return admins.map((admin) => {
			const { password: _, ...adminWithoutPassword } = admin;
			return adminWithoutPassword;
		});
	}

	/**
	 * PATCH /platform-admin/:id/deactivate
	 * Deactivate a platform administrator
	 *
	 * Marks an administrator account as inactive, preventing future logins.
	 * The admin record is preserved but cannot be used for authentication.
	 *
	 * @param req - Authenticated request object
	 * @param id - Platform admin ID to deactivate
	 * @returns Success message
	 */
	@Patch('/:id/deactivate')
	async deactivateAdmin(
		req: AuthenticatedRequest,
		@Param('id') id: string,
	): Promise<{ success: boolean; message: string }> {
		if (!id || id.trim().length === 0) {
			throw new BadRequestError('Admin ID is required');
		}

		await this.platformAdminService.deactivateAdmin(id);

		this.logger.info('Platform admin deactivated', {
			deactivatedAdminId: id,
			requestedBy: req.user?.id,
		});

		return {
			success: true,
			message: 'Platform administrator deactivated successfully',
		};
	}
}
