import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import type { JsonToSpreadsheetBinaryOptions, JsonToSpreadsheetBinaryFormat } from '@utils/binary';
import { convertJsonToSpreadsheetBinary } from '@utils/binary';
import { generatePairedItemData, updateDisplayOptions } from '@utils/utilities';

export const operations = ['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'];

export const properties: INodeProperties[] = [
	{
		displayName: '将输出文件放入字段',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		hint: '用于存放输出文件的二进制字段名称',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '压缩',
				name: 'compression',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['xlsx', 'ods'],
					},
				},
				default: false,
				description: '是否减小输出文件大小',
			},
			{
				displayName: '分隔符',
				name: 'delimiter',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['csv'],
					},
				},
				default: ',',
				description: '用于分隔字段的字符',
			},
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				description: '输出文件的名称',
			},
			{
				displayName: '标题行',
				name: 'headerRow',
				type: 'boolean',
				default: true,
				description: '文件的第一行是否包含标题名称',
			},
			{
				displayName: '工作表名称',
				name: 'sheetName',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['ods', 'xls', 'xlsx'],
					},
				},
				default: 'Sheet',
				description: '在电子表格中创建的工作表名称',
				placeholder: 'e.g. mySheet',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: operations,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	operation: string,
) {
	let returnData: INodeExecutionData[] = [];

	const pairedItem = generatePairedItemData(items.length);
	try {
		const options = this.getNodeParameter('options', 0, {}) as JsonToSpreadsheetBinaryOptions;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');

		const binaryData = await convertJsonToSpreadsheetBinary.call(
			this,
			items,
			operation as JsonToSpreadsheetBinaryFormat,
			options,
			'File',
		);

		const newItem: INodeExecutionData = {
			json: {},
			binary: {
				[binaryPropertyName]: binaryData,
			},
			pairedItem,
		};

		returnData = [newItem];
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push({
				json: {
					error: error.message,
				},
				pairedItem,
			});
		} else {
			throw new NodeOperationError(this.getNode(), error);
		}
	}

	return returnData;
}
