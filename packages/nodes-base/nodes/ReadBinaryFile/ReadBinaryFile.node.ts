import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class ReadBinaryFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: '读取二进制文件',
		name: 'readBinaryFile',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
		hidden: true,
		description: '从磁盘读取二进制文件',
		defaults: {
			name: '读取二进制文件',
			color: '#449922',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '文件路径',
				name: 'filePath',
				type: 'string',
				default: '',
				required: true,
				placeholder: '/data/example.jpg',
				description: '要读取的文件路径',
			},
			{
				displayName: '属性名称',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: '要写入读取文件数据的二进制属性名称',
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
				item = items[itemIndex];
				const newItem: INodeExecutionData = {
					json: item.json,
					binary: {},
					pairedItem: {
						item: itemIndex,
					},
				};

				if (item.binary !== undefined && newItem.binary) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, item.binary);
				}

				const filePath = this.getNodeParameter('filePath', itemIndex);

				const stream = await this.helpers.createReadStream(filePath);
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);

				newItem.binary![dataPropertyName] = await this.helpers.prepareBinaryData(stream, filePath);
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
