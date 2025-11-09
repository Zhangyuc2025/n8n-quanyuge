import type { INodeProperties } from 'n8n-workflow';

import * as append from './append';
import * as chooseBranch from './chooseBranch';
import * as combineAll from './combineAll';
import * as combineByFields from './combineByFields';
import * as combineByPosition from './combineByPosition';
import * as combineBySql from './combineBySql';

export { append, chooseBranch, combineAll, combineByFields, combineBySql, combineByPosition };

export const description: INodeProperties[] = [
	{
		displayName: '模式',
		name: 'mode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: '追加',
				value: 'append',
				description: '将每个输入的项目依次输出',
			},
			{
				name: '组合',
				value: 'combine',
				description: '将匹配的项目合并在一起',
			},
			{
				name: 'SQL 查询',
				value: 'combineBySql',
				description: '编写查询语句进行合并',
			},
			{
				name: '选择分支',
				value: 'chooseBranch',
				description: '输出特定分支的数据，不进行修改',
			},
		],
		default: 'append',
		description: '如何合并输入数据',
	},
	{
		displayName: '组合方式',
		name: 'combineBy',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: '匹配字段',
				value: 'combineByFields',
				description: '组合具有相同字段值的项目',
			},
			{
				name: '位置',
				value: 'combineByPosition',
				description: '根据项目的顺序进行组合',
			},
			{
				name: '所有可能的组合',
				value: 'combineAll',
				description: '每两个项目的所有配对（交叉连接）',
			},
		],
		default: 'combineByFields',
		description: '如何合并输入数据',
		displayOptions: {
			show: { mode: ['combine'] },
		},
	},
	...append.description,
	...combineAll.description,
	...combineByFields.description,
	...combineBySql.description,
	...combineByPosition.description,
	...chooseBranch.description,
];
