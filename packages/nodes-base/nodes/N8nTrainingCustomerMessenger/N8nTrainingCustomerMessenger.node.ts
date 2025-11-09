import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class N8nTrainingCustomerMessenger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '客户消息发送器 (n8n 培训)',
		name: 'n8nTrainingCustomerMessenger',
		icon: {
			light: 'file:n8nTrainingCustomerMessenger.svg',
			dark: 'file:n8nTrainingCustomerMessenger.dark.svg',
		},
		group: ['transform'],
		version: 1,
		description: '用于 n8n 培训的虚拟节点',
		defaults: {
			name: '客户消息发送器 (n8n 培训)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '客户 ID',
				name: 'customerId',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: '消息',
				name: 'message',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;

		for (let i = 0; i < length; i++) {
			const customerId = this.getNodeParameter('customerId', i) as string;

			const message = this.getNodeParameter('message', i) as string;

			responseData = { output: `Sent message to customer ${customerId}:  ${message}` };
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}
		return [returnData];
	}
}
