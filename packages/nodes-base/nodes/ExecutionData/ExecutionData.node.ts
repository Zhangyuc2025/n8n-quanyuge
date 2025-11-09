import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type DataToSave = {
	values: Array<{ key: string; value: string }>;
};

export class ExecutionData implements INodeType {
	description: INodeTypeDescription = {
		displayName: '执行数据',
		name: 'executionData',
		icon: 'fa:tasks',
		group: ['input'],
		iconColor: 'light-green',
		version: [1, 1.1],
		description: '添加执行数据以供搜索',
		defaults: {
			name: '执行数据',
			color: '#29A568',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://n8n.io/pricing/',
					},
				],
				tutorialLinks: {
					pricing: 'https://n8n.io/pricing/',
				},
			},
		},
		properties: [
			{
				displayName:
					"使用此节点保存重要数据。它将在每次执行时显示以便参考，您可以按其进行过滤。<br />过滤功能在专业版和企业版计划中可用。<a href='{{pricing}}' target='_blank'>了解更多</a>",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				default: 'save',
				noDataExpression: true,
				options: [
					{
						name: '保存高亮数据（用于搜索/审查）',
						value: 'save',
						action: '保存高亮数据（用于搜索/审查）',
					},
				],
			},
			{
				displayName: '要保存的数据',
				name: 'dataToSave',
				placeholder: '添加保存的字段',
				type: 'fixedCollection',
				typeOptions: {
					multipleValueButtonText: '添加保存的字段',
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['save'],
					},
				},
				default: {},
				options: [
					{
						displayName: '值',
						name: 'values',
						values: [
							{
								displayName: '键',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: '例如：myKey',
								requiresDataPath: 'single',
							},
							{
								displayName: '值',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: '例如：myValue',
							},
						],
					},
				],
			},
		],
		hints: [
			{
				type: 'warning',
				message: '某些键长度超过 50 个字符。它们将被截断。',
				displayCondition: '={{ $parameter.dataToSave.values.some((x) => x.key.length > 50) }}',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
			{
				type: 'warning',
				message: '某些值长度超过 512 个字符。它们将被截断。',
				displayCondition: '={{ $parameter.dataToSave.values.some((x) => x.value.length > 512) }}',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const dataProxy = this.getWorkflowDataProxy(0);
		const nodeVersion = this.getNode().typeVersion;

		const items = this.getInputData();
		const operations = this.getNodeParameter('operation', 0);

		const returnData: INodeExecutionData[] = [];

		if (operations === 'save') {
			for (let i = 0; i < items.length; i++) {
				try {
					const dataToSave =
						(this.getNodeParameter('dataToSave', i, {}) as DataToSave).values || [];

					const values = dataToSave.reduce(
						(acc, { key, value }) => {
							const valueToSet = value ? value : nodeVersion >= 1.1 ? '' : value;
							acc[key] = valueToSet;
							return acc;
						},
						{} as { [key: string]: string },
					);

					dataProxy.$execution.customData.setAll(values);

					returnData.push(items[i]);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
							},
							pairedItem: {
								item: i,
							},
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), error);
				}
			}
		} else {
			return [items];
		}

		return [returnData];
	}
}
