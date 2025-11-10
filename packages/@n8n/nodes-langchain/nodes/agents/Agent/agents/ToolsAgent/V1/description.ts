import type { INodeProperties } from 'n8n-workflow';

import { commonOptions } from '../options';

export const toolsAgentProperties: INodeProperties[] = [
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				agent: ['toolsAgent'],
			},
		},
		default: {},
		placeholder: '添加选项',
		options: [...commonOptions],
	},
];
