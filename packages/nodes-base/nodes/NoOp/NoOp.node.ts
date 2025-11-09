import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class NoOp implements INodeType {
	description: INodeTypeDescription = {
		displayName: '无操作，什么都不做',
		name: 'noOp',
		icon: 'fa:arrow-right',
		iconColor: 'gray',
		group: ['organization'],
		version: 1,
		description: '无操作',
		defaults: {
			name: '无操作',
			color: '#b0b0b0',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return [items];
	}
}
