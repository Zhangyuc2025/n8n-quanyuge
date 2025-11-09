import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const SubtractFromDateDescription: INodeProperties[] = [
	{
		displayName:
			"您也可以使用表达式完成此操作，例如 <code>{{your_date.minus(5, 'minutes')}}</code>。<a target='_blank' href='https://docs.n8n.io/code/cookbook/luxon/'>了解更多</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
	},
	{
		displayName: '要减去的日期',
		name: 'magnitude',
		type: 'string',
		description: '要更改的日期',
		default: '',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
		required: true,
	},
	{
		displayName: '要减去的时间单位',
		name: 'timeUnit',
		description: '下面"时长"参数的时间单位',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
		type: 'options',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: '年',
				value: 'years',
			},
			{
				name: '季度',
				value: 'quarters',
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
		displayName: '时长',
		name: 'duration',
		type: 'number',
		description: '要从日期中减去的时间单位数',
		default: 0,
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
	},
	{
		displayName: '输出字段名称',
		name: 'outputFieldName',
		type: 'string',
		default: 'newDate',
		description: '放置输出的字段名称',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		displayOptions: {
			show: {
				operation: ['subtractFromDate'],
			},
		},
		default: {},
		options: [includeInputFields],
	},
];
