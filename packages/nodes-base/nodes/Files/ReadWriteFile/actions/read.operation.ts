import glob from 'fast-glob';
import { NodeApiError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { errorMapper, escapeSpecialCharacters } from '../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: '文件选择器',
		name: 'fileSelector',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. /home/user/Pictures/**/*.png',
		hint: '支持模式匹配，了解更多请<a href="https://github.com/micromatch/picomatch#basic-globbing" target="_blank">点击这里</a>',
		description:
			'指定文件路径或路径模式以读取多个文件。即使在 Windows 上也始终使用正斜杠作为路径分隔符。',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '文件扩展名',
				name: 'fileExtension',
				type: 'string',
				default: '',
				placeholder: 'e.g. zip',
				description: '输出二进制文件的扩展名',
			},
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. data.zip',
				description: '输出二进制文件的名称',
			},
			{
				displayName: 'MIME 类型',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'e.g. application/zip',
				description: '输出二进制文件的 MIME 类型',
			},
			{
				displayName: '将输出文件放入字段',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				placeholder: 'e.g. data',
				description: "默认使用 'data'",
				hint: '用于存放输出文件的二进制字段名称',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['read'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	let fileSelector;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			fileSelector = String(this.getNodeParameter('fileSelector', itemIndex));

			fileSelector = escapeSpecialCharacters(fileSelector);

			if (/^[a-zA-Z]:/.test(fileSelector)) {
				fileSelector = fileSelector.replace(/\\\\/g, '/');
			}

			const options = this.getNodeParameter('options', itemIndex, {});

			let dataPropertyName = 'data';

			if (options.dataPropertyName) {
				dataPropertyName = options.dataPropertyName as string;
			}

			const files = await glob(fileSelector);

			const newItems: INodeExecutionData[] = [];
			for (const filePath of files) {
				const stream = await this.helpers.createReadStream(filePath);
				const binaryData = await this.helpers.prepareBinaryData(stream, filePath);

				if (options.fileName !== undefined) {
					binaryData.fileName = options.fileName as string;
				}

				if (options.fileExtension !== undefined) {
					binaryData.fileExtension = options.fileExtension as string;
				}

				if (options.mimeType !== undefined) {
					binaryData.mimeType = options.mimeType as string;
				}

				newItems.push({
					binary: {
						[dataPropertyName]: binaryData,
					},
					json: {
						mimeType: binaryData.mimeType,
						fileType: binaryData.fileType,
						fileName: binaryData.fileName,
						fileExtension: binaryData.fileExtension,
						fileSize: binaryData.fileSize,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
			}
			returnData.push(...newItems);
		} catch (error) {
			const nodeOperatioinError = errorMapper.call(this, error, itemIndex, {
				filePath: fileSelector,
				operation: 'read',
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
