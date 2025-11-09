import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	TriggerTime,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, toCronExpression } from 'n8n-workflow';

export class Cron implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cron',
		name: 'cron',
		icon: 'fa:clock',
		group: ['trigger', 'schedule'],
		version: 1,
		hidden: true,
		description: '在特定时间触发工作流',
		eventTriggerDescription: '',
		activationMessage: '您的 cron 触发器现在将按照您定义的计划触发执行。',
		defaults: {
			name: 'Cron',
			color: '#29a568',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'一旦您<a data-key="activate">激活</a>此工作流，它将按照您在此定义的计划运行。<br><br>为了测试，您也可以手动触发它：返回画布并点击"执行工作流"',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '触发时间',
				name: 'triggerTimes',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: '添加时间',
				},
				default: {},
				description: '工作流的触发器',
				placeholder: '添加 Cron 时间',
				options: NodeHelpers.cronNodeOptions,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerTimes = this.getNodeParameter('triggerTimes') as unknown as {
			item: TriggerTime[];
		};

		// Get all the trigger times
		const expressions = (triggerTimes.item || []).map(toCronExpression);

		// The trigger function to execute when the cron-time got reached
		// or when manually triggered
		const executeTrigger = () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		// Register the cron-jobs
		expressions.forEach((expression) => this.helpers.registerCron({ expression }, executeTrigger));

		return {
			manualTriggerFunction: async () => executeTrigger(),
		};
	}
}
