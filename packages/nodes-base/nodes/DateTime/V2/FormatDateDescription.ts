import type { INodeProperties } from 'n8n-workflow';

import { includeInputFields } from './common.descriptions';

export const FormatDateDescription: INodeProperties[] = [
	{
		displayName:
			"您也可以使用表达式完成此操作，例如 <code>{{your_date.format('yyyy-MM-dd')}}</code>。<a target='_blank' href='https://docs.n8n.io/code/cookbook/luxon/'>了解更多</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
	},
	{
		displayName: '日期',
		name: 'date',
		type: 'string',
		description: '您要格式化的日期',
		default: '',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
	},
	{
		displayName: '格式',
		name: 'format',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['formatDate'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: '自定义格式',
				value: 'custom',
			},
			{
				name: 'MM/DD/YYYY',
				value: 'MM/dd/yyyy',
				description: '例：09/04/1986',
			},
			{
				name: 'YYYY/MM/DD',
				value: 'yyyy/MM/dd',
				description: '例：1986/04/09',
			},
			{
				name: 'MMMM DD YYYY',
				value: 'MMMM dd yyyy',
				description: '例：April 09 1986',
			},
			{
				name: 'MM-DD-YYYY',
				value: 'MM-dd-yyyy',
				description: '例：09-04-1986',
			},
			{
				name: 'YYYY-MM-DD',
				value: 'yyyy-MM-dd',
				description: '例：1986-04-09',
			},
			{
				name: 'Unix 时间戳',
				value: 'X',
				description: '例：1672531200',
			},
			{
				name: 'Unix 毫秒时间戳',
				value: 'x',
				description: '例：1674691200000',
			},
		],
		default: 'MM/dd/yyyy',
		description: '要将日期转换为的格式',
	},
	{
		displayName: '自定义格式',
		name: 'customFormat',
		type: 'string',
		displayOptions: {
			show: {
				format: ['custom'],
				operation: ['formatDate'],
			},
		},
		hint: '特殊令牌列表 <a target="_blank" href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">了解更多</a>',
		default: '',
		placeholder: 'yyyy-MM-dd',
	},
	{
		displayName: '输出字段名称',
		name: 'outputFieldName',
		type: 'string',
		default: 'formattedDate',
		description: '放置输出的字段名称',
		displayOptions: {
			show: {
				operation: ['formatDate'],
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
				operation: ['formatDate'],
			},
		},
		default: {},
		options: [
			includeInputFields,
			{
				displayName: '来自日期格式',
				name: 'fromFormat',
				type: 'string',
				default: '例如 yyyyMMdd',
				hint: '令牌区分大小写',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'输入"日期"的格式，当格式无法自动识别时很有帮助。使用这些 <a href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens&id=table-of-tokens" target="_blank">令牌</a> 定义格式。',
			},
			{
				displayName: '使用工作流时区',
				name: 'timezone',
				type: 'boolean',
				default: false,
				description: '是否使用输入的时区或工作流的时区',
			},
		],
	},
];
