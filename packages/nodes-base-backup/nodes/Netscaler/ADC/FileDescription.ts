import type { INodeProperties } from 'n8n-workflow';

export const fileDescription: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: '删除',
				value: 'delete',
				action: '删除文件',
			},
			{
				name: '下载',
				value: 'download',
				action: '下载文件',
			},
			{
				name: '上传',
				value: 'upload',
				action: '上传文件',
			},
		],
		default: 'upload',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},
	// Upload --------------------------------------------------------------------------
	{
		displayName: '文件位置',
		name: 'fileLocation',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		default: '/nsconfig/ssl/',
	},
	{
		displayName: '输入数据字段名',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		default: 'data',
		description: '包含要处理的二进制文件数据的传入字段的名称',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		options: [
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				description: '文件的名称。不应包含文件路径。',
			},
		],
	},
	// Delete, Download ---------------------------------------------------------------
	{
		displayName: '文件位置',
		name: 'fileLocation',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete', 'download'],
				resource: ['file'],
			},
		},
		default: '/nsconfig/ssl/',
	},
	{
		displayName: '文件名',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		description: '文件的名称。不应包含文件路径。',
		displayOptions: {
			show: {
				operation: ['delete', 'download'],
				resource: ['file'],
			},
		},
	},
	{
		displayName: '放入输出字段',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description: '放置二进制文件数据的输出字段的名称',
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['file'],
			},
		},
	},
];
