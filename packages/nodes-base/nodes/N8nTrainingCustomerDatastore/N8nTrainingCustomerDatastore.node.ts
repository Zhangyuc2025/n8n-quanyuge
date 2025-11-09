import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const data = [
	{
		id: '23423532',
		name: 'Jay Gatsby',
		email: 'gatsby@west-egg.com',
		notes: 'Keeps asking about a green light??',
		country: 'US',
		created: '1925-04-10',
	},
	{
		id: '23423533',
		name: 'José Arcadio Buendía',
		email: 'jab@macondo.co',
		notes: 'Lots of people named after him. Very confusing',
		country: 'CO',
		created: '1967-05-05',
	},
	{
		id: '23423534',
		name: 'Max Sendak',
		email: 'info@in-and-out-of-weeks.org',
		notes: 'Keeps rolling his terrible eyes',
		country: 'US',
		created: '1963-04-09',
	},
	{
		id: '23423535',
		name: 'Zaphod Beeblebrox',
		email: 'captain@heartofgold.com',
		notes: 'Felt like I was talking to more than one person',
		country: null,
		created: '1979-10-12',
	},
	{
		id: '23423536',
		name: 'Edmund Pevensie',
		email: 'edmund@narnia.gov',
		notes: 'Passionate sailor',
		country: 'UK',
		created: '1950-10-16',
	},
];

export class N8nTrainingCustomerDatastore implements INodeType {
	description: INodeTypeDescription = {
		displayName: '客户数据存储 (n8n 培训)',
		name: 'n8nTrainingCustomerDatastore',
		icon: {
			light: 'file:n8nTrainingCustomerDatastore.svg',
			dark: 'file:n8nTrainingCustomerDatastore.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: '用于 n8n 培训的虚拟节点',
		defaults: {
			name: '客户数据存储 (n8n 培训)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '获取单个人员',
						value: 'getOnePerson',
					},
					{
						name: '获取所有人员',
						value: 'getAllPeople',
					},
				],
				default: 'getOnePerson',
			},
			{
				displayName: '返回全部',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getAllPeople'],
					},
				},
				default: false,
				description: '是否返回所有结果或仅返回给定限制的结果',
			},
			{
				displayName: '限制',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getAllPeople'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 5,
				description: '返回结果的最大数量',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const operation = this.getNodeParameter('operation', 0);
		let responseData;

		for (let i = 0; i < length; i++) {
			if (operation === 'getOnePerson') {
				responseData = data[0];
			}

			if (operation === 'getAllPeople') {
				const returnAll = this.getNodeParameter('returnAll', i);

				if (returnAll) {
					responseData = data;
				} else {
					const limit = this.getNodeParameter('limit', i);
					responseData = data.slice(0, limit);
				}
			}

			if (Array.isArray(responseData)) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push.apply(returnData, executionData);
			} else if (responseData !== undefined) {
				returnData.push({ json: responseData });
			}
		}
		return [returnData];
	}
}
