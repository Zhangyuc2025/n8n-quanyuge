import type { INodeProperties } from 'n8n-workflow';

import * as concatenateItems from './concatenateItems.operation';
import * as limit from './limit.operation';
import * as removeDuplicates from './removeDuplicates.operation';
import * as sort from './sort.operation';
import * as splitOutItems from './splitOutItems.operation';
import * as summarize from './summarize.operation';

export { concatenateItems, limit, removeDuplicates, sort, splitOutItems, summarize };

export const description: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['itemList'],
			},
		},
		options: [
			{
				name: '合并项目',
				value: 'concatenateItems',
				description: '将字段合并到单个新项中的列表',
				action: '合并项目',
			},
			{
				name: '限制',
				value: 'limit',
				description: '如果项目过多则删除',
				action: '限制',
			},
			{
				name: '删除重复项',
				value: 'removeDuplicates',
				description: '删除相似的额外项目',
				action: '删除重复项',
			},
			{
				name: '排序',
				value: 'sort',
				description: '更改项目顺序',
				action: '排序',
			},
			{
				name: '拆分项目',
				value: 'splitOutItems',
				description: '将项目中对象属性的列表或值转换为单独的项目',
				action: '拆分项目',
			},
			{
				name: '汇总',
				value: 'summarize',
				description: '将项目聚合在一起（数据透视表）',
				action: '汇总',
			},
		],
		default: 'splitOutItems',
	},
	...concatenateItems.description,
	...limit.description,
	...removeDuplicates.description,
	...sort.description,
	...splitOutItems.description,
	...summarize.description,
];
