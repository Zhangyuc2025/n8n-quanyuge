import type { INodeProperties } from 'n8n-workflow';

import { SYSTEM_MESSAGE } from './prompt';

export const openAiFunctionsAgentProperties: INodeProperties[] = [
	{
		displayName: '文本',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['openAiFunctionsAgent'],
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
				agent: ['openAiFunctionsAgent'],
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
				agent: ['openAiFunctionsAgent'],
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
				agent: ['openAiFunctionsAgent'],
			},
		},
		default: {},
		placeholder: '添加选项',
		options: [
			{
				displayName: '系统消息',
				name: 'systemMessage',
				type: 'string',
				default: SYSTEM_MESSAGE,
				description: '在对话开始前发送给智能体的消息',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: '最大迭代次数',
				name: 'maxIterations',
				type: 'number',
				default: 10,
				description: '智能体停止前运行的最大迭代次数',
			},
			{
				displayName: '返回中间步骤',
				name: 'returnIntermediateSteps',
				type: 'boolean',
				default: false,
				description: '输出是否应包含智能体采取的中间步骤',
			},
		],
	},
];
