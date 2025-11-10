import { PackageDirectoryLoader } from './package-directory-loader';

/**
 * This loader extends PackageDirectoryLoader to load node and credentials lazily, if possible
 */
export class LazyPackageDirectoryLoader extends PackageDirectoryLoader {
	override async loadAll() {
		try {
			this.known.nodes = await this.readJSON('dist/known/nodes.json');

			this.types.nodes = await this.readJSON('dist/types/nodes.json');

			if (this.removeNonIncludedNodes) {
				const allowedNodes: typeof this.known.nodes = {};
				for (const nodeType of this.includeNodes) {
					if (nodeType in this.known.nodes) {
						allowedNodes[nodeType] = this.known.nodes[nodeType];
					}
				}
				this.known.nodes = allowedNodes;

				this.types.nodes = this.types.nodes.filter((nodeType) =>
					this.includeNodes.includes(nodeType.name),
				);
			}

			if (this.excludeNodes.length) {
				for (const nodeType of this.excludeNodes) {
					delete this.known.nodes[nodeType];
				}

				this.types.nodes = this.types.nodes.filter(
					(nodeType) => !this.excludeNodes.includes(nodeType.name),
				);
			}

			this.logger.debug(`Lazy-loading nodes from ${this.packageJson.name}`, {
				nodes: this.types.nodes?.length ?? 0,
			});

			this.isLazyLoaded = true;

			return; // We can load nodes lazily now
		} catch {
			this.logger.debug("Can't enable lazy-loading");
			await super.loadAll();
		}
	}
}
