import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Limit implements INodeType {
	description: INodeTypeDescription = {
		displayName: '限制',
		name: 'limit',
		icon: 'file:limit.svg',
		group: ['transform'],
		subtitle: '',
		version: 1,
		description: '限制数据项的数量',
		defaults: {
			name: '限制',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '最大项目数',
				name: 'maxItems',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: '如果项目数量超过此数字，将删除一些项目',
			},
			{
				displayName: '保留',
				name: 'keep',
				type: 'options',
				options: [
					{
						name: '前面的项目',
						value: 'firstItems',
					},
					{
						name: '后面的项目',
						value: 'lastItems',
					},
				],
				default: 'firstItems',
				description: '删除项目时，是保留开头还是结尾的项目',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData = items;
		const maxItems = this.getNodeParameter('maxItems', 0) as number;
		const keep = this.getNodeParameter('keep', 0) as string;

		if (maxItems > items.length) {
			return [returnData];
		}

		if (keep === 'firstItems') {
			returnData = items.slice(0, maxItems);
		} else {
			returnData = items.slice(items.length - maxItems, items.length);
		}
		return [returnData];
	}
}
