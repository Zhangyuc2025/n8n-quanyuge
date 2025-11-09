import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeParameters,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type NodeParameterValue,
} from 'n8n-workflow';

import { compareOperationFunctions, convertDateTime } from './GenericFunctions';

export class FilterV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: '筛选',
				color: '#229eff',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			outputNames: ['保留', '丢弃'],
			properties: [
				{
					displayName: '条件',
					name: 'conditions',
					placeholder: '添加条件',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					description: '要比较的值的类型',
					default: {},
					options: [
						{
							name: 'boolean',
							displayName: '布尔值',
							values: [
								{
									displayName: '值 1',
									name: 'value1',
									type: 'boolean',
									default: false,
									// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
									description: '要与第二个值进行比较的值',
								},
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
									options: [
										{
											name: '等于',
											value: 'equal',
										},
										{
											name: '不等于',
											value: 'notEqual',
										},
									],
									default: 'equal',
									description: '决定数据应该映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'boolean',
									default: false,
									// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
									description: '要与第一个值进行比较的值',
								},
							],
						},
						{
							name: 'dateTime',
							displayName: '日期时间',
							values: [
								{
									displayName: '值 1',
									name: 'value1',
									type: 'dateTime',
									default: '',
									description: '要与第二个值进行比较的值',
								},
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
									options: [
										{
											name: '晚于',
											value: 'after',
										},
										{
											name: '早于',
											value: 'before',
										},
									],
									default: 'after',
									description: '决定数据应该映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'dateTime',
									default: '',
									description: '要与第一个值进行比较的值',
								},
							],
						},
						{
							name: 'number',
							displayName: '数值',
							values: [
								{
									displayName: '值 1',
									name: 'value1',
									type: 'number',
									default: 0,
									description: '要与第二个值进行比较的值',
								},
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
									noDataExpression: true,
									// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
									options: [
										{
											name: '小于',
											value: 'smaller',
										},
										{
											name: '小于或等于',
											value: 'smallerEqual',
										},
										{
											name: '等于',
											value: 'equal',
										},
										{
											name: '不等于',
											value: 'notEqual',
										},
										{
											name: '大于',
											value: 'larger',
										},
										{
											name: '大于或等于',
											value: 'largerEqual',
										},
										{
											name: '为空',
											value: 'isEmpty',
										},
										{
											name: '不为空',
											value: 'isNotEmpty',
										},
									],
									default: 'smaller',
									description: '决定数据应该映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'number',
									displayOptions: {
										hide: {
											operation: ['isEmpty', 'isNotEmpty'],
										},
									},
									default: 0,
									description: '要与第一个值进行比较的值',
								},
							],
						},
						{
							name: 'string',
							displayName: '字符串',
							values: [
								{
									displayName: '值 1',
									name: 'value1',
									type: 'string',
									default: '',
									description: '要与第二个值进行比较的值',
								},
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
									noDataExpression: true,
									// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
									options: [
										{
											name: '包含',
											value: 'contains',
										},
										{
											name: '不包含',
											value: 'notContains',
										},
										{
											name: '结尾是',
											value: 'endsWith',
										},
										{
											name: '结尾不是',
											value: 'notEndsWith',
										},
										{
											name: '等于',
											value: 'equal',
										},
										{
											name: '不等于',
											value: 'notEqual',
										},
										{
											name: '正则匹配',
											value: 'regex',
										},
										{
											name: '正则不匹配',
											value: 'notRegex',
										},
										{
											name: '开头是',
											value: 'startsWith',
										},
										{
											name: '开头不是',
											value: 'notStartsWith',
										},
										{
											name: '为空',
											value: 'isEmpty',
										},
										{
											name: '不为空',
											value: 'isNotEmpty',
										},
									],
									default: 'equal',
									description: '决定数据应该映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'string',
									displayOptions: {
										hide: {
											operation: ['isEmpty', 'isNotEmpty', 'regex', 'notRegex'],
										},
									},
									default: '',
									description: '要与第一个值进行比较的值',
								},
								{
									displayName: '正则表达式',
									name: 'value2',
									type: 'string',
									displayOptions: {
										show: {
											operation: ['regex', 'notRegex'],
										},
									},
									default: '',
									placeholder: '/text/i',
									description: '要匹配的正则表达式',
								},
							],
						},
					],
				},
				{
					displayName: '组合条件',
					name: 'combineConditions',
					type: 'options',
					options: [
						{
							name: 'AND（与）',
							description: '仅当数据项满足所有条件时才传递到下一个节点',
							value: 'AND',
						},
						{
							name: 'OR（或）',
							description: '当数据项满足至少一个条件时传递到下一个节点',
							value: 'OR',
						},
					],
					default: 'AND',
					description: '如何组合条件：AND 要求所有条件都为真，OR 要求至少一个条件为真',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnDataTrue: INodeExecutionData[] = [];
		const returnDataFalse: INodeExecutionData[] = [];

		const items = this.getInputData();

		const dataTypes = ['boolean', 'dateTime', 'number', 'string'];

		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			const combineConditions = this.getNodeParameter('combineConditions', itemIndex) as string;

			for (const dataType of dataTypes) {
				const typeConditions = this.getNodeParameter(
					`conditions.${dataType}`,
					itemIndex,
					[],
				) as INodeParameters[];

				for (const condition of typeConditions) {
					let value1 = condition.value1 as NodeParameterValue;
					let value2 = condition.value2 as NodeParameterValue;

					if (dataType === 'dateTime') {
						const node = this.getNode();
						value1 = convertDateTime(node, value1);
						value2 = convertDateTime(node, value2);
					}

					const compareResult = compareOperationFunctions[condition.operation as string](
						value1,
						value2,
					);

					if (item.pairedItem === undefined) {
						item.pairedItem = [{ item: itemIndex }];
					}

					// If the operation is "OR" it means the item did match one condition no ned to check further
					if (compareResult && combineConditions === 'OR') {
						returnDataTrue.push(item);
						continue itemLoop;
					}

					// If the operation is "AND" it means the item failed one condition no ned to check further
					if (!compareResult && combineConditions === 'AND') {
						returnDataFalse.push(item);
						continue itemLoop;
					}
				}
			}

			// If the operation is "AND" it means the item did match all conditions
			if (combineConditions === 'AND') {
				returnDataTrue.push(item);
			} else {
				// If the operation is "OR" it means the the item did not match any condition.
				returnDataFalse.push(item);
			}
		}

		return [returnDataTrue, returnDataFalse];
	}
}
