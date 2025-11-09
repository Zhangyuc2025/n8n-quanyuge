import type { INodeProperties } from 'n8n-workflow';

import * as extractText from './extractText.operation';

export const description: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: '提取文本',
				value: 'extractText',
				description: '使用 OCR 从文档中提取文本',
				action: '提取文本',
			},
		],
		default: 'extractText',
	},

	...extractText.description,
];
