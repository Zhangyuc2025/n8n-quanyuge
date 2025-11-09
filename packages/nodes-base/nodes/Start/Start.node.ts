import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class Start implements INodeType {
	description: INodeTypeDescription = {
		displayName: '开始',
		name: 'start',
		icon: 'fa:play',
		group: ['input'],
		version: 1,
		description: '从此节点开始工作流执行',
		maxNodes: 1,
		hidden: true,
		defaults: {
			name: '开始',
			color: '#00e000',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '此节点是手动工作流执行的起点。要执行工作流，请返回画布并点击"执行工作流"',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return [items];
	}
}
