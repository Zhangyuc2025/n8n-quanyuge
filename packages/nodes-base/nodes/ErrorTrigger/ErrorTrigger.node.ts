import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class ErrorTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '错误触发器',
		name: 'errorTrigger',
		icon: 'fa:bug',
		iconColor: 'blue',
		group: ['trigger'],
		version: 1,
		description: '当其他工作流发生错误时触发该工作流',
		eventTriggerDescription: '',
		mockManualExecution: true,
		maxNodes: 1,
		defaults: {
			name: '错误触发器',
			color: '#0000FF',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.errortrigger',
					},
				],
				tutorialLinks: {
					moreInfo: 'https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.errortrigger',
				},
			},
		},
		properties: [
			{
				displayName:
					'当其他工作流发生错误时，此节点将被触发，前提是该工作流已设置为这样做。<a href="{{moreInfo}}" target="_blank">了解更多</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const mode = this.getMode();

		if (
			mode === 'manual' &&
			items.length === 1 &&
			Object.keys(items[0].json).length === 0 &&
			items[0].binary === undefined
		) {
			// If we are in manual mode and no input data got provided we return
			// example data to allow to develope and test errorWorkflows easily

			const restApiUrl = this.getRestApiUrl();

			const urlParts = restApiUrl.split('/');
			urlParts.pop();
			urlParts.push('execution');

			const id = 231;

			items[0].json = {
				execution: {
					id,
					url: `${urlParts.join('/')}/workflow/1/${id}`,
					retryOf: '34',
					error: {
						message: 'Example Error Message',
						stack: 'Stacktrace',
					},
					lastNodeExecuted: 'Node With Error',
					mode: 'manual',
				},
				workflow: {
					id: '1',
					name: 'Example Workflow',
				},
			};
		}

		return [items];
	}
}
