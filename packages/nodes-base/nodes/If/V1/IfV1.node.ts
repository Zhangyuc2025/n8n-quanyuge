import moment from 'moment-timezone';
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

export class IfV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'If',
				color: '#408000',
			},
			inputs: [NodeConnectionTypes.Main],

			outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
			outputNames: ['true', 'false'],
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
					description: '要比较的值类型',
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
									description: '与第二个值比较的值',
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
									description: '用于决定数据应映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'boolean',
									default: false,
									// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
									description: '与第一个值比较的值',
								},
							],
						},
						{
							name: 'dateTime',
							displayName: '日期和时间',
							values: [
								{
									displayName: '值 1',
									name: 'value1',
									type: 'dateTime',
									default: '',
									description: '与第二个值比较的值',
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
									description: '用于决定数据应映射到哪里的操作',
								},
								{
									displayName: '值 2',
									name: 'value2',
									type: 'dateTime',
									default: '',
									description: '与第一个值比较的值',
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
									description: '与第二个值比较的值',
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
									description: '用于决定数据应映射到哪里的操作',
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
									description: '与第一个值比较的值',
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
									description: '与第二个值比较的值',
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
									description: '用于决定数据应映射到哪里的操作',
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
									description: '与第一个值比较的值',
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
									placeholder: '/文本/i',
									description: '必须匹配的正则表达式',
								},
							],
						},
					],
				},
				{
					displayName: '合并方式',
					name: 'combineOperation',
					type: 'options',
					options: [
						{
							name: '全部满足（AND）',
							description: '只有当所有条件都满足时才进入「true」分支',
							value: 'all',
						},
						{
							name: '任一满足（OR）',
							description: '当任何一个条件满足时就进入「true」分支',
							value: 'any',
						},
					],
					default: 'all',
					description:
						'当设置了多个规则时，此设置决定是在任一条件匹配时就为真，还是只有在全部条件都满足时才为真',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnDataTrue: INodeExecutionData[] = [];
		const returnDataFalse: INodeExecutionData[] = [];

		const items = this.getInputData();

		let item: INodeExecutionData;
		let combineOperation: string;

		const isDateObject = (value: NodeParameterValue) =>
			Object.prototype.toString.call(value) === '[object Date]';
		const isDateInvalid = (value: NodeParameterValue) => value?.toString() === 'Invalid Date';

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
			isEmpty: (value1: NodeParameterValue) =>
				[undefined, null, '', NaN].includes(value1 as string) ||
				(typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
					? Object.entries(value1 as string).length === 0
					: false) ||
				(isDateObject(value1) && isDateInvalid(value1)),
			isNotEmpty: (value1: NodeParameterValue) =>
				!(
					[undefined, null, '', NaN].includes(value1 as string) ||
					(typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
						? Object.entries(value1 as string).length === 0
						: false) ||
					(isDateObject(value1) && isDateInvalid(value1))
				),
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
			if (moment.isMoment(value)) {
				returnValue = value.unix();
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

		// The different dataTypes to check the values in
		const dataTypes = ['boolean', 'dateTime', 'number', 'string'];

		// Iterate over all items to check which ones should be output as via output "true" and
		// which ones via output "false"
		let dataType: string;
		let compareOperationResult: boolean;
		let value1: NodeParameterValue, value2: NodeParameterValue;
		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];

			let compareData: INodeParameters;

			combineOperation = this.getNodeParameter('combineOperation', itemIndex) as string;

			// Check all the values of the different dataTypes
			for (dataType of dataTypes) {
				// Check all the values of the current dataType
				for (compareData of this.getNodeParameter(
					`conditions.${dataType}`,
					itemIndex,
					[],
				) as INodeParameters[]) {
					// Check if the values passes

					value1 = compareData.value1 as NodeParameterValue;
					value2 = compareData.value2 as NodeParameterValue;

					if (dataType === 'dateTime') {
						value1 = convertDateTime(value1);
						value2 = convertDateTime(value2);
					}

					compareOperationResult = compareOperationFunctions[compareData.operation as string](
						value1,
						value2,
					);

					if (compareOperationResult && combineOperation === 'any') {
						// If it passes and the operation is "any" we do not have to check any
						// other ones as it should pass anyway. So go on with the next item.
						returnDataTrue.push(item);
						continue itemLoop;
					} else if (!compareOperationResult && combineOperation === 'all') {
						// If it fails and the operation is "all" we do not have to check any
						// other ones as it should be not pass anyway. So go on with the next item.
						returnDataFalse.push(item);
						continue itemLoop;
					}
				}
			}

			if (combineOperation === 'all') {
				// If the operation is "all" it means the item did match all conditions
				// so it passes.
				returnDataTrue.push(item);
			} else {
				// If the operation is "any" it means the the item did not match any condition.
				returnDataFalse.push(item);
			}
		}

		return [returnDataTrue, returnDataFalse];
	}
}
