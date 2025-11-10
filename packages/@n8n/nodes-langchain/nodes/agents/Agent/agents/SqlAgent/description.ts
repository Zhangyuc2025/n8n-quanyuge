import type { INodeProperties } from 'n8n-workflow';

import {
	promptTypeOptions,
	textFromGuardrailsNode,
	textFromPreviousNode,
	textInput,
} from '@utils/descriptions';

import { SQL_PREFIX, SQL_SUFFIX } from './other/prompts';

const dataSourceOptions: INodeProperties = {
	displayName: '数据源',
	name: 'dataSource',
	type: 'options',
	displayOptions: {
		show: {
			agent: ['sqlAgent'],
		},
	},
	default: 'sqlite',
	description: '要连接的 SQL 数据库',
	options: [
		{
			name: 'MySQL',
			value: 'mysql',
			description: '连接到 MySQL 数据库',
		},
		{
			name: 'Postgres',
			value: 'postgres',
			description: '连接到 Postgres 数据库',
		},
		{
			name: 'SQLite',
			value: 'sqlite',
			description: '通过二进制输入连接数据库文件来使用 SQLite',
		},
	],
};

export const sqlAgentAgentProperties: INodeProperties[] = [
	{
		...dataSourceOptions,
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
				'@version': [{ _cnd: { lt: 1.4 } }],
			},
		},
	},
	{
		...dataSourceOptions,
		default: 'postgres',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
				'@version': [{ _cnd: { gte: 1.4 } }],
			},
		},
	},
	{
		displayName: '凭据',
		name: 'credentials',
		type: 'credentials',
		default: '',
	},
	{
		displayName:
			'将 SQLite 数据库作为二进制数据传递到此节点，例如在之前插入 "从磁盘读取/写入文件" 节点',
		name: 'sqLiteFileNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
				dataSource: ['sqlite'],
			},
		},
	},
	{
		displayName: '输入二进制字段',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: '例如 data',
		hint: '包含要提取的文件的输入二进制字段名称',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
				dataSource: ['sqlite'],
			},
		},
	},
	{
		displayName: '提示词',
		name: 'input',
		type: 'string',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
				'@version': [{ _cnd: { lte: 1.2 } }],
			},
		},
		default: '',
		required: true,
		typeOptions: {
			rows: 5,
		},
	},
	{
		...promptTypeOptions,
		displayOptions: {
			hide: {
				'@version': [{ _cnd: { lte: 1.2 } }],
			},
			show: {
				agent: ['sqlAgent'],
			},
		},
	},
	{
		...textFromGuardrailsNode,
		displayOptions: {
			show: {
				promptType: ['guardrails'],
				'@version': [{ _cnd: { gte: 1.7 } }],
				agent: ['sqlAgent'],
			},
		},
	},
	{
		...textFromPreviousNode,
		displayOptions: {
			show: { promptType: ['auto'], '@version': [{ _cnd: { gte: 1.7 } }], agent: ['sqlAgent'] },
		},
	},
	{
		...textInput,
		displayOptions: {
			show: {
				promptType: ['define'],
				agent: ['sqlAgent'],
			},
		},
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
			},
		},
		default: {},
		placeholder: '添加选项',
		options: [
			{
				displayName: '忽略的表',
				name: 'ignoredTables',
				type: 'string',
				default: '',
				description: '要从数据库中忽略的表的逗号分隔列表。如果为空，则不忽略任何表。',
			},
			{
				displayName: '包含示例行',
				name: 'includedSampleRows',
				type: 'number',
				description:
					'在代理提示中包含的示例行数。这有助于代理理解数据库的模式，但也会增加使用的令牌数量。',
				default: 3,
			},
			{
				displayName: '包含的表',
				name: 'includedTables',
				type: 'string',
				default: '',
				description: '要包含在数据库中的表的逗号分隔列表。如果为空，则包含所有表。',
			},
			{
				displayName: '前缀提示词',
				name: 'prefixPrompt',
				type: 'string',
				default: SQL_PREFIX,
				description: '用于代理的前缀提示词',
				typeOptions: {
					rows: 10,
				},
			},
			{
				displayName: '后缀提示词',
				name: 'suffixPrompt',
				type: 'string',
				default: SQL_SUFFIX,
				description: '用于代理的后缀提示词',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: '限制',
				name: 'topK',
				type: 'number',
				default: 10,
				description: '要返回的最大结果数',
			},
		],
	},
];
