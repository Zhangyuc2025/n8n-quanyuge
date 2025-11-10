import type { INodeProperties } from 'n8n-workflow';

import { HUMAN_MESSAGE_TEMPLATE, PREFIX, SUFFIX, SUFFIX_CHAT } from './prompt';

export const reActAgentAgentProperties: INodeProperties[] = [
	{
		displayName: '文本',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['reActAgent'],
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
				agent: ['reActAgent'],
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
				agent: ['reActAgent'],
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
				agent: ['reActAgent'],
			},
		},
		default: {},
		placeholder: '添加选项',
		options: [
			{
				displayName: '人类消息模板',
				name: 'humanMessageTemplate',
				type: 'string',
				default: HUMAN_MESSAGE_TEMPLATE,
				description: '直接用作人类消息模板的字符串',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: '前缀消息',
				name: 'prefix',
				type: 'string',
				default: PREFIX,
				description: '放在工具列表之前的字符串',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: '聊天模型后缀消息',
				name: 'suffixChat',
				type: 'string',
				default: SUFFIX_CHAT,
				description: '使用聊天模型时放在工具列表之后的字符串',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: '常规模型后缀消息',
				name: 'suffix',
				type: 'string',
				default: SUFFIX,
				description: '使用常规模型时放在工具列表之后的字符串',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: '最大迭代次数',
				name: 'maxIterations',
				type: 'number',
				default: 10,
				description: '代理停止前将运行的最大迭代次数',
			},
			{
				displayName: '返回中间步骤',
				name: 'returnIntermediateSteps',
				type: 'boolean',
				default: false,
				description: '是否在输出中包含代理采取的中间步骤',
			},
		],
	},
];
