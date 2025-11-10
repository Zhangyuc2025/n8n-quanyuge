import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE } from './prompt';

export const planAndExecuteAgentProperties: INodeProperties[] = [
	{
		displayName: '文本',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['planAndExecuteAgent'],
				'@version': [1],
			},
		},
		default: '={{ $json.input }}',
	},
	{
		displayName: '文本',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['planAndExecuteAgent'],
				'@version': [1.1],
			},
		},
		default: '={{ $json.chat_input }}',
	},
	{
		displayName: '文本',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['planAndExecuteAgent'],
				'@version': [1.2],
			},
		},
		default: '={{ $json.chatInput }}',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				agent: ['planAndExecuteAgent'],
			},
		},
		default: {},
		placeholder: '添加选项',
		options: [
			{
				displayName: '人类消息模板',
				name: 'humanMessageTemplate',
				type: 'string',
				default: DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE,
				description: '在每个步骤执行期间发送给智能体的消息',
				typeOptions: {
					rows: 6,
				},
			},
		],
	},
];
