import type { INodeProperties } from 'n8n-workflow';

import * as deleteRows from './delete.operation';
import * as rowExists from './rowExists.operation';
import * as rowNotExists from './rowNotExists.operation';
import * as get from './get.operation';
import * as insert from './insert.operation';
import * as update from './update.operation';
import * as upsert from './upsert.operation';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';

export { insert, get, rowExists, rowNotExists, deleteRows, update, upsert };

export const description: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				name: '删除',
				value: deleteRows.FIELD,
				description: '删除行',
				action: '删除行',
			},
			{
				name: '获取',
				value: get.FIELD,
				description: '获取行',
				action: '获取行',
			},
			{
				name: '如果行存在',
				value: rowExists.FIELD,
				description: '匹配数据表中存在的输入项',
				action: '如果行存在',
			},
			{
				name: '如果行不存在',
				value: rowNotExists.FIELD,
				description: '匹配数据表中不存在的输入项',
				action: '如果行不存在',
			},
			{
				name: '插入',
				value: insert.FIELD,
				description: '插入新行',
				action: '插入行',
			},
			{
				name: '更新',
				value: update.FIELD,
				description: '更新匹配特定字段的行',
				action: '更新行',
			},
			{
				name: '插入或更新',
				value: upsert.FIELD,
				description: '更新行，或如果没有匹配则插入',
				action: '插入或更新行',
			},
		],
		default: 'insert',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: '数据表',
		name: DATA_TABLE_ID_FIELD,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: '从列表选择',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'tableSearch',
					searchable: true,
					allowNewResource: {
						label: 'resourceLocator.dataTable.createNew',
						url: '/projects/{{$projectId}}/datatables/new',
					},
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
			},
		],
		displayOptions: { show: { resource: ['row'] } },
	},
	...deleteRows.description,
	...insert.description,
	...get.description,
	...rowExists.description,
	...rowNotExists.description,
	...update.description,
	...upsert.description,
];
