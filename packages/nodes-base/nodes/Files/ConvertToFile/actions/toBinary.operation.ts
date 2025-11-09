import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { JsonToBinaryOptions } from '@utils/binary';
import { createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	{
		displayName: 'Base64 输入字段',
		name: 'sourceProperty',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g data',
		requiresDataPath: 'single',
		description:
			"包含要转换为文件的 base64 字符串的输入字段名称。使用点表示法表示深层字段（例如 'level1.level2.currentKey'）。",
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
				description: '是否在文本文件开头添加特殊标记。此标记帮助某些程序正确读取文件。',
				name: 'addBOM',
				displayOptions: {
					show: {
						encoding: ['utf8', 'cesu8', 'ucs2'],
					},
				},
				type: 'boolean',
				default: false,
			},
			{
				displayName: '数据是 Base64',
				name: 'dataIsBase64',
				type: 'boolean',
				default: true,
				description: '数据是否已经是 base64 编码',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: '编码',
				name: 'encoding',
				type: 'options',
				options: encodeDecodeOptions,
				default: 'utf8',
				description: '选择用于编码数据的字符集',
				displayOptions: {
					hide: {
						dataIsBase64: [true],
						'@version': [{ _cnd: { gt: 1 } }],
					},
				},
			},
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. myFile',
				description: '输出文件的名称',
			},
			{
				displayName: 'MIME 类型',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'e.g text/plain',
				description:
					'输出文件的 MIME 类型。<a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types" target="_blank">常见 MIME 类型</a>。',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['toBinary'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	const nodeVersion = this.getNode().typeVersion;

	for (let i = 0; i < items.length; i++) {
		try {
			const options = this.getNodeParameter('options', i, {});
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
			const sourceProperty = this.getNodeParameter('sourceProperty', i) as string;

			let dataIsBase64 = true;
			if (nodeVersion === 1) {
				dataIsBase64 = options.dataIsBase64 !== false;
			}

			const jsonToBinaryOptions: JsonToBinaryOptions = {
				sourceKey: sourceProperty,
				fileName: options.fileName as string,
				mimeType: options.mimeType as string,
				dataIsBase64,
				encoding: options.encoding as string,
				addBOM: options.addBOM as boolean,
				itemIndex: i,
			};

			const binaryData = await createBinaryFromJson.call(this, items[i].json, jsonToBinaryOptions);

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

	return returnData;
}
