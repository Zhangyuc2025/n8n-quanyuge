import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import { Document } from '@langchain/core/documents';
import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	IWorkflowBase,
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	INodeParameterResourceLocator,
	ExecuteWorkflowData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

function objectToString(obj: Record<string, string> | IDataObject, level = 0) {
	let result = '';
	for (const key in obj) {
		const value = obj[key];
		if (typeof value === 'object' && value !== null) {
			result += `${'  '.repeat(level)}- "${key}":\n${objectToString(
				value as IDataObject,
				level + 1,
			)}`;
		} else {
			result += `${'  '.repeat(level)}- "${key}": "${value}"\n`;
		}
	}
	return result;
}

export class RetrieverWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: '工作流检索器',
		name: 'retrieverWorkflow',
		icon: 'fa:box-open',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: '将 n8n 工作流用作检索器',
		defaults: {
			name: '工作流检索器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Retrievers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.retrieverworkflow/',
					},
				],
			},
		},
		inputs: [],
		outputs: [
			{
				displayName: '检索器',
				maxConnections: 1,
				type: NodeConnectionTypes.AiRetriever,
			},
		],
		properties: [
			{
				displayName: '工作流将接收 "query" 作为输入，最后一个节点的输出将被返回并转换为文档',
				name: 'executeNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '来源',
				name: 'source',
				type: 'options',
				options: [
					{
						name: '数据库',
						value: 'database',
						description: '通过 ID 从数据库加载工作流',
					},
					{
						name: '参数',
						value: 'parameter',
						description: '从参数加载工作流',
					},
				],
				default: 'database',
				description: '从哪里获取要执行的工作流',
			},

			// ----------------------------------
			//         source:database
			// ----------------------------------
			{
				displayName: '工作流 ID',
				name: 'workflowId',
				type: 'string',
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { eq: 1 } }],
					},
				},
				default: '',
				required: true,
				description: '要执行的工作流',
			},
			{
				displayName: '工作流',
				name: 'workflowId',
				type: 'workflowSelector',
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
				default: '',
				required: true,
			},

			// ----------------------------------
			//         source:parameter
			// ----------------------------------
			{
				displayName: '工作流 JSON',
				name: 'workflowJson',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						source: ['parameter'],
					},
				},
				default: '\n\n\n',
				required: true,
				description: '要执行的工作流 JSON 代码',
			},

			// ----------------------------------
			//         For all
			// ----------------------------------
			{
				displayName: '工作流值',
				name: 'fields',
				placeholder: '添加值',
				type: 'fixedCollection',
				description: '设置应在工作流中提供的值',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				options: [
					{
						name: 'values',
						displayName: '值',
						values: [
							{
								displayName: '名称',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: '例如：fieldName',
								description: '要设置值的字段名称。支持点表示法。例如：data.person[0].name。',
								requiresDataPath: 'single',
							},
							{
								displayName: '类型',
								name: 'type',
								type: 'options',
								description: '字段值类型',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									{
										name: '字符串',
										value: 'stringValue',
									},
									{
										name: '数字',
										value: 'numberValue',
									},
									{
										name: '布尔值',
										value: 'booleanValue',
									},
									{
										name: '数组',
										value: 'arrayValue',
									},
									{
										name: '对象',
										value: 'objectValue',
									},
								],
								default: 'stringValue',
							},
							{
								displayName: '值',
								name: 'stringValue',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										type: ['stringValue'],
									},
								},
								validateType: 'string',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: '值',
								name: 'numberValue',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										type: ['numberValue'],
									},
								},
								validateType: 'number',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: '值',
								name: 'booleanValue',
								type: 'options',
								default: 'true',
								options: [
									{
										name: '真',
										value: 'true',
									},
									{
										name: '假',
										value: 'false',
									},
								],
								displayOptions: {
									show: {
										type: ['booleanValue'],
									},
								},
								validateType: 'boolean',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: '值',
								name: 'arrayValue',
								type: 'string',
								default: '',
								placeholder: '例如：[ arrayItem1, arrayItem2, arrayItem3 ]',
								displayOptions: {
									show: {
										type: ['arrayValue'],
									},
								},
								validateType: 'array',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: '值',
								name: 'objectValue',
								type: 'json',
								default: '={}',
								typeOptions: {
									rows: 2,
								},
								displayOptions: {
									show: {
										type: ['objectValue'],
									},
								},
								validateType: 'object',
								ignoreValidationDuringExecution: true,
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const workflowProxy = this.getWorkflowDataProxy(0);

		class WorkflowRetriever extends BaseRetriever {
			lc_namespace = ['n8n-nodes-langchain', 'retrievers', 'workflow'];

			constructor(
				private executeFunctions: ISupplyDataFunctions,
				fields: BaseRetrieverInput,
			) {
				super(fields);
			}

			async _getRelevantDocuments(
				query: string,
				config?: CallbackManagerForRetrieverRun,
			): Promise<Document[]> {
				const source = this.executeFunctions.getNodeParameter('source', itemIndex) as string;

				const baseMetadata: IDataObject = {
					source: 'workflow',
					workflowSource: source,
				};

				const workflowInfo: IExecuteWorkflowInfo = {};
				if (source === 'database') {
					const nodeVersion = this.executeFunctions.getNode().typeVersion;
					if (nodeVersion === 1) {
						workflowInfo.id = this.executeFunctions.getNodeParameter(
							'workflowId',
							itemIndex,
						) as string;
					} else {
						const { value } = this.executeFunctions.getNodeParameter(
							'workflowId',
							itemIndex,
							{},
						) as INodeParameterResourceLocator;
						workflowInfo.id = value as string;
					}

					baseMetadata.workflowId = workflowInfo.id;
				} else if (source === 'parameter') {
					// Read workflow from parameter
					const workflowJson = this.executeFunctions.getNodeParameter(
						'workflowJson',
						itemIndex,
					) as string;
					try {
						workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
					} catch (error) {
						throw new NodeOperationError(
							this.executeFunctions.getNode(),
							`提供的工作流不是有效的 JSON: "${(error as Error).message}"`,
							{
								itemIndex,
							},
						);
					}

					// same as current workflow
					baseMetadata.workflowId = workflowProxy.$workflow.id;
				}

				const rawData: IDataObject = { query };

				const workflowFieldsJson = this.executeFunctions.getNodeParameter(
					'fields.values',
					itemIndex,
					[],
					{
						rawExpressions: true,
					},
				) as SetField[];

				// Copied from Set Node v2
				for (const entry of workflowFieldsJson) {
					if (entry.type === 'objectValue' && (entry.objectValue as string).startsWith('=')) {
						rawData[entry.name] = (entry.objectValue as string).replace(/^=+/, '');
					}
				}

				const options: SetNodeOptions = {
					include: 'all',
				};

				const newItem = await manual.execute.call(
					this.executeFunctions,
					{ json: { query } },
					itemIndex,
					options,
					rawData,
					this.executeFunctions.getNode(),
				);

				const items = [newItem] as INodeExecutionData[];

				let receivedData: ExecuteWorkflowData;
				try {
					receivedData = await this.executeFunctions.executeWorkflow(
						workflowInfo,
						items,
						config?.getChild(),
						{
							parentExecution: {
								executionId: workflowProxy.$execution.id,
								workflowId: workflowProxy.$workflow.id,
							},
						},
					);
				} catch (error) {
					// Make sure a valid error gets returned that can by json-serialized else it will
					// not show up in the frontend
					throw new NodeOperationError(this.executeFunctions.getNode(), error as Error);
				}

				const receivedItems = receivedData.data?.[0] ?? [];

				const returnData: Document[] = [];
				for (const [index, itemData] of receivedItems.entries()) {
					const pageContent = objectToString(itemData.json);
					returnData.push(
						new Document({
							pageContent: `### ${index + 1}. Context data:\n${pageContent}`,
							metadata: {
								...baseMetadata,
								itemIndex: index,
								executionId: receivedData.executionId,
							},
						}),
					);
				}

				return returnData;
			}
		}

		const retriever = new WorkflowRetriever(this, {});

		return {
			response: logWrapper(retriever, this),
		};
	}
}
