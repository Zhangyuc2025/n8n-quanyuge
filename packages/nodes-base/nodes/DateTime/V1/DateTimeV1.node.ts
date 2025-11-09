import set from 'lodash/set';
import { DateTime as LuxonDateTime } from 'luxon';
import moment from 'moment-timezone';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

function parseDateByFormat(this: IExecuteFunctions, value: string, fromFormat: string) {
	const date = moment(value, fromFormat, true);
	if (moment(date).isValid()) return date;

	throw new NodeOperationError(this.getNode(), '日期输入无法解析。请重新检查值和"输入格式"字段。');
}

function getIsoValue(this: IExecuteFunctions, value: string) {
	try {
		return new Date(value).toISOString(); // may throw due to unpredictable input
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			'无法识别的日期输入。请在"输入格式"字段中指定格式。',
		);
	}
}

function parseDateByDefault(this: IExecuteFunctions, value: string) {
	const isoValue = getIsoValue.call(this, value);
	if (moment(isoValue).isValid()) return moment(isoValue);

	throw new NodeOperationError(
		this.getNode(),
		'无法识别的日期输入。请在"输入格式"字段中指定格式。',
	);
}

const versionDescription: INodeTypeDescription = {
	displayName: '日期和时间',
	name: 'dateTime',
	icon: 'fa:clock',
	group: ['transform'],
	version: 1,
	description: '允许你操纵日期和时间值',
	subtitle: '={{$parameter["action"]}}',
	defaults: {
		name: '日期和时间',
		color: '#408000',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName:
				"更强大的日期功能可在<a href='https://docs.n8n.io/code/cookbook/luxon/' target='_blank'>表达式</a>中使用,</br> 例如 <code>{{ $now.plus(1, 'week') }}</code>",
			name: 'noticeDateTime',
			type: 'notice',
			default: '',
		},
		{
			displayName: '操作',
			name: 'action',
			type: 'options',
			options: [
				{
					name: '计算日期',
					description: '从日期加或减时间',
					value: 'calculate',
					action: '从日期加或减时间',
				},
				{
					name: '格式化日期',
					description: '将日期转换为其他格式',
					value: 'format',
					action: '将日期转换为其他格式',
				},
			],
			default: 'format',
		},
		{
			displayName: '值',
			name: 'value',
			displayOptions: {
				show: {
					action: ['format'],
				},
			},
			type: 'string',
			default: '',
			description: '应该被转换的值',
			required: true,
		},
		{
			displayName: '属性名称',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					action: ['format'],
				},
			},
			description: '要写入转换后日期的属性名称',
		},
		{
			displayName: '自定义格式',
			name: 'custom',
			displayOptions: {
				show: {
					action: ['format'],
				},
			},
			type: 'boolean',
			default: false,
			description: '是否应该选择预定义格式或输入自定义格式',
		},
		{
			displayName: '转换为格式',
			name: 'toFormat',
			displayOptions: {
				show: {
					action: ['format'],
					custom: [true],
				},
			},
			type: 'string',
			default: '',
			placeholder: 'YYYY-MM-DD',
			description: '要转换日期到的格式',
		},
		{
			displayName: '转换为格式',
			name: 'toFormat',
			type: 'options',
			displayOptions: {
				show: {
					action: ['format'],
					custom: [false],
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'MM/DD/YYYY',
					value: 'MM/DD/YYYY',
					description: '示例: 09/04/1986',
				},
				{
					name: 'YYYY/MM/DD',
					value: 'YYYY/MM/DD',
					description: '示例: 1986/04/09',
				},
				{
					name: 'MMMM DD YYYY',
					value: 'MMMM DD YYYY',
					description: '示例: April 09 1986',
				},
				{
					name: 'MM-DD-YYYY',
					value: 'MM-DD-YYYY',
					description: '示例: 09-04-1986',
				},
				{
					name: 'YYYY-MM-DD',
					value: 'YYYY-MM-DD',
					description: '示例: 1986-04-09',
				},
				{
					name: 'Unix 时间戳',
					value: 'X',
					description: '示例: 513388800.879',
				},
				{
					name: 'Unix 毫秒时间戳',
					value: 'x',
					description: '示例: 513388800',
				},
			],
			default: 'MM/DD/YYYY',
			description: '要转换日期到的格式',
		},
		{
			displayName: '选项',
			name: 'options',
			displayOptions: {
				show: {
					action: ['format'],
				},
			},
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{
					displayName: '输入格式',
					name: 'fromFormat',
					type: 'string',
					default: '',
					description: '如果输入格式无法识别,你可以提供格式',
				},
				{
					displayName: '输入时区名称或 ID',
					name: 'fromTimezone',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getTimezones',
					},
					default: 'UTC',
					description:
						'要转换的时区。从列表中选择,或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID。',
				},
				{
					displayName: '转换至时区名称或 ID',
					name: 'toTimezone',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getTimezones',
					},
					default: 'UTC',
					description:
						'要转换至的时区。从列表中选择,或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID。',
				},
			],
		},
		{
			displayName: '日期值',
			name: 'value',
			displayOptions: {
				show: {
					action: ['calculate'],
				},
			},
			type: 'string',
			default: '',
			description: '你要加/减时间的日期字符串或时间戳',
			required: true,
		},
		{
			displayName: '操作',
			name: 'operation',
			displayOptions: {
				show: {
					action: ['calculate'],
				},
			},
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: '加',
					value: 'add',
					description: '向日期值添加时间',
					action: '向日期值添加时间',
				},
				{
					name: '减',
					value: 'subtract',
					description: '从日期值减去时间',
					action: '从日期值减去时间',
				},
			],
			default: 'add',
			required: true,
		},
		{
			displayName: '持续时间',
			name: 'duration',
			displayOptions: {
				show: {
					action: ['calculate'],
				},
			},
			type: 'number',
			typeOptions: {
				minValue: 0,
			},
			default: 0,
			required: true,
			description: '例如输入"10",然后如果你想向日期值添加 10 天,选择"天"。',
		},
		{
			displayName: '时间单位',
			name: 'timeUnit',
			description: '上述持续时间参数的时间单位',
			displayOptions: {
				show: {
					action: ['calculate'],
				},
			},
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: '季度',
					value: 'quarters',
				},
				{
					name: '年',
					value: 'years',
				},
				{
					name: '月',
					value: 'months',
				},
				{
					name: '周',
					value: 'weeks',
				},
				{
					name: '天',
					value: 'days',
				},
				{
					name: '小时',
					value: 'hours',
				},
				{
					name: '分钟',
					value: 'minutes',
				},
				{
					name: '秒',
					value: 'seconds',
				},
				{
					name: '毫秒',
					value: 'milliseconds',
				},
			],
			default: 'days',
			required: true,
		},
		{
			displayName: '属性名称',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					action: ['calculate'],
				},
			},
			description: '要写入转换后日期的输出属性名称',
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			displayOptions: {
				show: {
					action: ['calculate'],
				},
			},
			options: [
				{
					displayName: '输入格式',
					name: 'fromFormat',
					type: 'string',
					default: '',
					description:
						'用于将值解析为日期的格式。如果无法识别,请指定值的<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datetime/#faqs">格式</a>。',
				},
			],
		},
	],
};

