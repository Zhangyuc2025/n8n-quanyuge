import { ApplicationError, jsonParse } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { DirectoryLoader } from './directory-loader';
import type { n8n } from './types';

/**
 * Loader for source files of nodes and credentials located in a package dir,
 * e.g. /nodes-base or community packages.
 */
export class PackageDirectoryLoader extends DirectoryLoader {
	packageJson: n8n.PackageJson;

	packageName: string;

	constructor(directory: string, excludeNodes: string[] = [], includeNodes: string[] = []) {
		super(directory, excludeNodes, includeNodes);

		this.packageJson = this.readJSONSync('package.json');
		this.packageName = this.packageJson.name;
		this.excludeNodes = this.extractNodeTypes(excludeNodes);
		this.includeNodes = this.extractNodeTypes(includeNodes);
	}

	private extractNodeTypes(fullNodeTypes: string[]) {
		return fullNodeTypes
			.map((fullNodeType) => fullNodeType.split('.'))
			.filter(([packageName]) => packageName === this.packageName)
			.map(([_, nodeType]) => nodeType);
	}

	override async loadAll() {
		const { n8n, version, name } = this.packageJson;
		if (!n8n) return;

		const { nodes } = n8n;

		const packageVersion = !['n8n-nodes-base', '@n8n/n8n-nodes-langchain'].includes(name)
			? version
			: undefined;

		if (Array.isArray(nodes)) {
			for (const nodePath of nodes) {
				this.loadNodeFromFile(nodePath, packageVersion);
			}
		}

		this.logger.debug(`Loaded all nodes from ${this.packageName}`, {
			nodes: nodes?.length ?? 0,
		});
	}

	private parseJSON<T>(fileString: string, filePath: string): T {
		try {
			return jsonParse<T>(fileString);
		} catch (error) {
			throw new ApplicationError('Failed to parse JSON', { extra: { filePath } });
		}
	}

	protected readJSONSync<T>(file: string): T {
		const filePath = this.resolvePath(file);
		const fileString = readFileSync(filePath, 'utf8');
		return this.parseJSON<T>(fileString, filePath);
	}

	protected async readJSON<T>(file: string): Promise<T> {
		const filePath = this.resolvePath(file);
		const fileString = await readFile(filePath, 'utf8');
		return this.parseJSON<T>(fileString, filePath);
	}
}
