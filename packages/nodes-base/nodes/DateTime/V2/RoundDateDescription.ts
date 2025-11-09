import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const RoundDateDescription: INodeProperties[] = [
	{
		displayName:
			"您也可以使用表达式完成此操作，例如 <code>{{ your_date.beginningOf('month') }}</code> 或 <code>{{ your_date.endOfMonth() }}</code>。<a target='_blank' href='https://docs.n8n.io/code/cookbook/luxon/'>了解更多</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['roundDate'],
			},
		},
	},
	{
		displayName: '日期',
		name: 'date',
		type: 'string',
		description: '要舍入的日期',
		default: '',
		displayOptions: {
			show: {
				operation: ['roundDate'],
			},
		},
	},
	{
		displayName: '模式',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: '向下舍入',
				value: 'roundDown',
			},
			{
				name: '向上舍入',
				value: 'roundUp',
			},
		],
		default: 'roundDown',
		displayOptions: {
			show: {
				operation: ['roundDate'],
			},
		},
	},
	{
		displayName: '舍入到最近的',
		name: 'toNearest',
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
				name: '天',
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
				operation: ['roundDate'],
				mode: ['roundDown'],
			},
		},
	},
	{
		displayName: '舍入到',
		name: 'to',
		type: 'options',
		options: [
			{
				name: '月末',
				value: 'month',
			},
		],
		default: 'month',
		displayOptions: {
			show: {
				operation: ['roundDate'],
				mode: ['roundUp'],
			},
		},
	},
	{
		displayName: '输出字段名称',
		name: 'outputFieldName',
		type: 'string',
		default: 'roundedDate',
		description: '放置输出的字段名称',
		displayOptions: {
			show: {
				operation: ['roundDate'],
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
				operation: ['roundDate'],
			},
		},
		default: {},
		options: [includeInputFields],
	},
];
