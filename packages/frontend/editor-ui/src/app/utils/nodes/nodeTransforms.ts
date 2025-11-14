import {
	AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
	AI_MCP_TOOL_NODE_TYPE,
	WIKIPEDIA_TOOL_NODE_TYPE,
} from '@/app/constants';
import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import type { FromAIArgument, INodePropertyOptions } from 'n8n-workflow';
import { NodeHelpers, traverseNodeParameters } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

// Note: Credentials system has been removed - these functions return defaults
export function getNodeTypeDisplayableCredentials(
	_nodeTypeProvider: NodeTypeProvider,
	_node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion'>,
) {
	return [];
}

export function doesNodeHaveCredentialsToFill(
	nodeTypeProvider: NodeTypeProvider,
	node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion'>,
): boolean {
	const requiredCredentials = getNodeTypeDisplayableCredentials(nodeTypeProvider, node);
	return requiredCredentials.length > 0;
}

export function hasNodeCredentialFilled(_node: any, _credentialName: string): boolean {
	return false;
}

export function doesNodeHaveAllCredentialsFilled(
	nodeTypeProvider: NodeTypeProvider,
	node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion'> & { credentials?: any },
): boolean {
	const requiredCredentials = getNodeTypeDisplayableCredentials(nodeTypeProvider, node);
	return requiredCredentials.every((cred: any) => hasNodeCredentialFilled(node, cred.name));
}

/**
 * Checks if the given node needs agentInput
 */
export function needsAgentInput(node: Pick<INodeUi, 'parameters' | 'type'>) {
	const nodeTypesNeedModal = [
		WIKIPEDIA_TOOL_NODE_TYPE,
		AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
		AI_MCP_TOOL_NODE_TYPE,
	];
	return node.type ? nodeTypesNeedModal.includes(node.type) : false;
}

/**
 * Filters parameter options based on displayOptions
 */
export function getParameterDisplayableOptions(
	options: INodePropertyOptions[],
	node: INodeUi | null,
): INodePropertyOptions[] {
	if (!node) return options;

	const nodeType = node?.type ? useNodeTypesStore().getNodeType(node.type, node.typeVersion) : null;

	if (!nodeType || !Array.isArray(nodeType.properties)) return options;

	const nodeParameters =
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters,
			true,
			false,
			node,
			nodeType,
		) ?? node.parameters;

	return options.filter((option) => {
		if (!option.displayOptions && !option.disabledOptions) return true;

		return NodeHelpers.displayParameter(
			nodeParameters,
			option,
			node,
			nodeType,
			undefined,
			'displayOptions',
		);
	});
}

/**
 * Gets the options with from_ai if they exist
 */
export function getNodeParametersFromAIOptions(
	node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion'>,
	path: string,
	nodeTypeVersion?: number,
): INodePropertyOptions[] | undefined {
	const nodeType = useNodeTypesStore().getNodeType(node.type, nodeTypeVersion ?? node.typeVersion);
	if (!nodeType) return undefined;

	let parameterOptions: INodePropertyOptions[] = [];
	traverseNodeParameters(nodeType.properties, (parameter) => {
		if (parameter.name === path) {
			parameterOptions = parameter.options as INodePropertyOptions[];
			return true;
		}
		return false;
	});

	return parameterOptions?.filter((option) => {
		return !!(option.fromAI as FromAIArgument | undefined);
	});
}
