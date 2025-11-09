import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Interval implements INodeType {
	description: INodeTypeDescription = {
		displayName: '定时触发',
		name: 'interval',
		icon: 'fa:hourglass',
		group: ['trigger', 'schedule'],
		version: 1,
		hidden: true,
		description: '按给定间隔触发工作流',
		eventTriggerDescription: '',
		activationMessage: '你的定时触发器现在将按你定义的计划触发执行',
		defaults: {
			name: '定时触发',
			color: '#00FF00',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'一旦<a data-key="activate">激活</a>，此工作流将按你在此定义的计划运行。<br><br>用于测试时，你也可以手动触发：返回画布并点击"执行工作流"',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '间隔',
				name: 'interval',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: '间隔值',
			},
			{
				displayName: '单位',
				name: 'unit',
				type: 'options',
				options: [
					{
						name: '秒',
						value: 'seconds',
					},
					{
						name: '分钟',
						value: 'minutes',
					},
					{
						name: '小时',
						value: 'hours',
					},
				],
				default: 'seconds',
				description: '间隔值的单位',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const interval = this.getNodeParameter('interval') as number;
		const unit = this.getNodeParameter('unit') as string;

		if (interval <= 0) {
			throw new NodeOperationError(this.getNode(), '间隔必须设置为至少 1 或更高！');
		}

		let intervalValue = interval;
		if (unit === 'minutes') {
			intervalValue *= 60;
		}
		if (unit === 'hours') {
			intervalValue *= 60 * 60;
		}

		const executeTrigger = () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		intervalValue *= 1000;

		// Reference: https://nodejs.org/api/timers.html#timers_setinterval_callback_delay_args
		if (intervalValue > 2147483647) {
			throw new NodeOperationError(this.getNode(), '间隔值太大');
		}

		const intervalObj = setInterval(executeTrigger, intervalValue);

		async function closeFunction() {
			clearInterval(intervalObj);
		}

		async function manualTriggerFunction() {
			executeTrigger();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
