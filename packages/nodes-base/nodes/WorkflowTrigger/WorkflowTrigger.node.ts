import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type eventType = 'Workflow activated' | 'Workflow updated' | undefined;
type activationType = 'activate' | 'update';

export class WorkflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '工作流触发器',
		hidden: true,
		name: 'workflowTrigger',
		icon: 'fa:network-wired',
		iconColor: 'orange-red',
		group: ['trigger'],
		version: 1,
		description: '基于各种生命周期事件触发，例如工作流被激活时',
		eventTriggerDescription: '',
		mockManualExecution: true,
		activationMessage: '您的工作流现在将在您定义的事件发生时触发执行。',
		defaults: {
			name: '工作流触发器',
			color: '#ff6d5a',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: "此节点已废弃，将来不会更新。请改用 'n8n 触发器' 节点。",
				name: 'oldVersionNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '事件',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: `指定在何种条件下应该触发执行：
					<ul>
						<li><b>活动工作流已更新</b>：当此工作流更新时触发</li>
						<li><b>工作流已激活</b>：当此工作流激活时触发</li>
					</ul>`,
				options: [
					{
						name: '活动工作流已更新',
						value: 'update',
						description: '当此工作流更新时触发',
					},
					{
						name: '工作流已激活',
						value: 'activate',
						description: '当此工作流激活时触发',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const events = this.getNodeParameter('events', []) as activationType[];

		const activationMode = this.getActivationMode() as activationType;

		if (events.includes(activationMode)) {
			let event: eventType;
			if (activationMode === 'activate') {
				event = 'Workflow activated';
			}
			if (activationMode === 'update') {
				event = 'Workflow updated';
			}
			this.emit([
				this.helpers.returnJsonArray([
					{ event, timestamp: new Date().toISOString(), workflow_id: this.getWorkflow().id },
				]),
			]);
		}

		const manualTriggerFunction = async () => {
			this.emit([
				this.helpers.returnJsonArray([
					{
						event: 'Manual execution',
						timestamp: new Date().toISOString(),
						workflow_id: this.getWorkflow().id,
					},
				]),
			]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
