import pickBy from 'lodash/pickBy';
import {
	type INodeExecutionData,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	INPUT_SOURCE,
	WORKFLOW_INPUTS,
	JSON_EXAMPLE,
	VALUES,
	TYPE_OPTIONS,
	PASSTHROUGH,
	FALLBACK_DEFAULT_VALUE,
} from '../../../utils/workflowInputsResourceMapping/constants';
import { getFieldEntries } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

export class ExecuteWorkflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '执行工作流触发器',
		name: 'executeWorkflowTrigger',
		icon: 'fa:sign-out-alt',
		group: ['trigger'],
		version: [1, 1.1],
		description: '用于调用其他 n8n 工作流的助手。用于设计模块化、类似微服务的工作流。',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: '当被另一个工作流执行时',
			color: '#ff6d5a',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				message:
					'此工作流未设置为接受任何输入数据。请填写工作流输入架构或将工作流更改为接受传递给它的任何数据。',
				// This condition checks if we have no input fields, which gets a bit awkward:
				// For WORKFLOW_INPUTS: keys() only contains `VALUES` if at least one value is provided
				// For JSON_EXAMPLE: We remove all whitespace and check if we're left with an empty object. Note that we already error if the example is not valid JSON
				displayCondition:
					`={{$parameter['${INPUT_SOURCE}'] === '${WORKFLOW_INPUTS}' && !$parameter['${WORKFLOW_INPUTS}'].keys().length ` +
					`|| $parameter['${INPUT_SOURCE}'] === '${JSON_EXAMPLE}' && $parameter['${JSON_EXAMPLE}'].toString().replaceAll(' ', '').replaceAll('\\n', '') === '{}' }}`,
				whenToDisplay: 'always',
				location: 'ndv',
			},
		],
		properties: [
			{
				displayName: '事件',
				name: 'events',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: '工作流调用',
						value: 'worklfow_call',
						description: '当被另一个使用执行工作流触发器的工作流执行时',
						action: '当被另一个工作流执行时',
					},
				],
				default: 'worklfow_call',
			},
			{
				displayName:
					'当"执行工作流"节点调用此工作流时，执行从此处开始。传递到"执行工作流"节点的任何数据都将由此节点输出。',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { '@version': [{ _cnd: { eq: 1 } }] },
				},
			},
			{
				displayName: '此节点已过时。请通过删除它并添加新节点来升级',
				name: 'outdatedVersionWarning',
				type: 'notice',
				displayOptions: { show: { '@version': [{ _cnd: { eq: 1 } }] } },
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: '输入数据模式',
				name: INPUT_SOURCE,
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: '使用下方字段定义',
						value: WORKFLOW_INPUTS,
						description: '通过 UI 提供输入字段',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: '使用 JSON 示例定义',
						value: JSON_EXAMPLE,
						description: '从示例 JSON 对象生成架构',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: '接受所有数据',
						value: PASSTHROUGH,
						description: '使用来自父工作流的所有传入数据',
					},
				],
				default: WORKFLOW_INPUTS,
				noDataExpression: true,
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }] },
				},
			},
			{
				displayName:
					'提供一个示例对象以推断字段及其类型。<br>要允许给定字段的任何类型，请将值设置为 null。',
				name: `${JSON_EXAMPLE}_notice`,
				type: 'notice',
				default: '',
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [JSON_EXAMPLE] },
				},
			},
			{
				displayName: 'JSON 示例',
				name: JSON_EXAMPLE,
				type: 'json',
				default: JSON.stringify(
					{
						aField: 'a string',
						aNumber: 123,
						thisFieldAcceptsAnyType: null,
						anArray: [],
					},
					null,
					2,
				),
				noDataExpression: true,
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [JSON_EXAMPLE] },
				},
			},
			{
				displayName: '工作流输入架构',
				name: WORKFLOW_INPUTS,
				placeholder: '添加字段',
				type: 'fixedCollection',
				description: '定义预期的输入字段。如果未提供输入，则将传递来自调用工作流的所有数据。',
				typeOptions: {
					multipleValues: true,
					sortable: true,
					minRequiredFields: 1,
				},
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 1.1 } }], inputSource: [WORKFLOW_INPUTS] },
				},
				default: {},
				options: [
					{
						name: VALUES,
						displayName: '值',
						values: [
							{
								displayName: '名称',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: '例如：fieldName',
								description: '此工作流输入的唯一名称，用于从其他工作流中引用它',
								required: true,
								noDataExpression: true,
							},
							{
								displayName: '类型',
								name: 'type',
								type: 'options',
								description: '此输入值的预期数据类型。决定如何存储、验证和显示此字段的值。',
								options: TYPE_OPTIONS,
								required: true,
								default: 'string',
								noDataExpression: true,
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const inputData = this.getInputData();
		const inputSource = this.getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH) as string;

		// Note on the data we receive from ExecuteWorkflow caller:
		//
		// The ExecuteWorkflow node typechecks all fields explicitly provided by the user here via the resourceMapper
		// and removes all fields that are in the schema, but `removed` in the resourceMapper.
		//
		// In passthrough and legacy node versions, inputData will line up since the resourceMapper is empty,
		// in which case all input is passed through.
		// In other cases we will already have matching types and fields provided by the resource mapper,
		// so we just need to be permissive on this end,
		// while ensuring we provide default values for fields in our schema, which are removed in the resourceMapper.

		if (inputSource === PASSTHROUGH) {
			return [inputData];
		} else {
			const newParams = getFieldEntries(this);
			const newKeys = new Set(newParams.fields.map((x) => x.name));
			const itemsInSchema: INodeExecutionData[] = inputData.map(({ json, binary }, index) => ({
				json: {
					...Object.fromEntries(newParams.fields.map((x) => [x.name, FALLBACK_DEFAULT_VALUE])),
					// Need to trim to the expected schema to support legacy Execute Workflow callers passing through all their data
					// which we do not want to expose past this node.
					...pickBy(json, (_value, key) => newKeys.has(key)),
				},
				index,
				binary,
			}));

			return [itemsInSchema];
		}
	}
}
