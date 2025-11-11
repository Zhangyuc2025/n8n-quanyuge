import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { RemoveNodeType } from '@n8n/api-types/push/hot-reload';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

/**
 * Handles the 'removeNodeType' event from the push connection, which indicates
 * that a node type needs to be removed
 */
export async function removeNodeType({ data }: RemoveNodeType) {
	const nodeTypesStore = useNodeTypesStore();

	const nodesToBeRemoved: INodeTypeNameVersion[] = [data];

	nodeTypesStore.removeNodeTypes(nodesToBeRemoved as INodeTypeDescription[]);
}
