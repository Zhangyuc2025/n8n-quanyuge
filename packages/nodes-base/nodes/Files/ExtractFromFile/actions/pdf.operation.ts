import unset from 'lodash/unset';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, deepCopy } from 'n8n-workflow';

import { extractDataFromPDF } from '@utils/binary';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	{
		displayName: '输入二进制字段',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		hint: '包含要提取的文件的输入二进制字段名称',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '合并页面',
				name: 'joinPages',
				type: 'boolean',
				default: true,
				description: '是否合并所有页面的文本，或返回每个页面文本的数组',
			},
			{
				displayName: '保留源数据',
				name: 'keepSource',
				type: 'options',
				default: 'json',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: '包含输入项的 JSON 数据',
					},
					{
						name: '二进制',
						value: 'binary',
						description: '包含输入项的二进制数据',
					},
					{
						name: '两者都保留',
						value: 'both',
						description: '同时包含输入项的 JSON 和二进制数据',
					},
				],
			},
			{
				displayName: '最大页数',
				name: 'maxPages',
				type: 'number',
				default: 0,
				description: '要包含的最大页数',
			},
			{
				displayName: '密码',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: '如果 PDF 已加密，请提供密码',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['pdf'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const item = items[itemIndex];
			const options = this.getNodeParameter('options', itemIndex);
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);

			const json = await extractDataFromPDF.call(
				this,
				binaryPropertyName,
				options.password as string,
				options.maxPages as number,
				options.joinPages as boolean,
				itemIndex,
			);

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: { item: itemIndex },
			};

			if (options.keepSource && options.keepSource !== 'binary') {
				newItem.json = { ...deepCopy(item.json), ...json };
			} else {
				newItem.json = json;
			}

			if (options.keepSource === 'binary' || options.keepSource === 'both') {
				newItem.binary = item.binary;
			} else {
				// this binary data would not be included, but there also might be other binary data
				// which should be included, copy it over and unset current binary data
				newItem.binary = deepCopy(item.binary);
				unset(newItem.binary, binaryPropertyName);
			}

			returnData.push(newItem);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, { itemIndex });
		}
	}

	return returnData;
}
