import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type eventType = 'Instance started' | 'Workflow activated' | 'Workflow updated' | undefined;

export class N8nTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n 触发器',
		name: 'n8nTrigger',
		icon: 'file:n8nTrigger.svg',
		group: ['trigger'],
		version: 1,
		description: '处理事件并在 n8n 实例上执行操作',
		eventTriggerDescription: '',
		mockManualExecution: true,
		defaults: {
			name: 'n8n 触发器',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '事件',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: `指定在哪些条件下执行：
				<ul>
					<li><b>活动工作流已更新</b>：当此工作流更新时触发</li>
					<li><b>实例已启动</b>：当此 n8n 实例启动或重新启动时触发</li>
					<li><b>工作流已激活</b>：当此工作流激活时触发</li>
				</ul>`,
				options: [
					{
						name: '活动工作流已更新',
						value: 'update',
						description: '当此工作流更新时触发',
					},
					{
						name: '实例已启动',
						value: 'init',
						description: '当此 n8n 实例启动或重新启动时触发',
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
		const events = (this.getNodeParameter('events') as string[]) || [];

		const activationMode = this.getActivationMode();

		if (events.includes(activationMode)) {
			let event: eventType;
			if (activationMode === 'activate') {
				event = 'Workflow activated';
			}
			if (activationMode === 'update') {
				event = 'Workflow updated';
			}
			if (activationMode === 'init') {
				event = 'Instance started';
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
