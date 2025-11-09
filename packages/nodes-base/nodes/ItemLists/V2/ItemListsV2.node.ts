import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import pick from 'lodash/pick';
import set from 'lodash/set';
import unset from 'lodash/unset';
import { NodeConnectionTypes, NodeOperationError, deepCopy } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import { flattenKeys, shuffleArray, compareItems } from '@utils/utilities';

import * as summarize from './summarize.operation';
import { sortByCode } from '../V3/helpers/utils';

export class ItemListsV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2, 2.1, 2.2],
			defaults: {
				name: '项目列表',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [],
			properties: [
				{
					displayName: '资源',
					name: 'resource',
					type: 'hidden',
					options: [
						{
							name: '项目列表',
							value: 'itemList',
						},
					],
					default: 'itemList',
				},
				{
					displayName: '操作',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: '合并项目',
							value: 'aggregateItems',
							description: '将字段组合成单个新项目中的列表',
							action: '合并项目',
						},
						{
							name: '限制',
							value: 'limit',
							description: '如果项目过多则移除',
							action: '限制',
						},
						{
							name: '移除重复项',
							value: 'removeDuplicates',
							description: '移除相似的额外项目',
							action: '移除重复项',
						},
						{
							name: '排序',
							value: 'sort',
							description: '更改项目顺序',
							action: '排序',
						},
						{
							name: '拆分项目',
							value: 'splitOutItems',
							description: '将项目内的列表或对象属性值拆分为独立项目',
							action: '拆分项目',
						},
						{
							name: '汇总',
							value: 'summarize',
							description: '聚合项目（数据透视表）',
							action: '汇总',
						},
					],
					default: 'splitOutItems',
				},
				// Split out items - Fields
				{
					displayName: '要拆分的字段',
					name: 'fieldToSplitOut',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['splitOutItems'],
						},
					},
					description: '要拆分为独立项目的输入字段名称',
					requiresDataPath: 'multiple',
				},
				{
					displayName: '包含',
					name: 'include',
					type: 'options',
					options: [
						{
							name: '不包含其他字段',
							value: 'noOtherFields',
						},
						{
							name: '所有其他字段',
							value: 'allOtherFields',
						},
						{
							name: '选定的其他字段',
							value: 'selectedOtherFields',
						},
					],
					default: 'noOtherFields',
					description: 'Whether to copy any other fields into the new items',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['splitOutItems'],
						},
					},
				},
				{
					displayName: '要包含的字段',
					name: 'fieldsToInclude',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加要包含的字段',
					default: {},
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['splitOutItems'],
							include: ['selectedOtherFields'],
						},
					},
					options: [
						{
							displayName: '',
							name: 'fields',
							values: [
								{
									displayName: '字段名称',
									name: 'fieldName',
									type: 'string',
									default: '',
									description: 'A field in the input items to aggregate together',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
							],
						},
					],
				},
				// Aggregate Items
				{
					displayName: '聚合',
					name: 'aggregate',
					type: 'options',
					default: 'aggregateIndividualFields',
					options: [
						{
							name: '单个字段',
							value: 'aggregateIndividualFields',
						},
						{
							name: '所有项目数据（合并到单个列表）',
							value: 'aggregateAllItemData',
						},
					],
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['aggregateItems'],
						},
					},
				},
				// Aggregate Individual Fields
				{
					displayName: '要聚合的字段',
					name: 'fieldsToAggregate',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加要聚合的字段',
					default: { fieldToAggregate: [{ fieldToAggregate: '', renameField: false }] },
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['aggregateItems'],
							aggregate: ['aggregateIndividualFields'],
						},
					},
					options: [
						{
							displayName: '',
							name: 'fieldToAggregate',
							values: [
								{
									displayName: '输入字段名称',
									name: 'fieldToAggregate',
									type: 'string',
									default: '',
									description: 'The name of a field in the input items to aggregate together',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
								{
									displayName: '重命名字段',
									name: 'renameField',
									type: 'boolean',
									default: false,
									description: 'Whether to give the field a different name in the output',
								},
								{
									displayName: '输出字段名称',
									name: 'outputFieldName',
									displayOptions: {
										show: {
											renameField: [true],
										},
									},
									type: 'string',
									default: '',
									description:
										'The name of the field to put the aggregated data in. Leave blank to use the input field name.',
									requiresDataPath: 'single',
								},
							],
						},
					],
				},
				// Aggregate All Item Data
				{
					displayName: '输出字段',
					name: 'destinationFieldName',
					type: 'string',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['aggregateItems'],
							aggregate: ['aggregateAllItemData'],
						},
					},
					default: 'data',
					description: 'The name of the output field to put the data in',
				},
				{
					displayName: '包含',
					name: 'include',
					type: 'options',
					default: 'allFields',
					options: [
						{
							name: '所有字段',
							value: 'allFields',
						},
						{
							name: '指定字段',
							value: 'specifiedFields',
						},
						{
							name: '除外所有字段',
							value: 'allFieldsExcept',
						},
					],
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['aggregateItems'],
							aggregate: ['aggregateAllItemData'],
						},
					},
				},
				{
					displayName: '要排除的字段',
					name: 'fieldsToExclude',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加要排除的字段',
					default: {},
					options: [
						{
							displayName: '',
							name: 'fields',
							values: [
								{
									displayName: '字段名称',
									name: 'fieldName',
									type: 'string',
									default: '',
									description: 'A field in the input to exclude from the object in output array',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
							],
						},
					],
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['aggregateItems'],
							aggregate: ['aggregateAllItemData'],
							include: ['allFieldsExcept'],
						},
					},
				},
				{
					displayName: '要包含的字段',
					name: 'fieldsToInclude',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加要包含的字段',
					default: {},
					options: [
						{
							displayName: '',
							name: 'fields',
							values: [
								{
									displayName: '字段名称',
									name: 'fieldName',
									type: 'string',
									default: '',
									description: 'Specify fields that will be included in output array',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
							],
						},
					],
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['aggregateItems'],
							aggregate: ['aggregateAllItemData'],
							include: ['specifiedFields'],
						},
					},
				},
				// Remove duplicates - Fields
				{
					displayName: '比较',
					name: 'compare',
					type: 'options',
					options: [
						{
							name: '所有字段',
							value: 'allFields',
						},
						{
							name: '除外所有字段',
							value: 'allFieldsExcept',
						},
						{
							name: '选定字段',
							value: 'selectedFields',
						},
					],
					default: 'allFields',
					description: 'The fields of the input items to compare to see if they are the same',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['removeDuplicates'],
						},
					},
				},
				{
					displayName: '要排除的字段',
					name: 'fieldsToExclude',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加要排除的字段',
					default: {},
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['removeDuplicates'],
							compare: ['allFieldsExcept'],
						},
					},
					options: [
						{
							displayName: '',
							name: 'fields',
							values: [
								{
									displayName: '字段名称',
									name: 'fieldName',
									type: 'string',
									default: '',
									description: 'A field in the input to exclude from the comparison',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
							],
						},
					],
				},
				{
					displayName: '要比较的字段',
					name: 'fieldsToCompare',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加要比较的字段',
					default: {},
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['removeDuplicates'],
							compare: ['selectedFields'],
						},
					},
					options: [
						{
							displayName: '',
							name: 'fields',
							values: [
								{
									displayName: '字段名称',
									name: 'fieldName',
									type: 'string',
									default: '',
									description: 'A field in the input to add to the comparison',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
							],
						},
					],
				},
				// Sort - Fields
				{
					displayName: '类型',
					name: 'type',
					type: 'options',
					options: [
						{
							name: '简单',
							value: 'simple',
						},
						{
							name: '随机',
							value: 'random',
						},
						{
							name: '代码',
							value: 'code',
						},
					],
					default: 'simple',
					description: 'The fields of the input items to compare to see if they are the same',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['sort'],
						},
					},
				},
				{
					displayName: '排序字段',
					name: 'sortFieldsUi',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					placeholder: '添加排序字段',
					options: [
						{
							displayName: '',
							name: 'sortField',
							values: [
								{
									displayName: '字段名称',
									name: 'fieldName',
									type: 'string',
									required: true,
									default: '',
									description: 'The field to sort by',
									// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
									placeholder: '例如：id',
									hint: ' 以文本形式输入字段名称',
									requiresDataPath: 'single',
								},
								{
									displayName: '顺序',
									name: 'order',
									type: 'options',
									options: [
										{
											name: '升序',
											value: 'ascending',
										},
										{
											name: '降序',
											value: 'descending',
										},
									],
									default: 'ascending',
									description: 'The order to sort by',
								},
							],
						},
					],
					default: {},
					description: 'The fields of the input items to compare to see if they are the same',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['sort'],
							type: ['simple'],
						},
					},
				},
				{
					displayName: 'Code',
					name: 'code',
					type: 'string',
					typeOptions: {
						alwaysOpenEditWindow: true,
						editor: 'jsEditor',
						rows: 10,
					},
					default: `// The two items to compare are in the variables a and b
// Access the fields in a.json and b.json
// Return -1 if a should go before b
// Return 1 if b should go before a
// Return 0 if there's no difference

fieldName = 'myField';

if (a.json[fieldName] < b.json[fieldName]) {
		return -1;
}
if (a.json[fieldName] > b.json[fieldName]) {
		return 1;
}
return 0;`,
					description: 'Javascript code to determine the order of any two items',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['sort'],
							type: ['code'],
						},
					},
				},
				// Limit - Fields
				{
					displayName: '最大项目数',
					name: 'maxItems',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 1,
					description: 'If there are more items than this number, some are removed',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['limit'],
						},
					},
				},
				{
					displayName: '保留',
					name: 'keep',
					type: 'options',
					options: [
						{
							name: '开头的项目',
							value: 'firstItems',
						},
						{
							name: '末尾的项目',
							value: 'lastItems',
						},
					],
					default: 'firstItems',
					description: 'When removing items, whether to keep the ones at the start or the ending',
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['limit'],
						},
					},
				},
				{
					displayName: '选项',
					name: 'options',
					type: 'collection',
					placeholder: '添加字段',
					default: {},
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['removeDuplicates'],
							compare: ['allFieldsExcept', 'selectedFields'],
						},
					},
					options: [
						{
							displayName: '移除其他字段',
							name: 'removeOtherFields',
							type: 'boolean',
							default: false,
							description:
								'Whether to remove any fields that are not being compared. If disabled, will keep the values from the first of the duplicates.',
						},
						{
							displayName: '禁用点表示法',
							name: 'disableDotNotation',
							type: 'boolean',
							default: false,
							description:
								'Whether to disallow referencing child fields using `parent.child` in the field name',
						},
					],
				},
				{
					displayName: '选项',
					name: 'options',
					type: 'collection',
					placeholder: '添加字段',
					default: {},
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['sort'],
							type: ['simple'],
						},
					},
					options: [
						{
							displayName: '禁用点表示法',
							name: 'disableDotNotation',
							type: 'boolean',
							default: false,
							description:
								'Whether to disallow referencing child fields using `parent.child` in the field name',
						},
					],
				},
				{
					displayName: '选项',
					name: 'options',
					type: 'collection',
					placeholder: '添加字段',
					default: {},
					displayOptions: {
						show: {
							resource: ['itemList'],
							operation: ['splitOutItems', 'aggregateItems'],
						},
						hide: {
							aggregate: ['aggregateAllItemData'],
						},
					},
					options: [
						{
							displayName: '禁用点表示法',
							name: 'disableDotNotation',
							type: 'boolean',
							displayOptions: {
								show: {
									'/operation': ['splitOutItems', 'aggregateItems'],
								},
							},
							default: false,
							description:
								'Whether to disallow referencing child fields using `parent.child` in the field name',
						},
						{
							displayName: '目标字段名称',
							name: 'destinationFieldName',
							type: 'string',
							requiresDataPath: 'multiple',
							displayOptions: {
								show: {
									'/operation': ['splitOutItems'],
								},
							},
							default: '',
							description: 'The field in the output under which to put the split field contents',
						},
						{
							displayName: '合并列表',
							name: 'mergeLists',
							type: 'boolean',
							displayOptions: {
								show: {
									'/operation': ['aggregateItems'],
								},
							},
							default: false,
							description:
								'Whether to merge the output into a single flat list (rather than a list of lists), if the field to aggregate is a list',
						},
						{
							displayName: '保留缺失和空值',
							name: 'keepMissing',
							type: 'boolean',
							displayOptions: {
								show: {
									'/operation': ['aggregateItems'],
								},
							},
							default: false,
							description:
								'Whether to add a null entry to the aggregated list when there is a missing or null value',
						},
					],
				},
				// Remove duplicates - Fields
				...summarize.description,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;

		if (resource === 'itemList') {
			if (operation === 'splitOutItems') {
				for (let i = 0; i < length; i++) {
					const fieldsToSplitOut = (this.getNodeParameter('fieldToSplitOut', i) as string)
						.split(',')
						.map((field) => field.trim());
					const disableDotNotation = this.getNodeParameter(
						'options.disableDotNotation',
						0,
						false,
					) as boolean;

					const destinationFields = (
						this.getNodeParameter('options.destinationFieldName', i, '') as string
					)
						.split(',')
						.filter((field) => field.trim() !== '')
						.map((field) => field.trim());

					if (destinationFields.length && destinationFields.length !== fieldsToSplitOut.length) {
						throw new NodeOperationError(
							this.getNode(),
							'If multiple fields to split out are given, the same number of destination fields must be given',
						);
					}

					const include = this.getNodeParameter('include', i) as
						| 'selectedOtherFields'
						| 'allOtherFields'
						| 'noOtherFields';

					const multiSplit = fieldsToSplitOut.length > 1;

					const item = { ...items[i].json };
					const splited: IDataObject[] = [];
					for (const [entryIndex, fieldToSplitOut] of fieldsToSplitOut.entries()) {
						const destinationFieldName = destinationFields[entryIndex] || '';

						let arrayToSplit;
						if (!disableDotNotation) {
							arrayToSplit = get(item, fieldToSplitOut);
						} else {
							arrayToSplit = item[fieldToSplitOut];
						}

						if (arrayToSplit === undefined) {
							if (nodeVersion < 2.1) {
								if (fieldToSplitOut.includes('.') && disableDotNotation) {
									throw new NodeOperationError(
										this.getNode(),
										`Couldn't find the field '${fieldToSplitOut}' in the input data`,
										{
											description:
												"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
										},
									);
								} else {
									throw new NodeOperationError(
										this.getNode(),
										`Couldn't find the field '${fieldToSplitOut}' in the input data`,
										{ itemIndex: i },
									);
								}
							} else {
								arrayToSplit = [];
							}
						}

						if (typeof arrayToSplit !== 'object' || arrayToSplit === null) {
							if (nodeVersion < 2.2) {
								throw new NodeOperationError(
									this.getNode(),
									`The provided field '${fieldToSplitOut}' is not an array or object`,
									{ itemIndex: i },
								);
							} else {
								arrayToSplit = [arrayToSplit];
							}
						}

						if (!Array.isArray(arrayToSplit)) {
							arrayToSplit = Object.values(arrayToSplit);
						}

						for (const [elementIndex, element] of arrayToSplit.entries()) {
							if (splited[elementIndex] === undefined) {
								splited[elementIndex] = {};
							}

							const fieldName = destinationFieldName || fieldToSplitOut;

							if (typeof element === 'object' && element !== null && include === 'noOtherFields') {
								if (destinationFieldName === '' && !multiSplit) {
									splited[elementIndex] = { ...splited[elementIndex], ...element };
								} else {
									splited[elementIndex][fieldName] = element;
								}
							} else {
								splited[elementIndex][fieldName] = element;
							}
						}
					}

					for (const splitEntry of splited) {
						let newItem: IDataObject = {};

						if (include === 'noOtherFields') {
							newItem = splitEntry;
						}

						if (include === 'allOtherFields') {
							const itemCopy = deepCopy(item);
							for (const fieldToSplitOut of fieldsToSplitOut) {
								if (!disableDotNotation) {
									unset(itemCopy, fieldToSplitOut);
								} else {
									delete itemCopy[fieldToSplitOut];
								}
							}
							newItem = { ...itemCopy, ...splitEntry };
						}

						if (include === 'selectedOtherFields') {
							const fieldsToInclude = (
								this.getNodeParameter('fieldsToInclude.fields', i, []) as [{ fieldName: string }]
							).map((field) => field.fieldName);

							if (!fieldsToInclude.length) {
								throw new NodeOperationError(this.getNode(), 'No fields specified', {
									description: 'Please add a field to include',
								});
							}

							for (const field of fieldsToInclude) {
								if (!disableDotNotation) {
									splitEntry[field] = get(item, field);
								} else {
									splitEntry[field] = item[field];
								}
							}

							newItem = splitEntry;
						}

						returnData.push({
							json: newItem,
							pairedItem: {
								item: i,
							},
						});
					}
				}

				return [returnData];
			} else if (operation === 'aggregateItems') {
				const aggregate = this.getNodeParameter('aggregate', 0, '') as string;

				if (aggregate === 'aggregateIndividualFields') {
					const disableDotNotation = this.getNodeParameter(
						'options.disableDotNotation',
						0,
						false,
					) as boolean;
					const mergeLists = this.getNodeParameter('options.mergeLists', 0, false) as boolean;
					const fieldsToAggregate = this.getNodeParameter(
						'fieldsToAggregate.fieldToAggregate',
						0,
						[],
					) as [{ fieldToAggregate: string; renameField: boolean; outputFieldName: string }];
					const keepMissing = this.getNodeParameter('options.keepMissing', 0, false) as boolean;

					if (!fieldsToAggregate.length) {
						throw new NodeOperationError(this.getNode(), 'No fields specified', {
							description: 'Please add a field to aggregate',
						});
					}

					if (nodeVersion < 2.1) {
						for (const { fieldToAggregate } of fieldsToAggregate) {
							let found = false;
							for (const item of items) {
								if (fieldToAggregate === '') {
									throw new NodeOperationError(this.getNode(), 'Field to aggregate is blank', {
										description: 'Please add a field to aggregate',
									});
								}
								if (!disableDotNotation) {
									if (get(item.json, fieldToAggregate) !== undefined) {
										found = true;
									}
								} else if (item.json.hasOwnProperty(fieldToAggregate)) {
									found = true;
								}
							}
							if (!found && disableDotNotation && fieldToAggregate.includes('.')) {
								throw new NodeOperationError(
									this.getNode(),
									`Couldn't find the field '${fieldToAggregate}' in the input data`,
									{
										description:
											"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
									},
								);
							} else if (!found && !keepMissing) {
								throw new NodeOperationError(
									this.getNode(),
									`Couldn't find the field '${fieldToAggregate}' in the input data`,
								);
							}
						}
					}

					const newItem: INodeExecutionData = {
						json: {},
						pairedItem: Array.from({ length }, (_, i) => i).map((index) => {
							return {
								item: index,
							};
						}),
					};

					const values: { [key: string]: any } = {};
					const outputFields: string[] = [];

					for (const { fieldToAggregate, outputFieldName, renameField } of fieldsToAggregate) {
						const field = renameField ? outputFieldName : fieldToAggregate;

						if (outputFields.includes(field)) {
							throw new NodeOperationError(
								this.getNode(),
								`The '${field}' output field is used more than once`,
								{ description: 'Please make sure each output field name is unique' },
							);
						} else {
							outputFields.push(field);
						}

						const getFieldToAggregate = () =>
							!disableDotNotation && fieldToAggregate.includes('.')
								? fieldToAggregate.split('.').pop()
								: fieldToAggregate;

						const _outputFieldName = outputFieldName
							? outputFieldName
							: (getFieldToAggregate() as string);

						if (fieldToAggregate !== '') {
							values[_outputFieldName] = [];
							for (let i = 0; i < length; i++) {
								if (!disableDotNotation) {
									let value = get(items[i].json, fieldToAggregate);

									if (!keepMissing) {
										if (Array.isArray(value)) {
											value = value.filter((entry) => entry !== null);
										} else if (value === null || value === undefined) {
											continue;
										}
									}

									if (Array.isArray(value) && mergeLists) {
										values[_outputFieldName].push(...value);
									} else {
										values[_outputFieldName].push(value);
									}
								} else {
									let value = items[i].json[fieldToAggregate];

									if (!keepMissing) {
										if (Array.isArray(value)) {
											value = value.filter((entry) => entry !== null);
										} else if (value === null || value === undefined) {
											continue;
										}
									}

									if (Array.isArray(value) && mergeLists) {
										values[_outputFieldName].push(...value);
									} else {
										values[_outputFieldName].push(value);
									}
								}
							}
						}
					}

					for (const key of Object.keys(values)) {
						if (!disableDotNotation) {
							set(newItem.json, key, values[key]);
						} else {
							newItem.json[key] = values[key];
						}
					}

					returnData.push(newItem);

					return [returnData];
				} else {
					let newItems: IDataObject[] = items.map((item) => item.json);
					let pairedItem: IPairedItemData[] = [];
					const destinationFieldName = this.getNodeParameter('destinationFieldName', 0) as string;
					const fieldsToExclude = (
						this.getNodeParameter('fieldsToExclude.fields', 0, []) as IDataObject[]
					).map((entry) => entry.fieldName);
					const fieldsToInclude = (
						this.getNodeParameter('fieldsToInclude.fields', 0, []) as IDataObject[]
					).map((entry) => entry.fieldName);

					if (fieldsToExclude.length || fieldsToInclude.length) {
						newItems = newItems.reduce((acc, item, index) => {
							const newItem: IDataObject = {};
							let outputFields = Object.keys(item);

							if (fieldsToExclude.length) {
								outputFields = outputFields.filter((key) => !fieldsToExclude.includes(key));
							}
							if (fieldsToInclude.length) {
								outputFields = outputFields.filter((key) =>
									fieldsToInclude.length ? fieldsToInclude.includes(key) : true,
								);
							}

							outputFields.forEach((key) => {
								newItem[key] = item[key];
							});

							if (isEmpty(newItem)) {
								return acc;
							}
							pairedItem.push({ item: index });
							return acc.concat([newItem]);
						}, [] as IDataObject[]);
					} else {
						pairedItem = Array.from({ length: newItems.length }, (_, item) => ({
							item,
						}));
					}

					return [[{ json: { [destinationFieldName]: newItems }, pairedItem }]];
				}
			} else if (operation === 'removeDuplicates') {
				const compare = this.getNodeParameter('compare', 0) as string;
				const disableDotNotation = this.getNodeParameter(
					'options.disableDotNotation',
					0,
					false,
				) as boolean;
				const removeOtherFields = this.getNodeParameter(
					'options.removeOtherFields',
					0,
					false,
				) as boolean;

				let keys = disableDotNotation
					? Object.keys(items[0].json)
					: Object.keys(flattenKeys(items[0].json));

				for (const item of items) {
					for (const key of disableDotNotation
						? Object.keys(item.json)
						: Object.keys(flattenKeys(item.json))) {
						if (!keys.includes(key)) {
							keys.push(key);
						}
					}
				}

				if (compare === 'allFieldsExcept') {
					const fieldsToExclude = (
						this.getNodeParameter('fieldsToExclude.fields', 0, []) as [{ fieldName: string }]
					).map((field) => field.fieldName);
					if (!fieldsToExclude.length) {
						throw new NodeOperationError(
							this.getNode(),
							'No fields specified. Please add a field to exclude from comparison',
						);
					}
					if (!disableDotNotation) {
						keys = Object.keys(flattenKeys(items[0].json));
					}
					keys = keys.filter((key) => !fieldsToExclude.includes(key));
				}
				if (compare === 'selectedFields') {
					const fieldsToCompare = (
						this.getNodeParameter('fieldsToCompare.fields', 0, []) as [{ fieldName: string }]
					).map((field) => field.fieldName);
					if (!fieldsToCompare.length) {
						throw new NodeOperationError(
							this.getNode(),
							'No fields specified. Please add a field to compare on',
						);
					}
					if (!disableDotNotation) {
						keys = Object.keys(flattenKeys(items[0].json));
					}
					keys = fieldsToCompare.map((key) => key.trim());
				}

				// This solution is O(nlogn)
				// add original index to the items
				const newItems = items.map(
					(item, index) =>
						({
							json: { ...item.json, __INDEX: index },
							pairedItem: { item: index },
						}) as INodeExecutionData,
				);
				//sort items using the compare keys
				newItems.sort((a, b) => {
					let result = 0;

					for (const key of keys) {
						let equal;
						if (!disableDotNotation) {
							equal = isEqual(get(a.json, key), get(b.json, key));
						} else {
							equal = isEqual(a.json[key], b.json[key]);
						}
						if (!equal) {
							let lessThan;
							if (!disableDotNotation) {
								lessThan = lt(get(a.json, key), get(b.json, key));
							} else {
								lessThan = lt(a.json[key], b.json[key]);
							}
							result = lessThan ? -1 : 1;
							break;
						}
					}
					return result;
				});

				for (const key of keys) {
					let type: any = undefined;
					for (const item of newItems) {
						if (key === '') {
							throw new NodeOperationError(this.getNode(), 'Name of field to compare is blank');
						}
						const value = !disableDotNotation ? get(item.json, key) : item.json[key];
						if (value === undefined && disableDotNotation && key.includes('.')) {
							throw new NodeOperationError(
								this.getNode(),
								`'${key}' field is missing from some input items`,
								{
									description:
										"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
								},
							);
						} else if (value === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								`'${key}' field is missing from some input items`,
							);
						}
						if (type !== undefined && value !== undefined && type !== typeof value) {
							throw new NodeOperationError(this.getNode(), `'${key}' isn't always the same type`, {
								description: 'The type of this field varies between items',
							});
						} else {
							type = typeof value;
						}
					}
				}

				// collect the original indexes of items to be removed
				const removedIndexes: number[] = [];
				let temp = newItems[0];
				for (let index = 1; index < newItems.length; index++) {
					if (compareItems(newItems[index], temp, keys, disableDotNotation)) {
						removedIndexes.push(newItems[index].json.__INDEX as unknown as number);
					} else {
						temp = newItems[index];
					}
				}

				let data = items.filter((_, index) => !removedIndexes.includes(index));

				if (removeOtherFields) {
					data = data.map((item, index) => ({
						json: pick(item.json, ...keys),
						pairedItem: { item: index },
					}));
				}

				// return the filtered items
				return [data];
			} else if (operation === 'sort') {
				let newItems = [...items];
				const type = this.getNodeParameter('type', 0) as string;
				const disableDotNotation = this.getNodeParameter(
					'options.disableDotNotation',
					0,
					false,
				) as boolean;

				if (type === 'random') {
					shuffleArray(newItems);
					return [newItems];
				}

				if (type === 'simple') {
					const sortFieldsUi = this.getNodeParameter('sortFieldsUi', 0) as IDataObject;
					const sortFields = sortFieldsUi.sortField as Array<{
						fieldName: string;
						order: 'ascending' | 'descending';
					}>;

					if (!sortFields?.length) {
						throw new NodeOperationError(
							this.getNode(),
							'No sorting specified. Please add a field to sort by',
						);
					}

					for (const { fieldName } of sortFields) {
						let found = false;
						for (const item of items) {
							if (!disableDotNotation) {
								if (get(item.json, fieldName) !== undefined) {
									found = true;
								}
							} else if (item.json.hasOwnProperty(fieldName)) {
								found = true;
							}
						}
						if (!found && disableDotNotation && fieldName.includes('.')) {
							throw new NodeOperationError(
								this.getNode(),
								`Couldn't find the field '${fieldName}' in the input data`,
								{
									description:
										"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
								},
							);
						} else if (!found) {
							throw new NodeOperationError(
								this.getNode(),
								`Couldn't find the field '${fieldName}' in the input data`,
							);
						}
					}

					const sortFieldsWithDirection = sortFields.map((field) => ({
						name: field.fieldName,
						dir: field.order === 'ascending' ? 1 : -1,
					}));

					newItems.sort((a, b) => {
						let result = 0;
						for (const field of sortFieldsWithDirection) {
							let equal;
							if (!disableDotNotation) {
								const _a =
									typeof get(a.json, field.name) === 'string'
										? (get(a.json, field.name) as string).toLowerCase()
										: get(a.json, field.name);
								const _b =
									typeof get(b.json, field.name) === 'string'
										? (get(b.json, field.name) as string).toLowerCase()
										: get(b.json, field.name);
								equal = isEqual(_a, _b);
							} else {
								const _a =
									typeof a.json[field.name] === 'string'
										? (a.json[field.name] as string).toLowerCase()
										: a.json[field.name];
								const _b =
									typeof b.json[field.name] === 'string'
										? (b.json[field.name] as string).toLowerCase()
										: b.json[field.name];
								equal = isEqual(_a, _b);
							}

							if (!equal) {
								let lessThan;
								if (!disableDotNotation) {
									const _a =
										typeof get(a.json, field.name) === 'string'
											? (get(a.json, field.name) as string).toLowerCase()
											: get(a.json, field.name);
									const _b =
										typeof get(b.json, field.name) === 'string'
											? (get(b.json, field.name) as string).toLowerCase()
											: get(b.json, field.name);
									lessThan = lt(_a, _b);
								} else {
									const _a =
										typeof a.json[field.name] === 'string'
											? (a.json[field.name] as string).toLowerCase()
											: a.json[field.name];
									const _b =
										typeof b.json[field.name] === 'string'
											? (b.json[field.name] as string).toLowerCase()
											: b.json[field.name];
									lessThan = lt(_a, _b);
								}
								if (lessThan) {
									result = -1 * field.dir;
								} else {
									result = 1 * field.dir;
								}
								break;
							}
						}
						return result;
					});
				} else {
					newItems = sortByCode.call(this, newItems);
				}
				return [newItems];
			} else if (operation === 'limit') {
				let newItems = items;
				const maxItems = this.getNodeParameter('maxItems', 0) as number;
				const keep = this.getNodeParameter('keep', 0) as string;

				if (maxItems > items.length) {
					return [newItems];
				}

				if (keep === 'firstItems') {
					newItems = items.slice(0, maxItems);
				} else {
					newItems = items.slice(items.length - maxItems, items.length);
				}
				return [newItems];
			} else if (operation === 'summarize') {
				return await summarize.execute.call(this, items);
			} else {
				throw new NodeOperationError(this.getNode(), `Operation '${operation}' is not recognized`);
			}
		} else {
			throw new NodeOperationError(this.getNode(), `Resource '${resource}' is not recognized`);
		}
	}
}
