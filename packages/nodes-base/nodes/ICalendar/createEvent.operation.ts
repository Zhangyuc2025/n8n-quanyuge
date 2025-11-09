import * as ics from 'ics';
import moment from 'moment-timezone';
import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { promisify } from 'util';

const createEvent = promisify(ics.createEvent);

export const description: INodeProperties[] = [
	{
		displayName: '事件标题',
		name: 'title',
		type: 'string',
		default: '',
		placeholder: '例如：新事件',
	},
	{
		displayName: '开始时间',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description: '事件开始的日期和时间（对于全天事件，时间将被忽略）',
	},
	{
		displayName: '结束时间',
		name: 'end',
		type: 'dateTime',
		default: '',
		required: true,
		description: '事件结束的日期和时间（对于全天事件，时间将被忽略）',
		hint: '如果未设置，将等于开始日期',
	},
	{
		displayName: '全天',
		name: 'allDay',
		type: 'boolean',
		default: false,
		description: '事件是否持续全天',
	},
	{
		displayName: '输出文件字段',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: '要将文件放入的输出二进制字段名称',
		description: '你的 iCalendar 文件将在输出中的该字段下可用',
	},
	{
		displayName: '选项',
		name: 'additionalFields',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '参与者',
				name: 'attendeesUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: '添加参与者',
				default: {},
				options: [
					{
						displayName: '参与者',
						name: 'attendeeValues',
						values: [
							{
								displayName: '姓名',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
							},
							{
								displayName: '邮箱',
								name: 'email',
								type: 'string',
								placeholder: '例如：name@email.com',
								required: true,
								default: '',
							},
							{
								displayName: 'RSVP',
								name: 'rsvp',
								type: 'boolean',
								default: false,
								description: '参与者是否需要确认出席',
							},
						],
					},
				],
			},
			{
				displayName: '忙碌状态',
				name: 'busyStatus',
				type: 'options',
				options: [
					{
						name: '忙碌',
						value: 'BUSY',
					},
					{
						name: '待定',
						value: 'TENTATIVE',
					},
				],
				default: '',
				description: '用于指定 Microsoft 应用程序（如 Outlook）的忙碌状态',
			},
			{
				displayName: '日历名称',
				name: 'calName',
				type: 'string',
				default: '',
				description:
					'指定日历（非事件）名称。由 Apple iCal 和 Microsoft Outlook 使用。<a href="https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxcical/1da58449-b97e-46bd-b018-a1ce576f3e6d">更多信息</a>',
			},
			{
				displayName: '描述',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: '例如：event.ics',
				description: '要生成的文件名称。默认名称为 event.ics',
			},
			{
				displayName: '地理位置',
				name: 'geolocationUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: '添加地理位置',
				default: {},
				options: [
					{
						displayName: '地理位置',
						name: 'geolocationValues',
						values: [
							{
								displayName: '纬度',
								name: 'lat',
								type: 'string',
								default: '',
							},
							{
								displayName: '经度',
								name: 'lon',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: '位置',
				name: 'location',
				type: 'string',
				default: '',
				description: '预期场地',
			},
			{
				displayName: '重复规则',
				name: 'recurrenceRule',
				type: 'string',
				default: '',
				description:
					'定义事件重复模式的规则 (RRULE)。（<a href="https://icalendar.org/rrule-tool.html">规则生成器</a>）',
			},
			{
				displayName: '组织者',
				name: 'organizerUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: '添加组织者',
				default: {},
				options: [
					{
						displayName: '组织者',
						name: 'organizerValues',
						values: [
							{
								displayName: '姓名',
								name: 'name',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: '邮箱',
								name: 'email',
								type: 'string',
								placeholder: '例如：name@email.com',
								default: '',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: '序列号',
				name: 'sequence',
				type: 'number',
				default: 0,
				description: '当发送事件更新时（具有相同的 uid），定义修订序列号',
			},
			{
				displayName: '状态',
				name: 'status',
				type: 'options',
				options: [
					{
						name: '已确认',
						value: 'CONFIRMED',
					},
					{
						name: '已取消',
						value: 'CANCELLED',
					},
					{
						name: '待定',
						value: 'TENTATIVE',
					},
				],
				default: 'CONFIRMED',
			},
			{
				displayName: 'UID',
				name: 'uid',
				type: 'string',
				default: '',
				description: '事件的全局唯一 ID（如果未在此指定，将自动生成）。应该是全局唯一的',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: '与事件关联的 URL',
			},
			{
				displayName: '使用工作流时区',
				name: 'useWorkflowTimezone',
				type: 'boolean',
				default: false,
				description: '是否使用节点设置中的工作流时区而不是 UTC',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	const workflowTimezone = this.getTimezone();

	for (let i = 0; i < items.length; i++) {
		try {
			const title = this.getNodeParameter('title', i) as string;
			const allDay = this.getNodeParameter('allDay', i) as boolean;

			let start = this.getNodeParameter('start', i) as string;
			let end = this.getNodeParameter('end', i) as string;

			if (!end) {
				end = start;
			}

			end = allDay ? moment(end).utc().add(1, 'day').format() : end;

			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
			const options = this.getNodeParameter('additionalFields', i);

			if (options.useWorkflowTimezone) {
				start = moment(start).tz(workflowTimezone).format();
				end = moment(end).tz(workflowTimezone).format();
				delete options.useWorkflowTimezone;
			}

			let fileName = 'event.ics';

			const eventStart = moment(start)
				.toArray()
				.splice(0, allDay ? 3 : 6) as ics.DateArray;
			eventStart[1]++;

			const eventEnd = moment(end)
				.toArray()
				.splice(0, allDay ? 3 : 6) as ics.DateArray;
			eventEnd[1]++;

			if (options.fileName) {
				fileName = options.fileName as string;
			}

			const data: ics.EventAttributes = {
				title,
				start: eventStart,
				end: eventEnd,
				startInputType: 'utc',
				endInputType: 'utc',
			};

			if (options.geolocationUi) {
				data.geo = (options.geolocationUi as IDataObject).geolocationValues as ics.GeoCoordinates;
				delete options.geolocationUi;
			}

			if (options.organizerUi) {
				data.organizer = (options.organizerUi as IDataObject).organizerValues as ics.Person;
				delete options.organizerUi;
			}

			if (options.attendeesUi) {
				data.attendees = (options.attendeesUi as IDataObject).attendeeValues as ics.Attendee[];
				delete options.attendeesUi;
			}

			Object.assign(data, options);
			const buffer = Buffer.from((await createEvent(data)) as string);
			const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, 'text/calendar');
			returnData.push({
				json: {},
				binary: {
					[binaryPropertyName]: binaryData,
				},
				pairedItem: {
					item: i,
				},
			});
		} catch (error) {
			const errorDescription = error.description;
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
			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description: errorDescription,
			});
		}
	}

	return returnData;
}
