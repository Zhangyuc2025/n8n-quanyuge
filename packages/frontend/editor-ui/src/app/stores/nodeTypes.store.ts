import type {
	ActionResultRequestDto,
	CommunityNodeType,
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
} from '@n8n/api-types';
import * as nodeTypesApi from '@n8n/rest-api-client/api/nodeTypes';
import {
	HTTP_REQUEST_NODE_TYPE,
	CREDENTIAL_ONLY_HTTP_NODE_VERSION,
	MODULE_ENABLED_NODES,
} from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { NodeTypesByTypeNameAndVersion } from '@/Interface';
import { addHeaders, addNodeTranslation } from '@n8n/i18n';
import { omit } from '@/app/utils/typesUtils';
import type {
	INode,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	Workflow,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { groupNodeTypesByNameAndType } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import { computed, ref } from 'vue';
import { useActionsGenerator } from '@/features/shared/nodeCreator/composables/useActionsGeneration';
import { removePreviewToken } from '@/features/shared/nodeCreator/nodeCreator.utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useDynamicAINodes } from '@/features/shared/nodeCreator/composables/useDynamicAINodes';
import * as availableNodesApi from '@/app/api/available-nodes.api';
import type { AvailableNode } from '@/app/api/available-nodes.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

export type NodeTypesStore = ReturnType<typeof useNodeTypesStore>;

export const useNodeTypesStore = defineStore(STORES.NODE_TYPES, () => {
	const nodeTypes = ref<NodeTypesByTypeNameAndVersion>({});

	const vettedCommunityNodeTypes = ref<Map<string, CommunityNodeType>>(new Map());

	// Available nodes state
	const isLoadingAvailableNodes = ref(false);
	const availableNodesError = ref<string | null>(null);
	const nodesBySource = ref<Map<string, INodeTypeDescription[]>>(new Map());

	const rootStore = useRootStore();

	const actionsGenerator = useActionsGenerator();

	const settingsStore = useSettingsStore();

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const communityNodeType = computed(() => {
		return (nodeTypeName: string) => {
			return vettedCommunityNodeTypes.value.get(nodeTypeName);
		};
	});

	const officialCommunityNodeTypes = computed(() =>
		Array.from(vettedCommunityNodeTypes.value.values())
			.filter(({ isOfficialNode, isInstalled }) => isOfficialNode && !isInstalled)
			.map(({ nodeDescription }) => nodeDescription),
	);

	const unofficialCommunityNodeTypes = computed(() =>
		Array.from(vettedCommunityNodeTypes.value.values())
			.filter(({ isOfficialNode, isInstalled }) => !isOfficialNode && !isInstalled)
			.map(({ nodeDescription }) => nodeDescription),
	);

	const communityNodesAndActions = computed(() => {
		return actionsGenerator.generateMergedNodesAndActions(unofficialCommunityNodeTypes.value);
	});

	const allNodeTypes = computed(() => {
		return Object.values(nodeTypes.value).flatMap((nodeType) =>
			Object.keys(nodeType).map((version) => nodeType[Number(version)]),
		);
	});

	const allLatestNodeTypes = computed(() => {
		const result = Object.values(nodeTypes.value)
			.map((nodeVersions) => {
				const versionNumbers = Object.keys(nodeVersions).map(Number);
				return nodeVersions[Math.max(...versionNumbers)];
			})
			.filter(Boolean);

		// Debug: Check if source is preserved
		if (process.env.NODE_ENV === 'development' && result.length > 0) {
			const sampleNode = result.find((n) => n.name.includes('filter'));
			if (sampleNode) {
				console.log('[allLatestNodeTypes] Sample node:', {
					name: sampleNode.name,
					source: (sampleNode as any).source,
				});
			}
		}

		return result;
	});

	// Nodes defined with `hidden: true` that are still shown if their modules are enabled
	const moduleEnabledNodeTypes = computed<INodeTypeDescription[]>(() => {
		return MODULE_ENABLED_NODES.flatMap((node) => {
			const nodeVersions = nodeTypes.value[node.nodeType] ?? {};
			const versionNumbers = Object.keys(nodeVersions).map(Number);
			const latest = nodeVersions[Math.max(...versionNumbers)];

			if (latest?.hidden && settingsStore.isModuleActive(node.module)) {
				return {
					...latest,
					hidden: undefined,
				};
			}

			return [];
		});
	});

	const getNodeType = computed(() => {
		return (nodeTypeName: string, version?: number): INodeTypeDescription | null => {
			const nodeVersions = nodeTypes.value[nodeTypeName];

			if (!nodeVersions) return null;

			const versionNumbers = Object.keys(nodeVersions).map(Number);
			const nodeType = nodeVersions[version ?? Math.max(...versionNumbers)];
			return nodeType ?? null;
		};
	});

	const getNodeVersions = computed(() => {
		return (nodeTypeName: string): number[] => {
			return Object.keys(nodeTypes.value[nodeTypeName] ?? {}).map(Number);
		};
	});

	const getCredentialOnlyNodeType = computed(() => {
		return (_nodeTypeName: string, _version?: number): INodeTypeDescription | null => {
			return null;
		};
	});

	const isConfigNode = computed(() => {
		return (workflow: Workflow, node: INode, nodeTypeName: string): boolean => {
			if (!workflow.nodes[node.name]) {
				return false;
			}
			const nodeType = getNodeType.value(nodeTypeName);
			if (!nodeType) {
				return false;
			}
			const outputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType);
			const outputTypes = NodeHelpers.getConnectionTypes(outputs);

			return outputTypes
				? outputTypes.filter((output) => output !== NodeConnectionTypes.Main).length > 0
				: false;
		};
	});

	const isTriggerNode = computed(() => {
		return (nodeTypeName: string) => {
			const nodeType = getNodeType.value(nodeTypeName);
			return !!(nodeType && nodeType.group.includes('trigger'));
		};
	});

	const isToolNode = computed(() => {
		return (nodeTypeName: string) => {
			const nodeType = getNodeType.value(nodeTypeName);
			if (nodeType?.outputs && Array.isArray(nodeType.outputs)) {
				const outputTypes = nodeType.outputs.map(
					(output: NodeConnectionType | INodeOutputConfiguration) =>
						typeof output === 'string' ? output : output.type,
				);

				return outputTypes.includes(NodeConnectionTypes.AiTool);
			} else {
				return nodeType?.outputs.includes(NodeConnectionTypes.AiTool) ?? false;
			}
		};
	});

	const isCoreNodeType = computed(() => {
		return (nodeType: INodeTypeDescription) => {
			return nodeType.codex?.categories?.includes('Core Nodes');
		};
	});

	const visibleNodeTypes = computed(() => {
		const beforeFilter = allLatestNodeTypes.value
			.concat(officialCommunityNodeTypes.value)
			.concat(moduleEnabledNodeTypes.value);

		// Debug: Check langchain nodes BEFORE filtering
		if (process.env.NODE_ENV === 'development') {
			const langchainNode = beforeFilter.find((n) => n.name === '@n8n/n8n-nodes-langchain.agent');
			if (langchainNode) {
				console.log('[visibleNodeTypes BEFORE filter] langchain.agent found:', {
					name: langchainNode.name,
					hidden: langchainNode.hidden,
					source: (langchainNode as any).source,
				});
			} else {
				console.log('[visibleNodeTypes BEFORE filter] langchain.agent NOT FOUND in combined list');
			}
		}

		const result = beforeFilter.filter((nodeType) => !nodeType.hidden);

		// Debug: Check if source is preserved in visible node types AFTER filtering
		if (process.env.NODE_ENV === 'development' && result.length > 0) {
			const sampleNodes = [
				result.find((n) => n.name === 'n8n-nodes-base.filter'),
				result.find((n) => n.name === 'n8n-nodes-base.manualTrigger'),
				result.find((n) => n.name === '@n8n/n8n-nodes-langchain.agent'),
			].filter(Boolean);

			console.log(
				'[visibleNodeTypes AFTER filter] Found nodes:',
				sampleNodes.map((n) => n?.name),
			);
			sampleNodes.forEach((node) => {
				console.log('[visibleNodeTypes]', node?.name, 'source:', (node as any)?.source);
			});
		}

		return result;
	});

	const nativelyNumberSuffixedDefaults = computed(() => {
		return allNodeTypes.value.reduce<string[]>((acc, cur) => {
			if (/\d$/.test(cur.defaults.name as string)) acc.push(cur.defaults.name as string);
			return acc;
		}, []);
	});

	const visibleNodeTypesByOutputConnectionTypeNames = computed(() => {
		const nodesByOutputType = visibleNodeTypes.value.reduce(
			(acc, node) => {
				const outputTypes = node.outputs;
				if (Array.isArray(outputTypes)) {
					outputTypes.forEach((value: NodeConnectionType | INodeOutputConfiguration) => {
						const outputType = typeof value === 'string' ? value : value.type;
						if (!acc[outputType]) {
							acc[outputType] = [];
						}
						acc[outputType].push(node.name);
					});
				} else {
					// If outputs is not an array, it must be a string expression
					// in which case we'll try to match all possible non-main output types that are supported
					const connectorTypes: NodeConnectionType[] = [
						NodeConnectionTypes.AiVectorStore,
						NodeConnectionTypes.AiChain,
						NodeConnectionTypes.AiDocument,
						NodeConnectionTypes.AiEmbedding,
						NodeConnectionTypes.AiLanguageModel,
						NodeConnectionTypes.AiMemory,
						NodeConnectionTypes.AiOutputParser,
						NodeConnectionTypes.AiTextSplitter,
						NodeConnectionTypes.AiTool,
					];
					connectorTypes.forEach((outputType: NodeConnectionType) => {
						if (outputTypes.includes(outputType)) {
							acc[outputType] = acc[outputType] || [];
							acc[outputType].push(node.name);
						}
					});
				}

				return acc;
			},
			{} as { [key: string]: string[] },
		);

		return nodesByOutputType;
	});

	const visibleNodeTypesByInputConnectionTypeNames = computed(() => {
		const nodesByOutputType = visibleNodeTypes.value.reduce(
			(acc, node) => {
				const inputTypes = node.inputs;
				if (Array.isArray(inputTypes)) {
					inputTypes.forEach(
						(value: NodeConnectionType | INodeOutputConfiguration | INodeInputConfiguration) => {
							const outputType = typeof value === 'string' ? value : value.type;
							if (!acc[outputType]) {
								acc[outputType] = [];
							}
							acc[outputType].push(node.name);
						},
					);
				}

				return acc;
			},
			{} as { [key: string]: string[] },
		);

		return nodesByOutputType;
	});

	const isConfigurableNode = computed(() => {
		return (workflow: Workflow, node: INode, nodeTypeName: string): boolean => {
			const nodeType = getNodeType.value(nodeTypeName);
			if (nodeType === null) {
				return false;
			}
			const inputs = NodeHelpers.getNodeInputs(workflow, node, nodeType);
			const inputTypes = NodeHelpers.getConnectionTypes(inputs);

			return inputTypes
				? inputTypes.filter((input) => input !== NodeConnectionTypes.Main).length > 0
				: false;
		};
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	/**
	 * Convert AvailableNode from backend API to INodeTypeDescription format
	 */
	const convertAvailableNodeToDescription = (
		availableNode: AvailableNode,
	): INodeTypeDescription | null => {
		try {
			// For platform and custom nodes, we need to parse nodeDefinition
			// For builtin nodes, they should already be loaded from filesystem
			if (availableNode.source === 'builtin') {
				// Builtin nodes are already loaded via nodeTypesApi.getNodeTypes()
				// We don't need to convert them here
				return null;
			}

			// For platform and custom nodes, create a basic INodeTypeDescription
			// The actual node definition should be loaded separately when needed
			const nodeDescription: Partial<INodeTypeDescription> = {
				name: availableNode.nodeName,
				displayName: availableNode.nodeName,
				description: availableNode.description || '',
				version: availableNode.version ? parseFloat(availableNode.version) : 1,
				defaults: {
					name: availableNode.nodeName,
				},
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
				properties: [],
				group: ['transform'], // Default group
				// Add metadata to identify the node source
				codex: {
					categories: [availableNode.category || 'Uncategorized'],
					subcategories: {
						[availableNode.category || 'Uncategorized']: [availableNode.source],
					},
				},
			};

			// Add icon if available (icon can be URL or icon name)
			// Note: We're storing iconUrl as a custom property since the standard icon field
			// has strict typing. This can be accessed by components that know to look for it.
			if (availableNode.iconUrl) {
				// TypeScript workaround: add iconUrl to the object
				Object.assign(nodeDescription, { iconUrl: availableNode.iconUrl });
			}

			// Preserve source information for displaying node type badges
			Object.assign(nodeDescription, { source: availableNode.source });

			return nodeDescription as INodeTypeDescription;
		} catch (error) {
			console.error(`Failed to convert available node ${availableNode.nodeName}:`, error);
			return null;
		}
	};

	const setNodeTypes = (newNodeTypes: INodeTypeDescription[] = []) => {
		const groupedNodeTypes = groupNodeTypesByNameAndType(newNodeTypes);
		nodeTypes.value = {
			...nodeTypes.value,
			...groupedNodeTypes,
		};
	};

	const removeNodeTypes = (nodeTypesToRemove: INodeTypeDescription[]) => {
		nodeTypes.value = nodeTypesToRemove.reduce(
			(oldNodes, newNodeType) => omit(newNodeType.name, oldNodes),
			nodeTypes.value,
		);
	};

	const getNodesInformation = async (
		nodeInfos: INodeTypeNameVersion[],
		replace = true,
	): Promise<INodeTypeDescription[]> => {
		const nodesInformation = await nodeTypesApi.getNodesInformation(
			rootStore.restApiContext,
			nodeInfos,
		);

		nodesInformation.forEach((nodeInformation) => {
			if (nodeInformation.translation) {
				const nodeType = nodeInformation.name.replace('n8n-nodes-base.', '');

				addNodeTranslation({ [nodeType]: nodeInformation.translation }, rootStore.defaultLocale);
			}
		});
		if (replace) setNodeTypes(nodesInformation);

		return nodesInformation;
	};

	const getFullNodesProperties = async (
		nodesToBeFetched: INodeTypeNameVersion[],
		replaceNodeTypes = true,
	) => {
		// Credential types fetching removed - credential system disabled
		if (replaceNodeTypes) {
			await getNodesInformation(nodesToBeFetched);
		}
	};

	const getNodeTypes = async () => {
		// 1. 加载文件系统节点（内置节点，约142个）
		const nodeTypes = await nodeTypesApi.getNodeTypes(rootStore.baseUrl);

		if (nodeTypes.length) {
			// Add source field to builtin nodes
			const nodeTypesWithSource = nodeTypes.map((nodeType) => ({
				...nodeType,
				source: 'builtin' as const,
			}));

			// Debug: Check if source is added
			if (process.env.NODE_ENV === 'development') {
				console.log('[nodeTypes.store] Sample builtin node with source:', {
					name: nodeTypesWithSource[0].name,
					source: (nodeTypesWithSource[0] as any).source,
				});
			}

			setNodeTypes(nodeTypesWithSource);
			// Store builtin nodes by source
			nodesBySource.value.set('builtin', nodeTypesWithSource);
		}

		// 2. 加载动态 AI Chat Model 节点
		try {
			const { loadDynamicAIChatModels } = useDynamicAINodes();
			const dynamicAINodes = await loadDynamicAIChatModels();

			if (dynamicAINodes.length) {
				// 将动态节点转换为 INodeTypeDescription 格式并添加到 store
				setNodeTypes(dynamicAINodes as INodeTypeDescription[]);
				nodesBySource.value.set('dynamic-ai', dynamicAINodes as INodeTypeDescription[]);
			}
		} catch (error) {
			console.warn('Failed to load dynamic AI nodes:', error);
			// 不中断主流程，只记录警告
		}

		// 3. 加载可用节点（平台节点 + 自定义节点）
		try {
			const projectsStore = useProjectsStore();
			const workspaceId = projectsStore.currentWorkspaceId;

			if (workspaceId) {
				isLoadingAvailableNodes.value = true;
				availableNodesError.value = null;

				const availableNodes = await availableNodesApi.getAvailableNodes(
					rootStore.restApiContext,
					workspaceId,
				);

				// Convert platform and custom nodes to INodeTypeDescription
				const platformNodes: INodeTypeDescription[] = [];
				const thirdPartyNodes: INodeTypeDescription[] = [];
				const customNodes: INodeTypeDescription[] = [];

				for (const node of availableNodes) {
					// Skip builtin nodes as they're already loaded
					if (node.source === 'builtin') {
						continue;
					}

					const nodeDescription = convertAvailableNodeToDescription(node);
					if (nodeDescription) {
						if (node.source === 'platform') {
							platformNodes.push(nodeDescription);
						} else if (node.source === 'thirdParty') {
							thirdPartyNodes.push(nodeDescription);
						} else if (node.source === 'custom') {
							customNodes.push(nodeDescription);
						}
					}
				}

				// Add platform nodes to store
				if (platformNodes.length) {
					setNodeTypes(platformNodes);
					nodesBySource.value.set('platform', platformNodes);
				}

				// Add third-party nodes to store
				if (thirdPartyNodes.length) {
					setNodeTypes(thirdPartyNodes);
					nodesBySource.value.set('thirdParty', thirdPartyNodes);
				}

				// Add custom nodes to store
				if (customNodes.length) {
					setNodeTypes(customNodes);
					nodesBySource.value.set('custom', customNodes);
				}

				isLoadingAvailableNodes.value = false;
			}
		} catch (error) {
			console.error('Failed to load available nodes:', error);
			availableNodesError.value =
				error instanceof Error ? error.message : 'Unknown error loading available nodes';
			isLoadingAvailableNodes.value = false;
			// 不中断主流程，只记录错误
		}
	};

	const loadNodeTypesIfNotLoaded = async () => {
		if (Object.keys(nodeTypes.value).length === 0) {
			await getNodeTypes();
		}
	};

	const getNodeTranslationHeaders = async () => {
		const headers = await nodeTypesApi.getNodeTranslationHeaders(rootStore.restApiContext);

		if (headers) {
			addHeaders(headers, rootStore.defaultLocale);
		}
	};

	const getNodeParameterOptions = async (sendData: OptionsRequestDto) => {
		return await nodeTypesApi.getNodeParameterOptions(rootStore.restApiContext, sendData);
	};

	const getResourceLocatorResults = async (sendData: ResourceLocatorRequestDto) => {
		return await nodeTypesApi.getResourceLocatorResults(rootStore.restApiContext, sendData);
	};

	const getResourceMapperFields = async (sendData: ResourceMapperFieldsRequestDto) => {
		try {
			return await nodeTypesApi.getResourceMapperFields(rootStore.restApiContext, sendData);
		} catch (error) {
			return null;
		}
	};

	const getLocalResourceMapperFields = async (sendData: ResourceMapperFieldsRequestDto) => {
		try {
			return await nodeTypesApi.getLocalResourceMapperFields(rootStore.restApiContext, sendData);
		} catch (error) {
			return null;
		}
	};

	const getNodeParameterActionResult = async (sendData: ActionResultRequestDto) => {
		return await nodeTypesApi.getNodeParameterActionResult(rootStore.restApiContext, sendData);
	};

	const fetchCommunityNodePreviews = async () => {
		if (!settingsStore.isCommunityNodesFeatureEnabled) {
			return;
		}
		try {
			const communityNodeTypes = await nodeTypesApi.fetchCommunityNodeTypes(
				rootStore.restApiContext,
			);

			vettedCommunityNodeTypes.value = new Map(
				communityNodeTypes.map((nodeType) => [nodeType.name, nodeType]),
			);
		} catch (error) {
			vettedCommunityNodeTypes.value = new Map();
		}
	};

	const getCommunityNodeAttributes = async (nodeName: string) => {
		if (!settingsStore.isCommunityNodesFeatureEnabled) {
			return null;
		}

		try {
			return await nodeTypesApi.fetchCommunityNodeAttributes(
				rootStore.restApiContext,
				removePreviewToken(nodeName),
			);
		} catch (error) {
			return null;
		}
	};

	const getIsNodeInstalled = computed(() => {
		return (nodeTypeName: string) => {
			return (
				!!getNodeType.value(nodeTypeName) || !!communityNodeType.value(nodeTypeName)?.isInstalled
			);
		};
	});

	// #endregion

	return {
		nodeTypes,
		allNodeTypes,
		allLatestNodeTypes,
		getNodeType,
		getNodeVersions,
		getCredentialOnlyNodeType,
		isConfigNode,
		isTriggerNode,
		isToolNode,
		isCoreNodeType,
		visibleNodeTypes,
		nativelyNumberSuffixedDefaults,
		visibleNodeTypesByOutputConnectionTypeNames,
		visibleNodeTypesByInputConnectionTypeNames,
		isConfigurableNode,
		communityNodesAndActions,
		communityNodeType,
		fetchCommunityNodePreviews,
		getResourceMapperFields,
		getLocalResourceMapperFields,
		getNodeParameterActionResult,
		getResourceLocatorResults,
		getNodeParameterOptions,
		getNodesInformation,
		getFullNodesProperties,
		getNodeTypes,
		loadNodeTypesIfNotLoaded,
		getNodeTranslationHeaders,
		setNodeTypes,
		removeNodeTypes,
		getCommunityNodeAttributes,
		getIsNodeInstalled,
		// Available nodes state
		isLoadingAvailableNodes,
		availableNodesError,
		nodesBySource,
		convertAvailableNodeToDescription,
	};
});
