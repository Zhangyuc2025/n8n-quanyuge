import { sendAt } from 'cron';
import moment from 'moment-timezone';
import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	Cron,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { intervalToRecurrence, recurrenceCheck, toCronExpression } from './GenericFunctions';
import type { IRecurrenceRule, Rule } from './SchedulerInterface';

export class ScheduleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '定时触发器',
		name: 'scheduleTrigger',
		icon: 'fa:clock',
		group: ['trigger', 'schedule'],
		version: [1, 1.1, 1.2],
		description: '按照设定的时间计划触发工作流',
		eventTriggerDescription: '',
		activationMessage: '定时触发器现在将按照您定义的时间计划触发工作流执行',
		defaults: {
			name: '定时触发器',
			color: '#31C49F',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'一旦<a data-key="activate">激活</a>此工作流，它将按照您在此处定义的时间计划运行。<br><br>要进行测试，您也可以手动触发：返回画布并点击"执行工作流"',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '触发规则',
				name: 'rule',
				placeholder: '添加规则',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {
					interval: [
						{
							field: 'days',
						},
					],
				},
				options: [
					{
						name: 'interval',
						displayName: '触发间隔',
						values: [
							{
								displayName: '触发间隔',
								name: 'field',
								type: 'options',
								default: 'days',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
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
									{
										name: '天',
										value: 'days',
									},
									{
										name: '周',
										value: 'weeks',
									},
									{
										name: '月',
										value: 'months',
									},
									{
										name: '自定义 (Cron)',
										value: 'cronExpression',
									},
								],
							},
							{
								displayName: '触发间隔（秒）',
								name: 'secondsInterval',
								type: 'number',
								default: 30,
								displayOptions: {
									show: {
										field: ['seconds'],
									},
								},
								description: '每次工作流触发之间的秒数',
							},
							{
								displayName: '触发间隔（分钟）',
								name: 'minutesInterval',
								type: 'number',
								default: 5,
								displayOptions: {
									show: {
										field: ['minutes'],
									},
								},
								description: '每次工作流触发之间的分钟数',
							},
							{
								displayName: '触发间隔（小时）',
								name: 'hoursInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['hours'],
									},
								},
								default: 1,
								description: '每次工作流触发之间的小时数',
							},
							{
								displayName: '触发间隔（天）',
								name: 'daysInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['days'],
									},
								},
								default: 1,
								description: '每次工作流触发之间的天数',
							},
							{
								displayName: '触发间隔（周）',
								name: 'weeksInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['weeks'],
									},
								},
								default: 1,
								description: '除非另有指定，否则每周运行一次',
							},
							{
								displayName: '触发间隔（月）',
								name: 'monthsInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['months'],
									},
								},
								default: 1,
								description: '除非另有指定，否则每月运行一次',
							},
							{
								displayName: '在每月的第几天触发',
								name: 'triggerAtDayOfMonth',
								type: 'number',
								displayOptions: {
									show: {
										field: ['months'],
									},
								},
								typeOptions: {
									minValue: 1,
									maxValue: 31,
								},
								default: 1,
								description: '触发的月份中的哪一天（1-31）',
								hint: '如果某个月没有该日期，节点将不会触发',
							},
							{
								displayName: '在工作日触发',
								name: 'triggerAtDay',
								type: 'multiOptions',
								displayOptions: {
									show: {
										field: ['weeks'],
									},
								},
								typeOptions: {
									maxValue: 7,
								},
								options: [
									{
										name: '星期一',
										value: 1,
									},
									{
										name: '星期二',
										value: 2,
									},
									{
										name: '星期三',
										value: 3,
									},
									{
										name: '星期四',
										value: 4,
									},
									{
										name: '星期五',
										value: 5,
									},

									{
										name: '星期六',
										value: 6,
									},
									{
										name: '星期日',
										value: 0,
									},
								],
								default: [0],
							},
							{
								displayName: '在哪个小时触发',
								name: 'triggerAtHour',
								type: 'options',
								default: 0,
								displayOptions: {
									show: {
										field: ['days', 'weeks', 'months'],
									},
								},
								options: [
									{
										name: '午夜',
										displayName: '午夜',
										value: 0,
									},
									{
										name: '1am',
										displayName: '1am',
										value: 1,
									},
									{
										name: '2am',
										displayName: '2am',
										value: 2,
									},
									{
										name: '3am',
										displayName: '3am',
										value: 3,
									},
									{
										name: '4am',
										displayName: '4am',
										value: 4,
									},
									{
										name: '5am',
										displayName: '5am',
										value: 5,
									},
									{
										name: '6am',
										displayName: '6am',
										value: 6,
									},
									{
										name: '7am',
										displayName: '7am',
										value: 7,
									},
									{
										name: '8am',
										displayName: '8am',
										value: 8,
									},
									{
										name: '9am',
										displayName: '9am',
										value: 9,
									},
									{
										name: '10am',
										displayName: '10am',
										value: 10,
									},
									{
										name: '11am',
										displayName: '11am',
										value: 11,
									},
									{
										name: 'Noon',
										displayName: 'Noon',
										value: 12,
									},
									{
										name: '1pm',
										displayName: '1pm',
										value: 13,
									},
									{
										name: '2pm',
										displayName: '2pm',
										value: 14,
									},
									{
										name: '3pm',
										displayName: '3pm',
										value: 15,
									},
									{
										name: '4pm',
										displayName: '4pm',
										value: 16,
									},
									{
										name: '5pm',
										displayName: '5pm',
										value: 17,
									},
									{
										name: '6pm',
										displayName: '6pm',
										value: 18,
									},
									{
										name: '7pm',
										displayName: '7pm',
										value: 19,
									},
									{
										name: '8pm',
										displayName: '8pm',
										value: 20,
									},
									{
										name: '9pm',
										displayName: '9pm',
										value: 21,
									},
									{
										name: '10pm',
										displayName: '10pm',
										value: 22,
									},
									{
										name: '11pm',
										displayName: '11pm',
										value: 23,
									},
								],
								description: '一天中触发的小时',
							},
							{
								displayName: '在哪一分钟触发',
								name: 'triggerAtMinute',
								type: 'number',
								default: 0,
								displayOptions: {
									show: {
										field: ['hours', 'days', 'weeks', 'months'],
									},
								},
								typeOptions: {
									minValue: 0,
									maxValue: 59,
								},
								description: '超过小时的分钟数以触发（0-59）',
							},
							{
								displayName:
									'您可以在<a href="https://crontab.guru/examples.html" target="_blank">这里</a>找到生成 cron 表达式的帮助',
								name: 'notice',
								type: 'notice',
								displayOptions: {
									show: {
										field: ['cronExpression'],
									},
								},
								default: '',
							},
							{
								displayName: '表达式',
								name: 'expression',
								type: 'string',
								default: '',
								placeholder: '例如：0 15 * 1 sun',
								displayOptions: {
									show: {
										field: ['cronExpression'],
									},
								},
								hint: '格式：[秒] [分] [时] [日] [月] [周]',
							},
						],
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const { interval: intervals } = this.getNodeParameter('rule', []) as Rule;
		const timezone = this.getTimezone();
		const staticData = this.getWorkflowStaticData('node') as {
			recurrenceRules: number[];
		};
		if (!staticData.recurrenceRules) {
			staticData.recurrenceRules = [];
		}

		const executeTrigger = (recurrence: IRecurrenceRule) => {
			const shouldTrigger = recurrenceCheck(recurrence, staticData.recurrenceRules, timezone);
			if (!shouldTrigger) return;

			const momentTz = moment.tz(timezone);
			const resultData = {
				timestamp: momentTz.toISOString(true),
				'Readable date': momentTz.format('MMMM Do YYYY, h:mm:ss a'),
				'Readable time': momentTz.format('h:mm:ss a'),
				'Day of week': momentTz.format('dddd'),
				Year: momentTz.format('YYYY'),
				Month: momentTz.format('MMMM'),
				'Day of month': momentTz.format('DD'),
				Hour: momentTz.format('HH'),
				Minute: momentTz.format('mm'),
				Second: momentTz.format('ss'),
				Timezone: `${timezone} (UTC${momentTz.format('Z')})`,
			};

			this.emit([this.helpers.returnJsonArray([resultData])]);
		};

		const rules = intervals.map((interval, i) => ({
			interval,
			cronExpression: toCronExpression(interval),
			recurrence: intervalToRecurrence(interval, i),
		}));

		if (this.getMode() !== 'manual') {
			for (const { interval, cronExpression, recurrence } of rules) {
				try {
					const cron: Cron = {
						expression: cronExpression,
						recurrence,
					};
					this.helpers.registerCron(cron, () => executeTrigger(recurrence));
				} catch (error) {
					if (interval.field === 'cronExpression') {
						throw new NodeOperationError(this.getNode(), '无效的 cron 表达式', {
							description: '有关如何构建它们的更多信息，请访问 https://crontab.guru/',
						});
					} else {
						throw error;
					}
				}
			}
			return {};
		} else {
			const manualTriggerFunction = async () => {
				const { interval, cronExpression, recurrence } = rules[0];
				if (interval.field === 'cronExpression') {
					try {
						sendAt(cronExpression);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), '无效的 cron 表达式', {
							description: '有关如何构建它们的更多信息，请访问 https://crontab.guru/',
						});
					}
				}
				executeTrigger(recurrence);
			};

			return { manualTriggerFunction };
		}
	}
}
