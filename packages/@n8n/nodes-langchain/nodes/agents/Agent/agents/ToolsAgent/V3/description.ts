import type { INodeProperties } from 'n8n-workflow';

import { getBatchingOptionFields } from '@utils/sharedFields';

import { commonOptions } from '../options';

const enableStreaminOption: INodeProperties = {
	displayName: '启用流式传输',
	name: 'enableStreaming',
	type: 'boolean',
	default: true,
	description: '此智能体是否在生成文本时实时流式传输响应',
};

const maxTokensFromMemoryOption: INodeProperties = {
	displayName: '从记忆读取的最大令牌数',
	name: 'maxTokensFromMemory',
	type: 'hidden',
	default: 0,
	description: '从聊天记忆历史中读取的最大令牌数。设置为 0 可读取所有历史记录。',
};

export const toolsAgentProperties: INodeProperties = {
	displayName: '选项',
	name: 'options',
	type: 'collection',
	default: {},
	placeholder: '添加选项',
	options: [
		...commonOptions,
		enableStreaminOption,
		getBatchingOptionFields(undefined, 1),
		maxTokensFromMemoryOption,
	],
};
