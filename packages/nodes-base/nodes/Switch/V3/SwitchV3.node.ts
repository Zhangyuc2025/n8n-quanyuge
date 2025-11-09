import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { capitalize } from '@utils/utilities';

import { ENABLE_LESS_STRICT_TYPE_VALIDATION } from '../../../utils/constants';
import { looseTypeValidationProperty } from '../../../utils/descriptions';
import { getTypeValidationParameter, getTypeValidationStrictness } from '../../If/V2/utils';

const configuredOutputs = (parameters: INodeParameters) => {
	const mode = parameters.mode as string;

	if (mode === 'expression') {
		return Array.from({ length: parameters.numberOutputs as number }, (_, i) => ({
			type: 'main',
			displayName: i.toString(),
		}));
	} else {
		const rules = ((parameters.rules as IDataObject)?.values as IDataObject[]) ?? [];
		const ruleOutputs = rules.map((rule, index) => {
			return {
				type: 'main',
				displayName: rule.outputKey || index.toString(),
			};
		});
		if ((parameters.options as IDataObject)?.fallbackOutput === 'extra') {
			const renameFallbackOutput = (parameters.options as IDataObject)?.renameFallbackOutput;
			ruleOutputs.push({
				type: 'main',
				displayName: renameFallbackOutput || 'Fallback',
			});
		}
		return ruleOutputs;
	}
};

