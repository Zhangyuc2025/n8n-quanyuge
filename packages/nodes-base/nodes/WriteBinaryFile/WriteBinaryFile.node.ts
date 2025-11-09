import { BINARY_ENCODING, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { Readable } from 'stream';

export class WriteBinaryFile implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: '写入二进制文件',
		name: 'writeBinaryFile',
		icon: 'fa:file-export',
		group: ['output'],
		version: 1,
		description: '将二进制文件写入磁盘',
		defaults: {
			name: '写入二进制文件',
			color: '#CC2233',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '文件名',
				name: 'fileName',
				type: 'string',
				default: '',
				required: true,
				placeholder: '/data/example.jpg',
				description: '文件应写入的路径',
			},
			{
				displayName: '属性名称',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: '包含要写入文件数据的二进制属性名称',
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
						description: '是否追加到现有文件',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);

				const fileName = this.getNodeParameter('fileName', itemIndex) as string;

				const options = this.getNodeParameter('options', 0, {});

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
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
