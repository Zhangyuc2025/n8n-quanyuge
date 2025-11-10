import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '@/commands/base-command';

import { CommunityPackagesService } from './community-packages.service';
import { InstalledNodes } from './installed-nodes.entity';
import { InstalledNodesRepository } from './installed-nodes.repository';
import { InstalledPackages } from './installed-packages.entity';

const flagsSchema = z.object({
	uninstall: z.boolean().describe('Uninstalls the node').optional(),
	package: z.string().describe('Package name of the community node.').optional(),
});

@Command({
	name: 'community-node',
	description: 'Uninstall a community node',
	examples: ['--uninstall --package n8n-nodes-evolution-api'],
	flagsSchema,
})
export class CommunityNode extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags } = this;

		const packageName = flags.package;

		if (!flags) {
			this.logger.info('Please set flags. See help for more information.');
			return;
		}

		if (!flags.uninstall) {
			this.logger.info('"--uninstall" has to be set!');
			return;
		}

		if (!packageName) {
			this.logger.info('"--package" has to be set!');
			return;
		}

		await this.uninstallPackage(packageName);
	}

	async catch(error: Error) {
		this.logger.error('Error in node command:');
		this.logger.error(error.message);
	}

	async uninstallPackage(packageName: string) {
		const communityPackage = await this.findCommunityPackage(packageName);

		if (communityPackage === null) {
			this.logger.info(`Package ${packageName} not found`);
			return;
		}

		await this.removeCommunityPackage(packageName, communityPackage);

		const installedNodes = communityPackage?.installedNodes;

		if (!installedNodes) {
			this.logger.info(`Nodes in ${packageName} not found`);
			return;
		}

		for (const node of installedNodes) {
			await this.deleteCommunityNode(node);
		}

		await this.pruneDependencies();
	}

	async pruneDependencies() {
		await Container.get(CommunityPackagesService).executeNpmCommand('npm prune');
	}

	async deleteCommunityNode(node: InstalledNodes) {
		return await Container.get(InstalledNodesRepository).delete({
			type: node.type,
		});
	}

	async removeCommunityPackage(packageName: string, communityPackage: InstalledPackages) {
		return await Container.get(CommunityPackagesService).removePackage(
			packageName,
			communityPackage,
		);
	}

	async findCommunityPackage(packageName: string) {
		return await Container.get(CommunityPackagesService).findInstalledPackage(packageName);
	}
}