export class SwitchV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			subtitle: `=mode: {{(${capitalize})($parameter["mode"])}}`,
			version: [3, 3.1, 3.2, 3.3],
			defaults: {
				name: '分支',
				color: '#506000',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: `={{(${configuredOutputs})($parameter)}}`,
			properties: [
				{
					displayName: '模式',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: '规则',
							value: 'rules',
							description: '为每个输出构建匹配规则',
						},
						{
							name: '表达式',
							value: 'expression',
							description: '编写表达式以返回输出索引',
						},
					],
					default: 'rules',
					description: '数据路由方式',
				},
				{
					displayName: '输出数量',
					name: 'numberOutputs',
					type: 'number',
					noDataExpression: true,
					displayOptions: {
						show: {
							mode: ['expression'],
							'@version': [{ _cnd: { gte: 3.3 } }],
						},
					},
					default: 4,
					description: '要创建的输出数量',
				},
				{
					displayName: '输出数量',
					name: 'numberOutputs',
					type: 'number',
					displayOptions: {
						show: {
							mode: ['expression'],
							'@version': [{ _cnd: { lt: 3.3 } }],
						},
					},
					default: 4,
					description: '要创建的输出数量',
				},
				{
					displayName: '输出索引',
					name: 'output',
					type: 'number',
					validateType: 'number',
					hint: '要路由项目的索引，从 0 开始',
					displayOptions: {
						show: {
							mode: ['expression'],
						},
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-number
					default: '={{}}',
					description:
						'要发送输入项目的输出索引。使用表达式计算应将哪个输入项目路由到哪个输出。表达式必须返回数字。',
				},
				{
					displayName: '路由规则',
					name: 'rules',
					placeholder: '添加路由规则',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					default: {
						values: [
							{
								conditions: {
									options: {
										caseSensitive: true,
										leftValue: '',
										typeValidation: 'strict',
									},
									conditions: [
										{
											leftValue: '',
											rightValue: '',
											operator: {
												type: 'string',
												operation: 'equals',
											},
										},
									],
									combinator: 'and',
								},
							},
						],
					},
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							name: 'values',
							displayName: '值',
							values: [
								{
									displayName: '条件',
									name: 'conditions',
									placeholder: '添加条件',
									type: 'filter',
									default: {},
									typeOptions: {
										multipleValues: false,
										filter: {
											caseSensitive: '={{!$parameter.options.ignoreCase}}',
											typeValidation: getTypeValidationStrictness(3.1),
											version: '={{ $nodeVersion >= 3.2 ? 2 : 1 }}',
										},
									},
								},
								{
									displayName: '重命名输出',
									name: 'renameOutput',
									type: 'boolean',
									default: false,
								},
								{
									displayName: '输出名称',
									name: 'outputKey',
									type: 'string',
									default: '',
									description: '规则匹配时发送数据的输出标签',
									displayOptions: {
										show: {
											renameOutput: [true],
										},
									},
								},
							],
						},
					],
				},
				{
					...looseTypeValidationProperty,
					default: false,
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 3.1 } }],
						},
					},
				},
				{
					displayName: '选项',
					name: 'options',
					type: 'collection',
					placeholder: '添加选项',
					default: {},
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
							displayName: '备用输出',
							name: 'fallbackOutput',
							type: 'options',
							typeOptions: {
								loadOptionsDependsOn: ['rules.values', '/rules', '/rules.values'],
								loadOptionsMethod: 'getFallbackOutputOptions',
							},
							default: 'none',
							// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
							description: '如果没有规则匹配，项目将发送到此输出，默认情况下它们将被忽略',
						},
						{
							displayName: '忽略大小写',
							description: '评估条件时是否忽略字母大小写',
							name: 'ignoreCase',
							type: 'boolean',
							default: true,
						},
						{
							...looseTypeValidationProperty,
							displayOptions: {
								show: {
									'@version': [{ _cnd: { lt: 3.1 } }],
								},
							},
						},
						{
							displayName: '重命名备用输出',
							name: 'renameFallbackOutput',
							type: 'string',
							placeholder: '例如：备用',
							default: '',
							displayOptions: {
								show: {
									fallbackOutput: ['extra'],
								},
							},
						},
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
							displayName: '发送数据到所有匹配的输出',
							name: 'allMatchingOutputs',
							type: 'boolean',
							default: false,
							description: '是否将数据发送到所有满足条件的输出（而不仅仅是第一个）',
						},
					],
				},
			],
		};
	}

	methods = {
		loadOptions: {
			async getFallbackOutputOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rules = (this.getCurrentNodeParameter('rules.values') as INodeParameters[]) ?? [];

				const outputOptions: INodePropertyOptions[] = [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: '无（默认）',
						value: 'none',
						description: '项目将被忽略',
					},
					{
						name: '额外输出',
						value: 'extra',
						description: '项目将被发送到额外的独立输出',
					},
				];

				for (const [index, rule] of rules.entries()) {
					outputOptions.push({
						name: `输出 ${rule.outputKey || index}`,
						value: index,
						description: `项目将发送到与匹配规则 ${index + 1} 相同的输出`,
					});
				}

				return outputOptions;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];

		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as string;

		const checkIndexRange = (returnDataLength: number, index: number, itemIndex = 0) => {
			if (Number(index) === returnDataLength) {
				throw new NodeOperationError(this.getNode(), `不允许使用输出 ${index}。`, {
					itemIndex,
					description: `输出索引从零开始，如果要使用额外输出，请使用 ${index - 1}`,
				});
			}
			if (index < 0 || index > returnDataLength) {
				throw new NodeOperationError(this.getNode(), `不允许使用输出 ${index}`, {
					itemIndex,
					description: `必须在 0 到 ${returnDataLength - 1} 之间`,
				});
			}
		};

		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];

				item.pairedItem = { item: itemIndex };

				if (mode === 'expression') {
					const numberOutputs = this.getNodeParameter('numberOutputs', itemIndex) as number;
					if (itemIndex === 0) {
						returnData = new Array(numberOutputs).fill(0).map(() => []);
					}
					const outputIndex = this.getNodeParameter('output', itemIndex) as number;
					checkIndexRange(returnData.length, outputIndex, itemIndex);

					returnData[outputIndex].push(item);
				} else if (mode === 'rules') {
					const rules = this.getNodeParameter('rules.values', itemIndex, []) as INodeParameters[];
					if (!rules.length) continue;
					const options = this.getNodeParameter('options', itemIndex, {});
					const fallbackOutput = options.fallbackOutput;

					if (itemIndex === 0) {
						returnData = new Array(rules.length).fill(0).map(() => []);

						if (fallbackOutput === 'extra') {
							returnData.push([]);
						}
					}

					let matchFound = false;
					for (const [ruleIndex, rule] of rules.entries()) {
						let conditionPass;

						try {
							conditionPass = this.getNodeParameter(
								`rules.values[${ruleIndex}].conditions`,
								itemIndex,
								false,
								{
									extractValue: true,
								},
							) as boolean;
						} catch (error) {
							if (
								!getTypeValidationParameter(3.1)(
									this,
									itemIndex,
									options.looseTypeValidation as boolean,
								) &&
								!error.description
							) {
								error.description = ENABLE_LESS_STRICT_TYPE_VALIDATION;
							}
							set(error, 'context.itemIndex', itemIndex);
							set(error, 'node', this.getNode());
							throw error;
						}

						if (conditionPass) {
							matchFound = true;
							checkIndexRange(returnData.length, rule.output as number, itemIndex);
							returnData[ruleIndex].push(item);

							if (!options.allMatchingOutputs) {
								continue itemLoop;
							}
						}
					}

					if (fallbackOutput !== undefined && fallbackOutput !== 'none' && !matchFound) {
						if (fallbackOutput === 'extra') {
							returnData[returnData.length - 1].push(item);
							continue;
						}
						checkIndexRange(returnData.length, fallbackOutput as number, itemIndex);
						returnData[fallbackOutput as number].push(item);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({ json: { error: error.message } });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}

				if (error instanceof ApplicationError) {
					set(error, 'context.itemIndex', itemIndex);
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error, {
					itemIndex,
				});
			}
		}

		if (!returnData.length) return [[]];

		return returnData;
	}
}
