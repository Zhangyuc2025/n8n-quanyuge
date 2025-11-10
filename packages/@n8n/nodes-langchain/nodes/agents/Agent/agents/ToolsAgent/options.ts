import type { INodeProperties } from 'n8n-workflow';

import { SYSTEM_MESSAGE } from './prompt';

export const commonOptions: INodeProperties[] = [
	{
		displayName: '系统消息',
		name: 'systemMessage',
		type: 'string',
		default: SYSTEM_MESSAGE,
		description: '在对话开始之前发送给智能体的消息',
		typeOptions: {
			rows: 6,
		},
	},
	{
		displayName: '最大迭代次数',
		name: 'maxIterations',
		type: 'number',
		default: 10,
		description: '智能体在停止前运行的最大迭代次数',
	},
	{
		displayName: '返回中间步骤',
		name: 'returnIntermediateSteps',
		type: 'boolean',
		default: false,
		description: '输出是否应包含智能体采取的中间步骤',
	},
	{
		displayName: '自动传递二进制图像',
		name: 'passthroughBinaryImages',
		type: 'boolean',
		default: true,
		description: '是否应自动将二进制图像作为图像类型消息传递给智能体',
	},
];
