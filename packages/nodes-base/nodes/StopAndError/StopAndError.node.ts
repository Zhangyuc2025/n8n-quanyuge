import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createErrorFromParameters } from './utils';

const errorObjectPlaceholder = `{
	"code": "404",
	"description": "The resource could not be fetched"
}`;

export class StopAndError implements INodeType {
	description: INodeTypeDescription = {
		displayName: '停止并报错',
		name: 'stopAndError',
		icon: 'fa:exclamation-triangle',
		iconColor: 'red',
		group: ['input'],
		version: 1,
		description: '在工作流中抛出错误',
		defaults: {
			name: '停止并报错',
			color: '#ff0000',
		},
		inputs: [NodeConnectionTypes.Main],

		outputs: [],
		properties: [
			{
				displayName: '错误类型',
				name: 'errorType',
				type: 'options',
				options: [
					{
						name: '错误消息',
						value: 'errorMessage',
					},
					{
						name: '错误对象',
						value: 'errorObject',
					},
				],
				default: 'errorMessage',
				description: '要抛出的错误类型',
			},
			{
				displayName: '错误消息',
				name: 'errorMessage',
				type: 'string',
				placeholder: '发生错误！',
				default: '',
				required: true,
				displayOptions: {
					show: {
						errorType: ['errorMessage'],
					},
				},
			},
			{
				displayName: '错误对象',
				name: 'errorObject',
				type: 'json',
				description: '包含错误属性的对象',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				placeholder: errorObjectPlaceholder,
				required: true,
				displayOptions: {
					show: {
						errorType: ['errorObject'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const errorType = this.getNodeParameter('errorType', 0) as 'errorMessage' | 'errorObject';
		const errorParameter =
			errorType === 'errorMessage'
				? (this.getNodeParameter('errorMessage', 0) as string)
				: (this.getNodeParameter('errorObject', 0) as string);

		const { message, options } = createErrorFromParameters(errorType, errorParameter);

		throw new NodeOperationError(this.getNode(), message, options);
	}
}
