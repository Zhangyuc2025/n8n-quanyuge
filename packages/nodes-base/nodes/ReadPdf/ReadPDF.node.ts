import {
	NodeOperationError,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { extractDataFromPDF } from '@utils/binary';

export class ReadPDF implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: '读取 PDF',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'readPDF',
		icon: 'fa:file-pdf',
		group: ['input'],
		version: 1,
		description: '读取 PDF 文件并提取其中的文本内容',
		defaults: {
			name: '读取 PDF',
			color: '#003355',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '输入二进制字段',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: '包含 PDF 文件的二进制属性名称',
			},
			{
				displayName: '加密文件',
				name: 'encrypted',
				type: 'boolean',
				default: false,
				required: true,
			},
			{
				displayName: '密码',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: '用于解密 PDF 文件的密码',
				displayOptions: {
					show: {
						encrypted: [true],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);

				let password;
				if (this.getNodeParameter('encrypted', itemIndex) === true) {
					password = this.getNodeParameter('password', itemIndex) as string;
				}

				const json = await extractDataFromPDF.call(
					this,
					binaryPropertyName,
					password,
					undefined,
					undefined,
					itemIndex,
				);

				returnData.push({
					binary: items[itemIndex].binary,
					json,
				});
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
		return [returnData];
	}
}
