import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const CurrentDateDescription: INodeProperties[] = [
	{
		displayName:
			'您也可以在 n8n 表达式中使用 <code>{{$now}}</code> 或 <code>{{$today}}</code> 来引用当前日期。<a target="_blank" href="https://docs.n8n.io/code/cookbook/luxon/">了解更多</a>',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
			},
		},
	},
	{
		displayName: '包含当前时间',
		name: 'includeTime',
		type: 'boolean',
		default: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: '禁用时，时间将设置为午夜',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
			},
		},
	},
	{
		displayName: '输出字段名称',
		name: 'outputFieldName',
		type: 'string',
		default: 'currentDate',
		description: '放置输出的字段名称',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
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
				operation: ['getCurrentDate'],
			},
		},
		default: {},
		options: [
			includeInputFields,
			{
				displayName: '时区',
				name: 'timezone',
				type: 'string',
				placeholder: 'America/New_York',
				default: '',
				description:
					'要使用的时区。如果未设置，将使用 n8n 实例的时区。使用 "GMT" 表示 +00:00 时区。',
			},
		],
	},
];
