import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeApiError } from 'n8n-workflow';
import type { Readable } from 'stream';

import { updateDisplayOptions } from '@utils/utilities';

import { errorMapper } from '../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: '文件路径和名称',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. /data/example.jpg',
		description: '应写入的文件路径和名称。还需包含文件扩展名。',
	},
	{
		displayName: '输入二进制字段',
		name: 'dataPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		required: true,
		hint: '包含要写入的文件的输入二进制字段名称',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '追加',
				name: 'append',
				type: 'boolean',
				default: false,
				description:
					'是否追加到现有文件。虽然通常用于文本文件，但不限于文本文件，但不适用于具有特定结构的文件类型（如大多数二进制格式）。',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['write'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	let fileName;

	let item: INodeExecutionData;
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);
			fileName = this.getNodeParameter('fileName', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {});
			const flag: string = options.append ? 'a' : 'w';

			item = items[itemIndex];

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: {
					item: itemIndex,
				},
			};
			Object.assign(newItem.json, item.json);

			const binaryData = this.helpers.assertBinaryData(itemIndex, dataPropertyName);

			let fileContent: Buffer | Readable;
			if (binaryData.id) {
				fileContent = await this.helpers.getBinaryStream(binaryData.id);
			} else {
				fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
			}

			// Write the file to disk
			await this.helpers.writeContentToFile(fileName, fileContent, flag);

			if (item.binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				newItem.binary = {};
				Object.assign(newItem.binary, item.binary);
			}

			// Add the file name to data
			newItem.json.fileName = fileName;

			returnData.push(newItem);
		} catch (error) {
			const nodeOperatioinError = errorMapper.call(this, error, itemIndex, {
				filePath: fileName,
				operation: 'write',
			});
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: nodeOperatioinError.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
		}
	}

	return returnData;
}
