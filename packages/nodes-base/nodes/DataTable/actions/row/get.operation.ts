import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { ROWS_LIMIT_DEFAULT } from '../../common/constants';
import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'get';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	...getSelectFields(displayOptions),
	{
		displayName: '返回全部',
		name: 'returnAll',
		type: 'boolean',
		displayOptions,
		default: false,
		description: '是否返回所有结果或仅返回给定限制内的结果',
	},
	{
		displayName: '限制',
		name: 'limit',
		type: 'number',
		displayOptions: {
			...displayOptions,
			show: {
				...displayOptions.show,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: ROWS_LIMIT_DEFAULT,
		description: '返回结果的最大数量',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataTableProxy = await getDataTableProxyExecute(this, index);

	return await executeSelectMany(this, index, dataTableProxy);
}
