import { Container } from '@n8n/di';
import type { IDataObject, IRun, ITaskData, IWorkflowBase, RelatedExecution } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { OwnershipService } from './services/ownership.service';

/**
 * Returns the data of the last executed node
 */
export function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const { runData, pinData = {} } = inputData.data.resultData;
	const { lastNodeExecuted } = inputData.data.resultData;

	if (lastNodeExecuted === undefined) {
		return undefined;
	}

	if (runData[lastNodeExecuted] === undefined) {
		return undefined;
	}

	const lastNodeRunData = runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];

	let lastNodePinData = pinData[lastNodeExecuted];

	if (lastNodePinData && inputData.mode === 'manual') {
		if (!Array.isArray(lastNodePinData)) lastNodePinData = [lastNodePinData];

		const itemsPerRun = lastNodePinData.map((item, index) => {
			return { json: item, pairedItem: { item: index } };
		});

		return {
			startTime: 0,
			executionIndex: 0,
			executionTime: 0,
			data: { main: [itemsPerRun] },
			source: lastNodeRunData.source,
		};
	}

	return lastNodeRunData;
}

/**
 * Set node ids if not already set
 */
export function addNodeIds(workflow: IWorkflowBase) {
	const { nodes } = workflow;
	if (!nodes) return;

	nodes.forEach((node) => {
		if (!node.id) {
			node.id = uuid();
		}
	});
}

export async function getVariables(workflowId?: string, projectId?: string): Promise<IDataObject> {
	const [variables, project] = await Promise.all([
		Container.get(VariablesService).getAllCached(),
		// If projectId is not provided, try to get it from workflow
		workflowId && !projectId
			? Container.get(OwnershipService).getWorkflowProjectCached(workflowId)
			: null,
	]);

	// Either projectId passed or use project from workflow
	const projectIdToUse = projectId ?? project?.id;

	return Object.freeze(
		variables.reduce((acc, curr) => {
			if (!curr.project) {
				// always set globals
				acc[curr.key] = curr.value;
			} else if (projectIdToUse && curr.project.id === projectIdToUse) {
				// project variables override globals
				acc[curr.key] = curr.value;
			}
			return acc;
		}, {} as IDataObject),
	);
}

/**
 * Determines if a parent execution should be restarted when a child execution completes.
 *
 * @param parentExecution - The parent execution metadata, if any
 * @returns true if the parent should be restarted, false otherwise
 */
export function shouldRestartParentExecution(
	parentExecution: RelatedExecution | undefined,
): parentExecution is RelatedExecution {
	if (parentExecution === undefined) {
		return false;
	}
	if (parentExecution.shouldResume === undefined) {
		return true; // Preserve existing behavior for executions started before the flag was introduced for backward compatibility.
	}
	return parentExecution.shouldResume;
}
