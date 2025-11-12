import type { INodeProperties } from 'n8n-workflow';

import { buildBinTestURL, buildRequestURL } from './GenericFunctions';

// Operations for the `Request` resource
export const requestOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['request'],
			},
		},
		options: [
			{
				name: '获取',
				value: 'get',
				description: '获取请求',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/bin/{{$parameter["binId"]}}/req/{{$parameter["requestId"]}}',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildRequestURL,
						],
					},
				},
				action: '获取请求',
			},
			{
				name: '移除第一个',
				value: 'removeFirst',
				description: '从 bin 中移除第一个请求',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/bin/{{$parameter["binId"]}}/req/shift',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildRequestURL,
						],
					},
				},
				action: '移除第一个请求',
			},
			{
				name: '发送',
				value: 'send',
				description: '向 bin 发送测试请求',
				routing: {
					request: {
						method: 'POST',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinTestURL,
						],
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "requestId": $response.body } }}',
								},
							},
						],
					},
				},
				action: '发送请求',
			},
		],
		default: 'get',
	},
];

// Properties of the `Request` resource
export const requestFields: INodeProperties[] = [
	{
		displayName: 'Bin ID',
		name: 'binId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['request'],
				operation: ['get', 'removeFirst', 'send'],
			},
		},
		description: '每个 bin 的唯一标识符',
	},
	{
		displayName: 'Bin 内容',
		name: 'binContent',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				resource: ['request'],
				operation: ['send'],
			},
		},
		// Content is sent in the body of POST requests
		routing: {
			send: {
				property: 'content',
				type: 'body',
			},
		},
	},
	{
		displayName: '请求 ID',
		name: 'requestId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['request'],
				operation: ['get'],
			},
		},
		description: '每个请求的唯一标识符',
	},
];
