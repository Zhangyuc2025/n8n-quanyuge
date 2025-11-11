import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class SwitchV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [1],
			defaults: {
				name: 'Switch',
				color: '#506000',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [
				NodeConnectionTypes.Main,
				NodeConnectionTypes.Main,
				NodeConnectionTypes.Main,
				NodeConnectionTypes.Main,
			],
			outputNames: ['0', '1', '2', '3'],
			properties: [
				{
					displayName: '模式',
					name: 'mode',
					type: 'options',
					options: [
						{
							name: '表达式',
							value: 'expression',
							description: '表达式决定数据如何路由',
						},
						{
							name: '规则',
							value: 'rules',
							description: '规则决定数据如何路由',
						},
					],
					default: 'rules',
					description: '数据应该如何路由',
				},

				// ----------------------------------
				//         mode:expression
				// ----------------------------------
				{
					displayName: '输出',
					name: 'output',
					type: 'number',
					typeOptions: {
						minValue: 0,
						maxValue: 3,
					},
					displayOptions: {
						show: {
							mode: ['expression'],
						},
					},
					default: 0,
					description: '要将数据发送到的输出索引',
				},

				// ----------------------------------
				//         mode:rules
				// ----------------------------------
				{
					displayName: '数据类型',
					name: 'dataType',
					type: 'options',
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							name: '布尔值',
							value: 'boolean',
						},
						{
							name: '日期时间',
							value: 'dateTime',
						},
						{
							name: '数字',
							value: 'number',
						},
						{
							name: '字符串',
							value: 'string',
						},
					],
					default: 'number',
					description: '要路由的数据类型',
				},

				// ----------------------------------
				//         dataType:boolean
				// ----------------------------------
				{
					displayName: '值 1',
					name: 'value1',
					type: 'boolean',
					displayOptions: {
						show: {
							dataType: ['boolean'],
							mode: ['rules'],
						},
					},
					default: false,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
					description: '要与第二个值进行比较的值',
				},
				{
					displayName: '路由规则',
					name: 'rules',
					placeholder: '添加路由规则',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							dataType: ['boolean'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: '布尔值',
							values: [
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
								{
									displayName: '输出',
									name: 'output',
									type: 'number',
									typeOptions: {
										minValue: 0,
										maxValue: 3,
									},
									default: 0,
									description: '如果规则匹配，要将数据发送到的输出索引',
								},
							],
						},
					],
				},

				// ----------------------------------
				//         dataType:dateTime
				// ----------------------------------
				{
					displayName: '值 1',
					name: 'value1',
					type: 'dateTime',
					displayOptions: {
						show: {
							dataType: ['dateTime'],
							mode: ['rules'],
						},
					},
					default: '',
					description: '要与第二个值进行比较的值',
				},
				{
					displayName: '路由规则',
					name: 'rules',
					placeholder: '添加路由规则',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							dataType: ['dateTime'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: '日期',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
									options: [
										{
											name: '发生在之后',
											value: 'after',
										},
										{
											name: '发生在之前',
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
									default: 0,
									description: '要与第一个值进行比较的值',
								},
								{
									displayName: '输出',
									name: 'output',
									type: 'number',
									typeOptions: {
										minValue: 0,
										maxValue: 3,
									},
									default: 0,
									description: '如果规则匹配，要将数据发送到的输出索引',
								},
							],
						},
					],
				},

				// ----------------------------------
				//         dataType:number
				// ----------------------------------
				{
					displayName: '值 1',
					name: 'value1',
					type: 'number',
					displayOptions: {
						show: {
							dataType: ['number'],
							mode: ['rules'],
						},
					},
					default: 0,
					description: '要与第二个值进行比较的值',
				},
				{
					displayName: '路由规则',
					name: 'rules',
					placeholder: '添加路由规则',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							dataType: ['number'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: '数字',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
									// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
									options: [
										{
											name: '小于',
											value: 'smaller',
										},
										{
											name: '小于等于',
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
											name: '大于等于',
											value: 'largerEqual',
										},
									],
									default: 'smaller',
									description: '决定数据应该映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'number',
									default: 0,
									description: '要与第一个值进行比较的值',
								},
								{
									displayName: '输出',
									name: 'output',
									type: 'number',
									typeOptions: {
										minValue: 0,
										maxValue: 3,
									},
									default: 0,
									description: '如果规则匹配，要将数据发送到的输出索引',
								},
							],
						},
					],
				},

				// ----------------------------------
				//         dataType:string
				// ----------------------------------
				{
					displayName: '值 1',
					name: 'value1',
					type: 'string',
					displayOptions: {
						show: {
							dataType: ['string'],
							mode: ['rules'],
						},
					},
					default: '',
					description: '要与第二个值进行比较的值',
				},
				{
					displayName: '路由规则',
					name: 'rules',
					placeholder: '添加路由规则',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							dataType: ['string'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: '字符串',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: '操作',
									name: 'operation',
									type: 'options',
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
											name: '以...结尾',
											value: 'endsWith',
										},
										{
											name: '不以...结尾',
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
											name: '以...开头',
											value: 'startsWith',
										},
										{
											name: '不以...开头',
											value: 'notStartsWith',
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
											operation: ['regex', 'notRegex'],
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
									description: '必须匹配的正则表达式',
								},
								{
									displayName: '输出',
									name: 'output',
									type: 'number',
									typeOptions: {
										minValue: 0,
										maxValue: 3,
									},
									default: 0,
									description: '如果规则匹配，要将数据发送到的输出索引',
								},
							],
						},
					],
				},

				{
					displayName: '回退输出',
					name: 'fallbackOutput',
					type: 'options',
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
					options: [
						{
							name: '无',
							value: -1,
						},
						{
							name: '0',
							value: 0,
						},
						{
							name: '1',
							value: 1,
						},
						{
							name: '2',
							value: 2,
						},
						{
							name: '3',
							value: 3,
						},
					],
					default: -1,
					description: '将所有不匹配任何规则的项目路由到的输出',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[][] = [[], [], [], []];

		const items = this.getInputData();

		let compareOperationResult: boolean;
		let item: INodeExecutionData;
		let mode: string;
		let outputIndex: number;
		let ruleData: INodeParameters;

		// The compare operations
		const compareOperationFunctions: {
			[key: string]: (value1: NodeParameterValue, value2: NodeParameterValue) => boolean;
		} = {
			after: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) > (value2 || 0),
			before: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) < (value2 || 0),
			contains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || '').toString().includes((value2 || '').toString()),
			notContains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				!(value1 || '').toString().includes((value2 || '').toString()),
			endsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 as string).endsWith(value2 as string),
			notEndsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				!(value1 as string).endsWith(value2 as string),
			equal: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 === value2,
			notEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 !== value2,
			larger: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) > (value2 || 0),
			largerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) >= (value2 || 0),
			smaller: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) < (value2 || 0),
			smallerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) <= (value2 || 0),
			startsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 as string).startsWith(value2 as string),
			notStartsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				!(value1 as string).startsWith(value2 as string),
			regex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
				const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

				let regex: RegExp;
				if (!regexMatch) {
					regex = new RegExp((value2 || '').toString());
				} else if (regexMatch.length === 1) {
					regex = new RegExp(regexMatch[1]);
				} else {
					regex = new RegExp(regexMatch[1], regexMatch[2]);
				}

				return !!(value1 || '').toString().match(regex);
			},
			notRegex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
				const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

				let regex: RegExp;
				if (!regexMatch) {
					regex = new RegExp((value2 || '').toString());
				} else if (regexMatch.length === 1) {
					regex = new RegExp(regexMatch[1]);
				} else {
					regex = new RegExp(regexMatch[1], regexMatch[2]);
				}

				return !(value1 || '').toString().match(regex);
			},
		};

		// Converts the input data of a dateTime into a number for easy compare
		const convertDateTime = (value: NodeParameterValue): number => {
			let returnValue: number | undefined = undefined;
			if (typeof value === 'string') {
				returnValue = new Date(value).getTime();
			} else if (typeof value === 'number') {
				returnValue = value;
			}
			if ((value as unknown as object) instanceof Date) {
				returnValue = (value as unknown as Date).getTime();
			}

			if (returnValue === undefined || isNaN(returnValue)) {
				throw new NodeOperationError(
					this.getNode(),
					`The value "${value}" is not a valid DateTime.`,
				);
			}

			return returnValue;
		};

		const checkIndexRange = (index: number) => {
			if (index < 0 || index >= returnData.length) {
				throw new NodeOperationError(
					this.getNode(),
					`The ouput ${index} is not allowed. It has to be between 0 and ${returnData.length - 1}!`,
				);
			}
		};

		// Iterate over all items to check to which output they should be routed to
		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];
				mode = this.getNodeParameter('mode', itemIndex) as string;

				if (mode === 'expression') {
					// One expression decides how to route item

					outputIndex = this.getNodeParameter('output', itemIndex) as number;
					checkIndexRange(outputIndex);

					returnData[outputIndex].push(item);
				} else if (mode === 'rules') {
					// Rules decide how to route item

					const dataType = this.getNodeParameter('dataType', 0) as string;

					let value1 = this.getNodeParameter('value1', itemIndex) as NodeParameterValue;
					if (dataType === 'dateTime') {
						value1 = convertDateTime(value1);
					}

					for (ruleData of this.getNodeParameter(
						'rules.rules',
						itemIndex,
						[],
					) as INodeParameters[]) {
						// Check if the values passes

						let value2 = ruleData.value2 as NodeParameterValue;
						if (dataType === 'dateTime') {
							value2 = convertDateTime(value2);
						}

						compareOperationResult = compareOperationFunctions[ruleData.operation as string](
							value1,
							value2,
						);

						if (compareOperationResult) {
							// If rule matches add it to the correct output and continue with next item
							checkIndexRange(ruleData.output as number);
							returnData[ruleData.output as number].push(item);
							continue itemLoop;
						}
					}

					// Check if a fallback output got defined and route accordingly
					outputIndex = this.getNodeParameter('fallbackOutput', itemIndex) as number;
					if (outputIndex !== -1) {
						checkIndexRange(outputIndex);
						returnData[outputIndex].push(item);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return returnData;
	}
}
