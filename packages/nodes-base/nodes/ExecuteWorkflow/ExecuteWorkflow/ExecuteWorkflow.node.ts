import { NodeConnectionTypes, NodeOperationError, parseErrorMetadata } from 'n8n-workflow';
import type {
	ExecuteWorkflowData,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { findPairedItemThroughWorkflowData } from './../../../utils/workflow-backtracking';
import { getWorkflowInfo } from './GenericFunctions';
import { localResourceMapping } from './methods';
import { generatePairedItemData } from '../../../utils/utilities';
import { getCurrentWorkflowInputData } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

export class ExecuteWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: '执行子工作流',
		name: 'executeWorkflow',
		icon: 'fa:sign-in-alt',
		iconColor: 'orange-red',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		subtitle: '={{"工作流: " + $parameter["workflowId"]}}',
		description: '执行另一个工作流',
		defaults: {
			name: '执行工作流',
			color: '#ff6d5a',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/',
					},
				],
				tutorialLinks: {
					moreInfo:
						'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/',
				},
			},
		},
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'hidden',
				noDataExpression: true,
				default: 'call_workflow',
				options: [
					{
						name: '执行子工作流',
						value: 'call_workflow',
					},
				],
			},
			{
				displayName: '此节点已过时。请通过删除它并添加新节点来升级',
				name: 'outdatedVersionWarning',
				type: 'notice',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
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
						name: '本地文件',
						value: 'localFile',
						description: '从本地保存的文件加载工作流',
					},
					{
						name: '参数',
						value: 'parameter',
						description: '从参数加载工作流',
					},
					{
						name: 'URL',
						value: 'url',
						description: '从 URL 加载工作流',
					},
				],
				default: 'database',
				description: '从哪里获取要执行的工作流',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
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
						name: '在下方定义',
						value: 'parameter',
						description: '传递工作流的 JSON 代码',
					},
				],
				default: 'database',
				description: '从哪里获取要执行的工作流',
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } },
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
						'@version': [1],
					},
				},
				default: '',
				required: true,
				hint: '可以在工作流的 URL 中找到',
				description:
					'关于在此处使用表达式的说明：如果此节点设置为与所有项目一起运行一次，它们将全部发送到<em>同一个</em>工作流。该工作流的 ID 将通过评估<strong>第一个输入项目</strong>的表达式来计算。',
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
			//         source:localFile
			// ----------------------------------
			{
				displayName: '工作流路径',
				name: 'workflowPath',
				type: 'string',
				displayOptions: {
					show: {
						source: ['localFile'],
					},
				},
				default: '',
				placeholder: '/data/workflow.json',
				required: true,
				description: '要执行的本地 JSON 工作流文件的路径',
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
			//         source:url
			// ----------------------------------
			{
				displayName: '工作流 URL',
				name: 'workflowUrl',
				type: 'string',
				displayOptions: {
					show: {
						source: ['url'],
					},
				},
				default: '',
				placeholder: 'https://example.com/workflow.json',
				required: true,
				description: '从中加载工作流的 URL',
			},
			{
				displayName:
					'传递到此节点的任何数据都将由执行工作流触发器输出。<a href="{{moreInfo}}" target="_blank">了解更多</a>',
				name: 'executeWorkflowNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
			},
			{
				displayName: '工作流输入',
				name: 'workflowInputs',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['workflowId.value'],
					resourceMapper: {
						localResourceMapperMethod: 'loadSubWorkflowInputs',
						valuesLabel: '工作流输入',
						mode: 'map',
						fieldWords: {
							singular: '输入',
							plural: '输入',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						showTypeConversionOptions: true,
					},
				},
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
					hide: {
						workflowId: [''],
					},
				},
			},
			{
				displayName: '模式',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: '与所有项目一起运行一次',
						value: 'once',
						description: '将所有项目传递到子工作流的单次执行中',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: '为每个项目运行一次',
						value: 'each',
						description: '为每个项目单独调用子工作流',
					},
				],
				default: 'once',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: '添加选项',
				options: [
					{
						displayName: '等待子工作流完成',
						name: 'waitForSubWorkflow',
						type: 'boolean',
						default: true,
						description: '主工作流是否应等待子工作流完成其执行后再继续',
					},
				],
			},
		],
		hints: [
			{
				type: 'info',
				message:
					'关于为工作流 ID 使用表达式的说明：由于此节点设置为与所有项目一起运行一次，它们将全部发送到<em>同一个</em>工作流。该工作流的 ID 将通过评估<strong>第一个输入项目</strong>的表达式来计算。',
				displayCondition:
					'={{ $rawParameter.workflowId.startsWith("=") && $parameter.mode === "once" && $nodeVersion >= 1.2 }}',
				whenToDisplay: 'always',
				location: 'outputPane',
			},
		],
	};

	methods = {
		localResourceMapping,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const source = this.getNodeParameter('source', 0) as string;
		const mode = this.getNodeParameter('mode', 0, false) as string;
		const items = getCurrentWorkflowInputData.call(this);

		const workflowProxy = this.getWorkflowDataProxy(0);
		const currentWorkflowId = workflowProxy.$workflow.id as string;

		if (mode === 'each') {
			const returnData: INodeExecutionData[][] = [];

			for (let i = 0; i < items.length; i++) {
				try {
					const waitForSubWorkflow = this.getNodeParameter(
						'options.waitForSubWorkflow',
						i,
						true,
					) as boolean;
					const workflowInfo = await getWorkflowInfo.call(this, source, i);

					if (waitForSubWorkflow) {
						const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
							undefined,
							{
								parentExecution: {
									executionId: workflowProxy.$execution.id,
									workflowId: workflowProxy.$workflow.id,
									shouldResume: waitForSubWorkflow,
								},
							},
						);
						const workflowResult = executionResult.data as INodeExecutionData[][];

						for (const [outputIndex, outputData] of workflowResult.entries()) {
							for (const item of outputData) {
								item.pairedItem = { item: i };
								item.metadata = {
									subExecution: {
										executionId: executionResult.executionId,
										workflowId: workflowInfo.id ?? currentWorkflowId,
									},
								};
							}

							if (returnData[outputIndex] === undefined) {
								returnData[outputIndex] = [];
							}

							returnData[outputIndex].push(...outputData);
						}
					} else {
						const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
							undefined,
							{
								doNotWaitToFinish: true,
								parentExecution: {
									executionId: workflowProxy.$execution.id,
									workflowId: workflowProxy.$workflow.id,
									shouldResume: waitForSubWorkflow,
								},
							},
						);

						if (returnData.length === 0) {
							returnData.push([]);
						}

						returnData[0].push({
							...items[i],
							metadata: {
								subExecution: {
									workflowId: workflowInfo.id ?? currentWorkflowId,
									executionId: executionResult.executionId,
								},
							},
						});
					}
				} catch (error) {
					if (this.continueOnFail()) {
						const nodeVersion = this.getNode().typeVersion;
						// In versions < 1.3 using the "Continue (using error output)" mode
						// the node would return items in extra "error branches" instead of
						// returning an array of items on the error output. These branches weren't really shown correctly on the UI.
						// In the fixed >= 1.3 versions the errors are now all output into the single error output as an array of error items.
						const outputIndex = nodeVersion >= 1.3 ? 0 : i;

						returnData[outputIndex] ??= [];
						const metadata = parseErrorMetadata(error);
						returnData[outputIndex].push({
							json: { error: error.message },
							pairedItem: { item: i },
							metadata,
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), error, {
						message: `Error executing workflow with item at index ${i}`,
						description: error.message,
						itemIndex: i,
					});
				}
			}

			this.setMetadata({
				subExecutionsCount: items.length,
			});

			return returnData;
		} else {
			try {
				const waitForSubWorkflow = this.getNodeParameter(
					'options.waitForSubWorkflow',
					0,
					true,
				) as boolean;
				const workflowInfo = await getWorkflowInfo.call(this, source);

				const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
					workflowInfo,
					items,
					undefined,
					{
						doNotWaitToFinish: !waitForSubWorkflow,
						parentExecution: {
							executionId: workflowProxy.$execution.id,
							workflowId: workflowProxy.$workflow.id,
							shouldResume: waitForSubWorkflow,
						},
					},
				);

				this.setMetadata({
					subExecution: {
						executionId: executionResult.executionId,
						workflowId: workflowInfo.id ?? (workflowProxy.$workflow.id as string),
					},
					subExecutionsCount: 1,
				});

				if (!waitForSubWorkflow) {
					return [items];
				}

				const workflowRunData = await this.getExecutionDataById(executionResult.executionId);

				const workflowResult = executionResult.data as INodeExecutionData[][];

				const fallbackPairedItemData = generatePairedItemData(items.length);

				for (const output of workflowResult) {
					const sameLength = output.length === items.length;

					for (const [itemIndex, item] of output.entries()) {
						if (item.pairedItem) {
							// If the item already has a paired item, we need to follow these to the start of the child workflow
							if (workflowRunData !== undefined) {
								const pairedItem = findPairedItemThroughWorkflowData(
									workflowRunData,
									item,
									itemIndex,
								);
								if (pairedItem !== undefined) {
									item.pairedItem = pairedItem;
								}
							}
							continue;
						}

						if (sameLength) {
							item.pairedItem = { item: itemIndex };
						} else {
							item.pairedItem = fallbackPairedItemData;
						}
					}
				}

				return workflowResult;
			} catch (error) {
				const pairedItem = generatePairedItemData(items.length);
				if (this.continueOnFail()) {
					const metadata = parseErrorMetadata(error);
					return [
						[
							{
								json: { error: error.message },
								metadata,
								pairedItem,
							},
						],
					];
				}
				throw error;
			}
		}
	}
}
