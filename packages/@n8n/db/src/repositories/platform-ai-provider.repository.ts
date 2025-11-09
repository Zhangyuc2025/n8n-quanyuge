import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { PlatformAIProvider } from '../entities';

/**
 * Repository for PlatformAIProvider entity
 * Handles database operations for AI service providers (OpenAI, Anthropic, Google, etc.)
 */
@Service()
export class PlatformAIProviderRepository extends Repository<PlatformAIProvider> {
	constructor(dataSource: DataSource) {
		super(PlatformAIProvider, dataSource.manager);
	}

	/**
	 * Find all active AI providers
	 * @returns Array of active AI providers
	 */
	async findActive() {
		return await this.find({
			where: {
				isActive: true,
				enabled: true,
			},
		});
	}

	/**
	 * Find AI provider by provider key
	 * @param providerKey Provider key (e.g., 'openai', 'anthropic')
	 * @returns AI provider or null
	 */
	async findByProviderKey(providerKey: string) {
		return await this.findOne({
			where: { providerKey },
		});
	}

	/**
	 * Find active AI provider by provider key
	 * @param providerKey Provider key (e.g., 'openai', 'anthropic')
	 * @returns Active AI provider or null
	 */
	async findActiveByProviderKey(providerKey: string) {
		return await this.findOne({
			where: {
				providerKey,
				isActive: true,
				enabled: true,
			},
		});
	}
}
