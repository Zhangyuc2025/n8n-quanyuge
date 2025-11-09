import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as read from './actions/read.operation';
import * as write from './actions/write.operation';

export class ReadWriteFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: '读写磁盘文件',
		name: 'readWriteFile',
		icon: 'file:readWriteFile.svg',
		group: ['input'],
		version: 1,
		description: '从运行 n8n 的计算机读取或写入文件',
		defaults: {
			name: '读写磁盘文件',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'使用此节点在运行 n8n 的同一台计算机上读取和写入文件。要处理不同计算机之间的文件，请使用其他节点（例如 FTP、HTTP Request、AWS）',
				name: 'info',
				type: 'notice',
				default: '',
			},
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '从磁盘读取文件',
						value: 'read',
						description: '从运行 n8n 的计算机检索一个或多个文件',
						action: '从磁盘读取文件',
					},
					{
						name: '将文件写入磁盘',
						value: 'write',
						description: '在运行 n8n 的计算机上创建二进制文件',
						action: '将文件写入磁盘',
					},
				],
				default: 'read',
			},
			...read.description,
			...write.description,
		],
	};

	async execute(this: IExecuteFunctions) {
		const operation = this.getNodeParameter('operation', 0, 'read');
		const items = this.getInputData();
		let returnData: INodeExecutionData[] = [];

		if (operation === 'read') {
			returnData = await read.execute.call(this, items);
		}

		if (operation === 'write') {
			returnData = await write.execute.call(this, items);
		}

		return [returnData];
	}
}
