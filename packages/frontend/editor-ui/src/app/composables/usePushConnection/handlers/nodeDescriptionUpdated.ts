import type { NodeDescriptionUpdated } from '@n8n/api-types/push/hot-reload';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

/**
 * Handles the 'nodeDescriptionUpdated' event from the push connection, which indicates
 * that a node description has been updated.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function nodeDescriptionUpdated(_event: NodeDescriptionUpdated) {
	const nodeTypesStore = useNodeTypesStore();

	await nodeTypesStore.getNodeTypes();
}
