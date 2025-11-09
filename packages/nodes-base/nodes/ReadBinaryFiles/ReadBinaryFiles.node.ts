import glob from 'fast-glob';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { generatePairedItemData } from '../../utils/utilities';

export class ReadBinaryFiles implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: '读取二进制文件',
		name: 'readBinaryFiles',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
		description: '从磁盘读取二进制文件',
		defaults: {
			name: '读取二进制文件',
			color: '#44AA44',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '文件选择器',
				name: 'fileSelector',
				type: 'string',
				default: '',
				required: true,
				placeholder: '*.jpg',
				description: '要读取的文件模式',
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
		const fileSelector = this.getNodeParameter('fileSelector', 0) as string;
		const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);
		const pairedItem = generatePairedItemData(this.getInputData().length);

		const files = await glob(fileSelector);

		const items: INodeExecutionData[] = [];
		for (const filePath of files) {
			const stream = await this.helpers.createReadStream(filePath);
			items.push({
				binary: {
					[dataPropertyName]: await this.helpers.prepareBinaryData(stream, filePath),
				},
				json: {},
				pairedItem,
			});
		}

		return [items];
	}
}
