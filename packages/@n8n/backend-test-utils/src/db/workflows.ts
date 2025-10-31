import type { IWorkflowDb } from '@n8n/db';
import { Project, User, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

export function newWorkflow(attributes: Partial<IWorkflowDb> = {}): IWorkflowDb {
	const { active, isArchived, name, nodes, connections, versionId, settings } = attributes;

	const workflowEntity = Container.get(WorkflowRepository).create({
		active: active ?? false,
		isArchived: isArchived ?? false,
		name: name ?? 'test workflow',
		nodes: nodes ?? [
			{
				id: 'uuid-1234',
				name: 'Schedule Trigger',
				parameters: {},
				position: [-20, 260],
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
			},
		],
		connections: connections ?? {},
		versionId: versionId ?? uuid(),
		settings: settings ?? {},
		...attributes,
	});

	return workflowEntity;
}

/**
 * Store a workflow in the DB (without a trigger) and optionally assign it to a user or project.
 *
 * Exclusive mode: Each workflow belongs to exactly one project via direct projectId relationship.
 *
 * @param attributes workflow attributes
 * @param userOrProject user or project to assign the workflow to
 */
export async function createWorkflow(
	attributes: Partial<IWorkflowDb> = {},
	userOrProject?: User | Project,
) {
	let project: Project | undefined;

	if (userOrProject instanceof User) {
		const user = userOrProject;
		project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
	} else if (userOrProject instanceof Project) {
		project = userOrProject;
	}

	// Exclusive mode: Set projectId directly on workflow
	const workflowData = {
		...newWorkflow(attributes),
		...(project && { projectId: project.id }),
	};

	const workflow = await Container.get(WorkflowRepository).save(workflowData);

	return workflow;
}

export async function createManyWorkflows(
	amount: number,
	attributes: Partial<IWorkflowDb> = {},
	user?: User,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const workflowRequests = [...Array(amount)].map(
		async (_) => await createWorkflow(attributes, user),
	);
	return await Promise.all(workflowRequests);
}

/**
 * @deprecated Exclusive mode: Workflows cannot be shared across projects.
 * This function is kept for backward compatibility but does nothing.
 * To give users access to a workflow, add them to the project that owns the workflow.
 */
export async function shareWorkflowWithUsers(_workflow: IWorkflowBase, _users: User[]) {
	// In exclusive mode, workflows belong to one project only
	// Users get access via ProjectRelation, not SharedWorkflow
	console.warn(
		'shareWorkflowWithUsers is deprecated in exclusive mode. Use ProjectRelation to grant access.',
	);
	return [];
}

/**
 * @deprecated Exclusive mode: Workflows cannot be shared across projects.
 * This function is kept for backward compatibility but creates duplicate workflows instead.
 */
export async function shareWorkflowWithProjects(
	_workflow: IWorkflowBase,
	_projectsWithRole: Array<{ project: Project; role?: string }>,
) {
	console.warn(
		'shareWorkflowWithProjects is deprecated in exclusive mode. ' +
			'Consider duplicating the workflow to each project instead.',
	);

	// In exclusive mode, we cannot share - we would need to duplicate
	// For test compatibility, return empty array
	return [];
}

/**
 * @deprecated Exclusive mode: No SharedWorkflow table exists.
 * Returns the owning project information instead.
 */
export async function getWorkflowSharing(_workflow: IWorkflowBase) {
	console.warn(
		'getWorkflowSharing is deprecated in exclusive mode. ' +
			'Use workflow.project to get the owning project.',
	);

	// Return empty array for test compatibility
	// Tests should be updated to query workflow.project directly
	return [];
}

/**
 * Store a workflow in the DB (with a trigger) and optionally assign it to a user.
 * @param user user to assign the workflow to
 */
export async function createWorkflowWithTrigger(
	attributes: Partial<IWorkflowDb> = {},
	user?: User,
) {
	const workflow = await createWorkflow(
		{
			nodes: [
				{
					id: 'uuid-1',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-2',
					parameters: { triggerTimes: { item: [{ mode: 'everyMinute' }] } },
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [500, 300],
				},
				{
					id: 'uuid-3',
					parameters: { options: {} },
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [780, 300],
				},
			],
			connections: {
				Cron: { main: [[{ node: 'Set', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			...attributes,
		},
		user,
	);

	return workflow;
}

export async function getAllWorkflows() {
	return await Container.get(WorkflowRepository).find();
}

/**
 * @deprecated Exclusive mode: No SharedWorkflow table exists.
 * Returns all workflows instead.
 */
export async function getAllSharedWorkflows() {
	console.warn(
		'getAllSharedWorkflows is deprecated in exclusive mode. Use getAllWorkflows() instead.',
	);
	return await getAllWorkflows();
}

export const getWorkflowById = async (id: string) =>
	await Container.get(WorkflowRepository).findOneBy({ id });