export class DateTimeV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			// Get all the timezones to display them to user so that they can
			// select them easily
			async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		const returnData: INodeExecutionData[] = [];

		const workflowTimezone = this.getTimezone();
		let item: INodeExecutionData;

		for (let i = 0; i < length; i++) {
			try {
				const action = this.getNodeParameter('action', 0) as string;
				item = items[i];

				if (action === 'format') {
					let currentDate: string | number | LuxonDateTime = this.getNodeParameter(
						'value',
						i,
					) as string;
					const dataPropertyName = this.getNodeParameter('dataPropertyName', i);
					const toFormat = this.getNodeParameter('toFormat', i) as string;
					const options = this.getNodeParameter('options', i);
					let newDate;

					if ((currentDate as unknown as IDataObject) instanceof LuxonDateTime) {
						currentDate = (currentDate as unknown as LuxonDateTime).toISO();
					}

					// Check if the input is a number
					if (!Number.isNaN(Number(currentDate))) {
						//input is a number, convert to number in case it is a string
						currentDate = Number(currentDate);
						// check if the number is a timestamp in float format and convert to integer
						if (!Number.isInteger(currentDate)) {
							currentDate = currentDate * 1000;
						}
					}

					if (currentDate === undefined) {
						continue;
					}
					if (options.fromFormat === undefined && !moment(currentDate).isValid()) {
						throw new NodeOperationError(
							this.getNode(),
							'日期输入格式无法识别。请设置"输入格式"字段',
							{ itemIndex: i },
						);
					}

					if (Number.isInteger(currentDate)) {
						const timestampLengthInMilliseconds1990 = 12;
						// check if the number is a timestamp in seconds or milliseconds and create a moment object accordingly
						if (currentDate.toString().length < timestampLengthInMilliseconds1990) {
							newDate = moment.unix(currentDate as number);
						} else {
							newDate = moment(currentDate);
						}
					} else {
						if (options.fromTimezone || options.toTimezone) {
							const fromTimezone = options.fromTimezone || workflowTimezone;
							if (options.fromFormat) {
								newDate = moment.tz(
									currentDate as string,
									options.fromFormat as string,
									fromTimezone as string,
								);
							} else {
								newDate = moment.tz(currentDate, fromTimezone as string);
							}
						} else {
							if (options.fromFormat) {
								newDate = moment(currentDate, options.fromFormat as string);
							} else {
								newDate = moment(currentDate);
							}
						}
					}

					if (options.toTimezone || options.fromTimezone) {
						// If either a source or a target timezone got defined the
						// timezone of the date has to be changed. If a target-timezone
						// is set use it else fall back to workflow timezone.
						newDate = newDate.tz((options.toTimezone as string) || workflowTimezone);
					}

					newDate = newDate.format(toFormat);

					let newItem: INodeExecutionData;
					if (dataPropertyName.includes('.')) {
						// Uses dot notation so copy all data
						newItem = {
							json: deepCopy(item.json),
							pairedItem: {
								item: i,
							},
						};
					} else {
						// Does not use dot notation so shallow copy is enough
						newItem = {
							json: { ...item.json },
							pairedItem: {
								item: i,
							},
						};
					}

					if (item.binary !== undefined) {
						newItem.binary = item.binary;
					}

					set(newItem, ['json', dataPropertyName], newDate);

					returnData.push(newItem);
				}

				if (action === 'calculate') {
					const dateValue = this.getNodeParameter('value', i) as string;
					const operation = this.getNodeParameter('operation', i) as 'add' | 'subtract';
					const duration = this.getNodeParameter('duration', i) as number;
					const timeUnit = this.getNodeParameter('timeUnit', i) as moment.DurationInputArg2;
					const { fromFormat } = this.getNodeParameter('options', i) as { fromFormat?: string };
					const dataPropertyName = this.getNodeParameter('dataPropertyName', i);

					const newDate = fromFormat
						? parseDateByFormat.call(this, dateValue, fromFormat)
						: parseDateByDefault.call(this, dateValue);

					operation === 'add'
						? newDate.add(duration, timeUnit).utc().format()
						: newDate.subtract(duration, timeUnit).utc().format();

					let newItem: INodeExecutionData;
					if (dataPropertyName.includes('.')) {
						// Uses dot notation so copy all data
						newItem = {
							json: deepCopy(item.json),
							pairedItem: {
								item: i,
							},
						};
					} else {
						// Does not use dot notation so shallow copy is enough
						newItem = {
							json: { ...item.json },
							pairedItem: {
								item: i,
							},
						};
					}

					if (item.binary !== undefined) {
						newItem.binary = item.binary;
					}

					set(newItem, ['json', dataPropertyName], newDate.toISOString());

					returnData.push(newItem);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
