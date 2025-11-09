import type { INodeProperties } from 'n8n-workflow';

import { buildBinAPIURL, transformBinResponse } from './GenericFunctions';

// Operations for the `Bin` resource:
export const binOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bin'],
			},
		},
		options: [
			{
				name: '创建',
				value: 'create',
				description: '创建 bin',
				routing: {
					request: {
						method: 'POST',
						url: '/api/bin',
					},
					output: {
						postReceive: [transformBinResponse],
					},
				},
				action: '创建 bin',
			},
			{
				name: '获取',
				value: 'get',
				description: '获取 bin',
				routing: {
					request: {
						method: 'GET',
					},
					output: {
						postReceive: [transformBinResponse],
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinAPIURL,
						],
					},
				},
				action: '获取 bin',
			},
			{
				name: '删除',
				value: 'delete',
				description: '删除 bin',
				routing: {
					request: {
						method: 'DELETE',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinAPIURL,
						],
					},
				},
				action: '删除 bin',
			},
		],
		default: 'create',
	},
];

// Properties of the `Bin` resource
export const binFields: INodeProperties[] = [
	{
		displayName: 'Bin ID',
		name: 'binId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['bin'],
				operation: ['get', 'delete'],
			},
		},
		description: '每个 bin 的唯一标识符',
	},
];
