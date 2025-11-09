import type {
	IDataTableProjectService,
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getAddRow, makeAddRow } from '../../common/addRow';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'insert';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	makeAddRow(FIELD, displayOptions),
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '优化批量',
				name: 'optimizeBulk',
				type: 'boolean',
				default: false,
				noDataExpression: true, // bulk inserts don't support expressions so this is a bit paradoxical
				description: '是否通过不返回插入的数据来将批量插入性能提高5倍',
			},
		],
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const optimizeBulkEnabled = this.getNodeParameter('options.optimizeBulk', index, false);
	const dataTableProxy = await getDataTableProxyExecute(this, index);

	const row = getAddRow(this, index);

	if (optimizeBulkEnabled) {
		// This function is always called by index, so we inherently cannot operate in bulk
		this.addExecutionHints({
			message: '由于数据表 ID 中的表达式，无法优化批量插入',
			location: 'outputPane',
		});
		const json = await dataTableProxy.insertRows([row], 'count');
		return [{ json }];
	} else {
		const insertedRows = await dataTableProxy.insertRows([row], 'all');
		return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
	}
}

export async function executeBulk(
	this: IExecuteFunctions,
	proxy: IDataTableProjectService,
): Promise<INodeExecutionData[]> {
	const optimizeBulkEnabled = this.getNodeParameter('options.optimizeBulk', 0, false);
	const rows = this.getInputData().flatMap((_, i) => [getAddRow(this, i)]);

	if (optimizeBulkEnabled) {
		const json = await proxy.insertRows(rows, 'count');
		return [{ json }];
	} else {
		const insertedRows = await proxy.insertRows(rows, 'all');
		return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
	}
}
