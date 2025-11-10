import { isContainedWithin, Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import uniqBy from 'lodash/uniqBy';
import type {
	CodexData,
	DocumentationLink,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IVersionedNodeType,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import { ApplicationError, isExpression, isSubNodeType, UnexpectedError } from 'n8n-workflow';
import { realpathSync } from 'node:fs';
import * as path from 'path';

import { UnrecognizedNodeTypeError } from '@/errors/unrecognized-node-type.error';

import {
	commonCORSParameters,
	commonDeclarativeNodeOptionParameters,
	commonPollingParameters,
	CUSTOM_NODES_CATEGORY,
} from './constants';
import { loadClassInIsolation } from './load-class-in-isolation';

type Codex = {
	categories: string[];
	subcategories: { [subcategory: string]: string[] };
	resources: {
		primaryDocumentation: DocumentationLink[];
	};
	alias: string[];
};

export type Types = {
	nodes: INodeTypeDescription[];
};

/**
 * Base class for loading n8n nodes from a directory.
 * Handles the common functionality for resolving paths, loading classes, and managing node types.
 */
export abstract class DirectoryLoader {
	isLazyLoaded = false;

	// Another way of keeping track of the names and versions of a node. This
	// seems to only be used by the installedPackages repository
	loadedNodes: INodeTypeNameVersion[] = [];

	// Stores the loaded descriptions and sourcepaths
	nodeTypes: INodeTypeData = {};

	// Stores the location and classnames of the nodes that are
	// loaded; used to actually load the files in lazy-loading scenario.
	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	// Stores the different versions with their individual descriptions
	types: Types = { nodes: [] };

	protected readonly logger = Container.get(Logger);

	protected removeNonIncludedNodes = false;

	constructor(
		readonly directory: string,
		protected excludeNodes: string[] = [],
		protected includeNodes: string[] = [],
	) {
		// If `directory` is a symlink, we try to resolve it to its real path
		try {
			this.directory = realpathSync(directory);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (error.code !== 'ENOENT') throw error;
		}

		this.removeNonIncludedNodes = this.includeNodes.length > 0;
	}

	abstract packageName: string;

	abstract loadAll(): Promise<void>;

	reset() {
		this.unloadAll();
		this.loadedNodes = [];
		this.nodeTypes = {};
		this.known = { nodes: {}, credentials: {} };
		this.types = { nodes: [] };
	}

	protected resolvePath(file: string) {
		return path.resolve(this.directory, file);
	}

	private loadClass<T>(sourcePath: string) {
		const filePath = this.resolvePath(sourcePath);
		const [className] = path.parse(sourcePath).name.split('.');
		try {
			return loadClassInIsolation<T>(filePath, className);
		} catch (error) {
			throw error instanceof TypeError
				? new ApplicationError(
						'Class could not be found. Please check if the class is named correctly.',
						{ extra: { className } },
					)
				: error;
		}
	}

	/** Loads a nodes class from a file, fixes icons, and augments the codex */
	loadNodeFromFile(filePath: string, packageVersion?: string) {
		const tempNode = this.loadClass<INodeType | IVersionedNodeType>(filePath);
		this.addCodex(tempNode, filePath);

		const nodeType = tempNode.description.name;

		if (this.removeNonIncludedNodes && !this.includeNodes.includes(nodeType)) {
			return;
		}

		if (this.excludeNodes.includes(nodeType)) {
			return;
		}

		this.fixIconPaths(tempNode.description, filePath);

		let nodeVersion = 1;
		if ('nodeVersions' in tempNode) {
			for (const versionNode of Object.values(tempNode.nodeVersions)) {
				this.fixIconPaths(versionNode.description, filePath);
			}

			for (const version of Object.values(tempNode.nodeVersions)) {
				version.description.communityNodePackageVersion = packageVersion;
				this.addLoadOptionsMethods(version);
				this.applySpecialNodeParameters(version);
			}

			const currentVersionNode = tempNode.nodeVersions[tempNode.currentVersion];
			this.addCodex(currentVersionNode, filePath);
			nodeVersion = tempNode.currentVersion;

			if (currentVersionNode.hasOwnProperty('executeSingle')) {
				throw new ApplicationError(
					'"executeSingle" has been removed. Please update the code of this node to use "execute" instead.',
					{ extra: { nodeType } },
				);
			}
		} else {
			tempNode.description.communityNodePackageVersion = packageVersion;
			this.addLoadOptionsMethods(tempNode);
			this.applySpecialNodeParameters(tempNode);

			// Short renaming to avoid type issues
			nodeVersion = Array.isArray(tempNode.description.version)
				? tempNode.description.version.slice(-1)[0]
				: tempNode.description.version;
		}

		this.known.nodes[nodeType] = {
			className: tempNode.constructor.name,
			sourcePath: filePath,
		};

		this.nodeTypes[nodeType] = {
			type: tempNode,
			sourcePath: filePath,
		};

		this.loadedNodes.push({
			name: nodeType,
			version: nodeVersion,
		});

		this.getVersionedNodeTypeAll(tempNode).forEach(({ description }) => {
			this.types.nodes.push(description);
		});
	}

	getNode(nodeType: string) {
		const {
			nodeTypes,
			known: { nodes: knownNodes },
		} = this;
		if (!(nodeType in nodeTypes) && nodeType in knownNodes) {
			const { sourcePath } = knownNodes[nodeType];
			this.loadNodeFromFile(sourcePath);
		}

		if (nodeType in nodeTypes) {
			return nodeTypes[nodeType];
		}

		throw new UnrecognizedNodeTypeError(this.packageName, nodeType);
	}

	/**
	 * Returns an array of all versions of a node type.
	 * For non-versioned nodes, returns an array with just that node.
	 * For versioned nodes, returns all available versions.
	 */
	getVersionedNodeTypeAll(object: IVersionedNodeType | INodeType): INodeType[] {
		if ('nodeVersions' in object) {
			const nodeVersions = Object.values(object.nodeVersions).map((element) => {
				// Only overwrite if baseDescription has valid values
				// Prevents overwriting valid values with null/undefined from baseDescription
				if (object.description.name !== null && object.description.name !== undefined) {
					element.description.name = object.description.name;
				}
				if (object.description.codex !== null && object.description.codex !== undefined) {
					element.description.codex = object.description.codex;
				}
				return element;
			});
			return uniqBy(nodeVersions.reverse(), (node) => {
				const { version } = node.description;
				return Array.isArray(version) ? version.join(',') : version.toString();
			});
		}
		return [object];
	}

	/**
	 * Retrieves `categories`, `subcategories` and alias (if defined)
	 * from the codex data for the node at the given file path.
	 */
	private getCodex(filePath: string): CodexData {
		const codexFilePath = this.resolvePath(`${filePath}on`); // .js to .json

		const {
			categories,
			subcategories,
			resources: { primaryDocumentation },
			alias,
		} = module.require(codexFilePath) as Codex;

		return {
			...(categories && { categories }),
			...(subcategories && { subcategories }),
			...(alias && { alias }),
			resources: {
				primaryDocumentation,
			},
		};
	}

	/**
	 * Adds a node codex `categories` and `subcategories` (if defined)
	 * to a node description `codex` property.
	 */
	private addCodex(node: INodeType | IVersionedNodeType, filePath: string) {
		const isCustom = this.packageName === 'CUSTOM';
		try {
			let codex;

			if (!isCustom) {
				codex = node.description.codex;
			}

			if (codex === undefined) {
				codex = this.getCodex(filePath);
			}

			if (isCustom) {
				codex.categories = codex.categories
					? codex.categories.concat(CUSTOM_NODES_CATEGORY)
					: [CUSTOM_NODES_CATEGORY];
			}

			node.description.codex = codex;
		} catch {
			this.logger.debug(`No codex available for: ${node.description.name}`);

			if (isCustom) {
				node.description.codex = {
					categories: [CUSTOM_NODES_CATEGORY],
				};
			}
		}
	}

	private addLoadOptionsMethods(node: INodeType) {
		if (node?.methods?.loadOptions) {
			node.description.__loadOptionsMethods = Object.keys(node.methods.loadOptions);
		}
	}

	private applySpecialNodeParameters(nodeType: INodeType): void {
		const { properties, polling, supportsCORS } = nodeType.description;
		if (polling) {
			properties.unshift(...commonPollingParameters);
		}
		if (nodeType.webhook && supportsCORS) {
			const optionsProperty = properties.find(({ name }) => name === 'options');
			if (optionsProperty)
				optionsProperty.options = [
					...commonCORSParameters,
					...(optionsProperty.options as INodePropertyOptions[]),
				];
			else properties.push(...commonCORSParameters);
		}

		DirectoryLoader.applyDeclarativeNodeOptionParameters(nodeType);
	}

	private getIconPath(icon: string, filePath: string) {
		const iconPath = path.join(path.dirname(filePath), icon.replace('file:', ''));

		if (!isContainedWithin(this.directory, path.join(this.directory, iconPath))) {
			throw new UnexpectedError(
				`Icon path "${iconPath}" is not contained within the package directory "${this.directory}"`,
			);
		}

		return `icons/${this.packageName}/${iconPath}`;
	}

	private fixIconPaths(obj: INodeTypeDescription | INodeTypeBaseDescription, filePath: string) {
		const { icon } = obj;
		if (!icon) return;

		const hasExpression =
			typeof icon === 'string'
				? isExpression(icon)
				: isExpression(icon.light) || isExpression(icon.dark);

		if (hasExpression) {
			obj.iconBasePath = `icons/${this.packageName}/${path.dirname(filePath)}`;
			return;
		}

		const processIconPath = (iconValue: string) =>
			iconValue.startsWith('file:') ? this.getIconPath(iconValue, filePath) : null;

		let iconUrl;
		if (typeof icon === 'string') {
			iconUrl = processIconPath(icon);
		} else {
			const light = processIconPath(icon.light);
			const dark = processIconPath(icon.dark);
			iconUrl = light && dark ? { light, dark } : null;
		}

		if (iconUrl) {
			obj.iconUrl = iconUrl;
			obj.icon = undefined;
		}
	}

	/** Augments additional `Request Options` property on declarative node-type */
	static applyDeclarativeNodeOptionParameters(nodeType: INodeType): void {
		if (
			!!nodeType.execute ||
			!!nodeType.trigger ||
			!!nodeType.webhook ||
			!!nodeType.description.polling ||
			isSubNodeType(nodeType.description)
		) {
			return;
		}

		const parameters = nodeType.description.properties;
		if (!parameters) {
			return;
		}

		// Was originally under "options" instead of "requestOptions" so the chance
		// that that existed was quite high. With this name the chance is actually
		// very low that it already exists but lets leave it in anyway to be sure.
		const existingRequestOptionsIndex = parameters.findIndex(
			(parameter) => parameter.name === 'requestOptions',
		);
		if (existingRequestOptionsIndex !== -1) {
			parameters[existingRequestOptionsIndex] = {
				...commonDeclarativeNodeOptionParameters,
				options: [
					...(commonDeclarativeNodeOptionParameters.options ?? []),
					...(parameters[existingRequestOptionsIndex]?.options ?? []),
				],
			};

			const options = parameters[existingRequestOptionsIndex]?.options;

			if (options) {
				options.sort((a, b) => {
					if ('displayName' in a && 'displayName' in b) {
						if (a.displayName < b.displayName) {
							return -1;
						}
						if (a.displayName > b.displayName) {
							return 1;
						}
					}

					return 0;
				});
			}
		} else {
			parameters.push(commonDeclarativeNodeOptionParameters);
		}

		return;
	}

	private unloadAll() {
		const filesToUnload = Object.keys(require.cache).filter((filePath) =>
			filePath.startsWith(this.directory),
		);
		filesToUnload.forEach((filePath) => {
			delete require.cache[filePath];
		});
	}
}
