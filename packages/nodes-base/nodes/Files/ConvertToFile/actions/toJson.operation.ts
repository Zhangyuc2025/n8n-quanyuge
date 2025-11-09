import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';
import { generatePairedItemData, updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	{
		displayName: '模式',
		name: 'mode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: '所有项目到一个文件',
				value: 'once',
			},
			{
				name: '每个项目到单独文件',
				value: 'each',
			},
		],
		default: 'once',
	},
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
				displayName: '添加字节顺序标记 (BOM)',
				name: 'addBOM',
				type: 'boolean',
				default: false,
				description: '是否在文本文件开头添加特殊标记。此标记帮助某些程序正确读取文件。',
				displayOptions: {
					show: {
						encoding: ['utf8', 'cesu8', 'ucs2'],
					},
				},
			},
			{
				displayName: '格式化',
				name: 'format',
				type: 'boolean',
				default: false,
				description: '是否格式化 JSON 数据以便于阅读',
			},
			{
				displayName: '编码',
				name: 'encoding',
				type: 'options',
				options: encodeDecodeOptions,
				default: 'utf8',
				description: '选择用于编码数据的字符集',
			},
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. myFile.json',
				description: '输出文件的名称',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['toJson'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	let returnData: INodeExecutionData[] = [];

	const mode = this.getNodeParameter('mode', 0, 'once') as string;
	if (mode === 'once') {
		const pairedItem = generatePairedItemData(items.length);
		try {
			const options = this.getNodeParameter('options', 0, {});
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');

			const binaryData = await createBinaryFromJson.call(
				this,
				items.map((item) => item.json),
				{
					fileName: options.fileName as string,
					mimeType: 'application/json',
					encoding: options.encoding as string,
					addBOM: options.addBOM as boolean,
					format: options.format as boolean,
				},
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
			}
			throw new NodeOperationError(this.getNode(), error);
		}
	} else {
		for (let i = 0; i < items.length; i++) {
			try {
				const options = this.getNodeParameter('options', i, {});
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');

				const binaryData = await createBinaryFromJson.call(this, items[i].json, {
					fileName: options.fileName as string,
					encoding: options.encoding as string,
					addBOM: options.addBOM as boolean,
					format: options.format as boolean,
					mimeType: 'application/json',
					itemIndex: i,
				});

				const newItem: INodeExecutionData = {
					json: {},
					binary: {
						[binaryPropertyName]: binaryData,
					},
					pairedItem: { item: i },
				};

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}
	}

	return returnData;
}
