import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: '模型',
		name: 'model',
		type: 'options',
		options: [
			{
				name: 'mistral-ocr-latest',
				value: 'mistral-ocr-latest',
			},
		],
		description: '要使用的 OCR 模型',
		required: true,
		default: 'mistral-ocr-latest',
	},
	{
		displayName: '文档类型',
		name: 'documentType',
		type: 'options',
		options: [
			{
				name: '文档',
				value: 'document_url',
			},
			{
				name: '图片',
				value: 'image_url',
			},
		],
		description: '要处理的文档类型',
		required: true,
		default: 'document_url',
	},
	{
		displayName: '输入类型',
		name: 'inputType',
		type: 'options',
		options: [
			{
				name: '二进制数据',
				value: 'binary',
			},
			{
				name: 'URL',
				value: 'url',
			},
		],
		description: '文档的提供方式',
		required: true,
		default: 'binary',
		disabledOptions: {
			show: {
				'options.batch': [true],
			},
		},
	},
	{
		displayName: '输入二进制字段',
		name: 'binaryProperty',
		type: 'string',
		description: '包含要处理文件的输入二进制字段名称',
		placeholder: '例如：data',
		hint: '上传的文档文件大小不得超过 50 MB，且页数不得超过 1,000 页。',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		description: '要处理的文档或图片的 URL',
		placeholder: '例如：https://example.com/document.pdf',
		required: true,
		default: '',
		displayOptions: {
			show: {
				inputType: ['url'],
			},
		},
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '启用批处理',
				name: 'batch',
				type: 'boolean',
				description: '是否在单次 API 调用中处理多个文档（更具成本效益）',
				default: false,
			},
			{
				displayName: '批处理大小',
				name: 'batchSize',
				type: 'number',
				description: '单次批处理中要处理的最大文档数',
				default: 50,
				typeOptions: { maxValue: 2048 },
				required: true,
				displayOptions: {
					show: {
						batch: [true],
					},
				},
			},
			{
				displayName: '处理后删除文件',
				name: 'deleteFiles',
				type: 'boolean',
				default: true,
				description: '是否在处理后删除 Mistral Cloud 上的文件',
				displayOptions: {
					show: {
						batch: [true],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['document'],
		operation: ['extractText'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
