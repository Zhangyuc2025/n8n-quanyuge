import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { binFields, binOperations } from './BinDescription';
import { requestFields, requestOperations } from './RequestDescription';

export class PostBin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PostBin',
		name: 'postBin',
		icon: 'file:postbin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: '使用 PostBin API',
		defaults: {
			name: 'PostBin',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		requestDefaults: {
			baseURL: 'https://www.postb.in',
		},
		properties: [
			{
				displayName: '资源',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Bin',
						value: 'bin',
					},
					{
						name: '请求',
						value: 'request',
					},
				],
				default: 'bin',
				required: true,
			},
			...binOperations,
			...binFields,
			...requestOperations,
			...requestFields,
		],
	};
}
