/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as itemList from './itemList';

export const versionDescription: INodeTypeDescription = {
	displayName: '项目列表',
	name: 'itemLists',
	icon: 'file:itemLists.svg',
	group: ['input'],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: '用于处理项目列表和转换数组的辅助工具',
	version: [3, 3.1],
	defaults: {
		name: '项目列表',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [],
	properties: [
		{
			displayName: '资源',
			name: 'resource',
			type: 'hidden',
			options: [
				{
					name: '项目列表',
					value: 'itemList',
				},
			],
			default: 'itemList',
		},
		...itemList.description,
	],
};
