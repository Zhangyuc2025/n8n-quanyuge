import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const ExtractDateDescription: INodeProperties[] = [
	{
		displayName:
			'您也可以使用表达式完成此操作，例如 <code>{{ your_date.extract("month") }}}</code>。<a target="_blank" href="https://docs.n8n.io/code/cookbook/luxon/">了解更多</a>',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
	{
		displayName: '日期',
		name: 'date',
		type: 'string',
		description: '要提取的日期',
		default: '',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
	{
		displayName: '部分',
		name: 'part',
		type: 'options',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: '年',
				value: 'year',
			},
			{
				name: '月',
				value: 'month',
			},
			{
				name: '周',
				value: 'week',
			},
			{
				name: '日',
				value: 'day',
			},
			{
				name: '小时',
				value: 'hour',
			},
			{
				name: '分钟',
				value: 'minute',
			},
			{
				name: '秒',
				value: 'second',
			},
		],
		default: 'month',
		displayOptions: {
			show: {
				operation: ['extractDate'],
			},
		},
	},
	{
		displayName: '输出字段名称',
		name: 'outputFieldName',
		type: 'string',
		default: 'datePart',
		description: '放置输出的字段名称',
		displayOptions: {
			show: {
				operation: ['extractDate'],
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
				operation: ['extractDate'],
			},
		},
		default: {},
		options: [includeInputFields],
	},
];
