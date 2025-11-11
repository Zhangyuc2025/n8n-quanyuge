import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';

/**
 * Membership tier limits configuration
 */
const MEMBERSHIP_LIMITS = {
	free: {
		maxTeams: 1,
		maxMembers: 3,
	},
	basic: {
		maxTeams: 3,
		maxMembers: 10,
	},
	pro: {
		maxTeams: 10,
		maxMembers: 50,
	},
	enterprise: {
		maxTeams: Infinity,
		maxMembers: Infinity,
	},
} as const;

type MembershipTier = 'free' | 'basic' | 'pro' | 'enterprise';

@Service()
export class MembershipService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * Get the user's current membership tier
	 *
	 * @param userId - The user's ID
	 * @returns The membership tier: 'free' | 'basic' | 'pro' | 'enterprise'
	 * @throws UserError if user not found
	 */
	async getMembershipTier(userId: string): Promise<MembershipTier> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: ['id', 'membershipTier', 'membershipExpireAt'],
		});

		if (!user) {
			throw new UserError('User not found');
		}

		// Check if membership is expired
		if (user.membershipExpireAt && new Date(user.membershipExpireAt) < new Date()) {
			this.logger.debug('User membership expired', { userId, tier: user.membershipTier });
			this.eventService.emit('membership-expired', { userId, tier: user.membershipTier });
			return 'free';
		}

		return (user.membershipTier as MembershipTier) || 'free';
	}

	/**
	 * Check if the user's membership is active (not expired)
	 *
	 * @param userId - The user's ID
	 * @returns True if membership is active, false otherwise
	 * @throws UserError if user not found
	 */
	async isMembershipActive(userId: string): Promise<boolean> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: ['id', 'membershipTier', 'membershipExpireAt'],
		});

		if (!user) {
			throw new UserError('User not found');
		}

		// Free tier has no expiration
		if (!user.membershipTier || user.membershipTier === 'free') {
			return true;
		}

		// Check if membership is expired
		if (user.membershipExpireAt && new Date(user.membershipExpireAt) < new Date()) {
			return false;
		}

		return true;
	}

	/**
	 * Get the maximum number of teams a user can create based on their membership tier
	 *
	 * @param userId - The user's ID
	 * @returns The maximum number of teams allowed
	 * @throws UserError if user not found
	 */
	async getTeamCreationLimit(userId: string): Promise<number> {
		const tier = await this.getMembershipTier(userId);
		return MEMBERSHIP_LIMITS[tier].maxTeams;
	}

	/**
	 * Get the maximum number of members allowed per team based on the user's membership tier
	 *
	 * @param userId - The user's ID
	 * @returns The maximum number of members per team
	 * @throws UserError if user not found
	 */
	async getTeamMemberLimit(userId: string): Promise<number> {
		const tier = await this.getMembershipTier(userId);
		return MEMBERSHIP_LIMITS[tier].maxMembers;
	}

	/**
	 * Check if a user can create more teams based on their current team count and membership tier
	 *
	 * @param userId - The user's ID
	 * @param currentTeamCount - The number of teams the user currently owns
	 * @returns True if the user can create more teams, false otherwise
	 * @throws UserError if user not found
	 */
	async canCreateTeam(userId: string, currentTeamCount: number): Promise<boolean> {
		const maxTeams = await this.getTeamCreationLimit(userId);
		const canCreate = currentTeamCount < maxTeams;

		this.logger.debug('Checking team creation eligibility', {
			userId,
			currentTeamCount,
			maxTeams,
			canCreate,
		});

		return canCreate;
	}

	/**
	 * Upgrade a user's membership to a new tier with an expiration date
	 *
	 * @param userId - The user's ID
	 * @param newTier - The new membership tier
	 * @param expiresAt - The expiration date for the membership
	 * @throws UserError if user not found or invalid tier
	 */
	async upgradeMembership(userId: string, newTier: string, expiresAt: Date): Promise<void> {
		// Validate tier
		if (!['free', 'basic', 'pro', 'enterprise'].includes(newTier)) {
			throw new UserError(`Invalid membership tier: ${newTier}`);
		}

		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: ['id', 'membershipTier'],
		});

		if (!user) {
			throw new UserError('User not found');
		}

		const oldTier = user.membershipTier || 'free';

		// Update user membership
		await this.userRepository.save({
			id: userId,
			membershipTier: newTier,
			membershipExpireAt: expiresAt,
		});

		this.logger.info('User membership upgraded', {
			userId,
			oldTier,
			newTier,
			expiresAt,
		});

		// Emit event for tracking
		this.eventService.emit('membership-upgraded', {
			userId,
			oldTier,
			newTier,
			expiresAt,
		});
	}
}
