import type { INodeProperties } from 'n8n-workflow';

export const DATA_TABLE_ID_FIELD = 'dataTableId';

export const DRY_RUN = {
	displayName: '模拟运行',
	name: 'dryRun',
	type: 'boolean',
	default: false,
	description: '操作是否模拟并返回受影响行的"前"和"后"状态',
} satisfies INodeProperties;
