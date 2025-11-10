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

export const getToolsAgentProperties = ({
	withStreaming,
}: { withStreaming: boolean }): INodeProperties[] => [
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: '添加选项',
		options: [
			...commonOptions,
			getBatchingOptionFields(undefined, 1),
			...(withStreaming ? [enableStreaminOption] : []),
		],
		displayOptions: {
			hide: {
				'@version': [{ _cnd: { lt: 2.2 } }],
			},
		},
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: '添加选项',
		options: [...commonOptions, getBatchingOptionFields(undefined, 1)],
		displayOptions: {
			show: {
				'@version': [{ _cnd: { lt: 2.2 } }],
			},
		},
	},
];
