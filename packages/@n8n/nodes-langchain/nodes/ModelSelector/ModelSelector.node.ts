/* eslint-disable n8n-nodes-base/node-param-description-wrong-for-dynamic-options */
/* eslint-disable n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
import type { BaseCallbackHandler, CallbackHandlerMethods } from '@langchain/core/callbacks/base';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { numberInputsProperty, configuredInputs } from './helpers';
import { N8nLlmTracing } from '../llms/N8nLlmTracing';
import { N8nNonEstimatingTracing } from '../llms/N8nNonEstimatingTracing';

interface ModeleSelectionRule {
	modelIndex: number;
	conditions: {
		options: {
			caseSensitive: boolean;
			typeValidation: 'strict' | 'loose';
			leftValue: string;
			version: 1 | 2;
		};
		conditions: Array<{
			id: string;
			leftValue: string;
			rightValue: string;
			operator: {
				type: string;
				operation: string;
				name: string;
			};
		}>;
		combinator: 'and' | 'or';
	};
}

function getCallbacksArray(
	callbacks: Callbacks | undefined,
): Array<BaseCallbackHandler | CallbackHandlerMethods> {
	if (!callbacks) return [];

	if (Array.isArray(callbacks)) {
		return callbacks;
	}

	// If it's a CallbackManager, extract its handlers
	return callbacks.handlers || [];
}

export class ModelSelector implements INodeType {
	description: INodeTypeDescription = {
		displayName: '模型选择器',
		name: 'modelSelector',
		icon: 'fa:map-signs',
		iconColor: 'green',
		defaults: {
			name: '模型选择器',
		},
		version: 1,
		group: ['transform'],
		description: '使用此节点根据工作流数据选择连接到此节点的模型之一',
		inputs: `={{
				((parameters) => {
					${configuredInputs.toString()};
					return configuredInputs(parameters)
				})($parameter)
			}}`,
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.modelselector/',
					},
				],
			},
		},
		outputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: 1,
		properties: [
			numberInputsProperty,
			{
				displayName: '规则',
				name: 'rules',
				placeholder: '添加规则',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: '将工作流数据映射到特定模型的规则',
				default: {},
				options: [
					{
						displayName: '规则',
						name: 'rule',
						values: [
							{
								displayName: '模型',
								name: 'modelIndex',
								type: 'options',
								description: '从列表中选择模型输入',
								default: 1,
								required: true,
								placeholder: '从列表中选择模型输入',
								typeOptions: {
									loadOptionsMethod: 'getModels',
								},
							},
							{
								displayName: '条件',
								name: 'conditions',
								placeholder: '添加条件',
								type: 'filter',
								default: {},
								typeOptions: {
									filter: {
										caseSensitive: true,
										typeValidation: 'strict',
										version: 2,
									},
								},
								description: '选择此模型必须满足的条件',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions) {
				const numberInputs = this.getCurrentNodeParameter('numberInputs') as number;

				return Array.from({ length: numberInputs ?? 2 }, (_, i) => ({
					value: i + 1,
					name: `模型 ${(i + 1).toString()}`,
				}));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const models = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as unknown[];

		if (!models || models.length === 0) {
			throw new NodeOperationError(this.getNode(), '未连接模型', {
				itemIndex,
				description: '在输入连接中未找到模型',
			});
		}
		models.reverse();

		const rules = this.getNodeParameter('rules.rule', itemIndex, []) as ModeleSelectionRule[];

		if (!rules || rules.length === 0) {
			throw new NodeOperationError(this.getNode(), '未定义规则', {
				itemIndex,
				description: '必须定义至少一个规则来选择模型',
			});
		}

		for (let i = 0; i < rules.length; i++) {
			const rule = rules[i];
			const modelIndex = rule.modelIndex;

			if (modelIndex <= 0 || modelIndex > models.length) {
				throw new NodeOperationError(this.getNode(), `无效的模型索引 ${modelIndex}`, {
					itemIndex,
					description: `模型索引必须在 1 到 ${models.length} 之间`,
				});
			}

			const conditionsMet = this.getNodeParameter(`rules.rule[${i}].conditions`, itemIndex, false, {
				extractValue: true,
			}) as boolean;

			if (conditionsMet) {
				const selectedModel = models[modelIndex - 1] as BaseChatModel;

				const originalCallbacks = getCallbacksArray(selectedModel.callbacks);

				for (const currentCallback of originalCallbacks) {
					if (currentCallback instanceof N8nLlmTracing) {
						currentCallback.setParentRunIndex(this.getNextRunIndex());
					}
				}
				const modelSelectorTracing = new N8nNonEstimatingTracing(this);
				selectedModel.callbacks = [...originalCallbacks, modelSelectorTracing];

				return {
					response: selectedModel,
				};
			}
		}

		throw new NodeOperationError(this.getNode(), '未找到匹配的规则', {
			itemIndex,
			description: '没有定义的规则与工作流数据匹配',
		});
	}
}
