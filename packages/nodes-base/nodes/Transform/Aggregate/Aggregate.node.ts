import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import set from 'lodash/set';
import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPairedItemData,
	NodeConnectionTypes,
	type NodeExecutionHint,
} from 'n8n-workflow';

import { addBinariesToItem } from './utils';
import { prepareFieldsArray } from '../utils/utils';

export class Aggregate implements INodeType {
	description: INodeTypeDescription = {
		displayName: '聚合',
		name: 'aggregate',
		icon: 'file:aggregate.svg',
		group: ['transform'],
		subtitle: '',
		version: 1,
		description: '将多个项目的字段合并到单个项目的列表中',
		defaults: {
			name: '聚合',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
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
			},
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
								description: '要聚合在一起的输入项目中的字段名称',
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
								description: '是否在输出中为字段指定不同的名称',
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
								description: '用于放置聚合数据的字段名称。留空以使用输入字段名称。',
								requiresDataPath: 'single',
							},
						],
					},
				],
			},
			{
				displayName: '输出字段',
				name: 'destinationFieldName',
				type: 'string',
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
					},
				},
				default: 'data',
				description: '用于放置数据的输出字段名称',
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
						name: '除外的所有字段',
						value: 'allFieldsExcept',
					},
				],
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
					},
				},
			},
			{
				displayName: '要排除的字段',
				name: 'fieldsToExclude',
				type: 'string',
				placeholder: '例如：email, name',
				default: '',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
						include: ['allFieldsExcept'],
					},
				},
			},
			{
				displayName: '要包含的字段',
				name: 'fieldsToInclude',
				type: 'string',
				placeholder: '例如：email, name',
				default: '',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
						include: ['specifiedFields'],
					},
				},
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加字段',
				default: {},
				options: [
					{
						displayName: '禁用点表示法',
						name: 'disableDotNotation',
						type: 'boolean',
						default: false,
						description: '是否禁止在字段名称中使用 `parent.child` 引用子字段',
						displayOptions: {
							hide: {
								'/aggregate': ['aggregateAllItemData'],
							},
						},
					},
					{
						displayName: '合并列表',
						name: 'mergeLists',
						type: 'boolean',
						default: false,
						description: '如果要聚合的字段是列表，是否将输出合并为单个扁平列表（而不是列表的列表）',
						displayOptions: {
							hide: {
								'/aggregate': ['aggregateAllItemData'],
							},
						},
					},
					{
						displayName: '包含二进制数据',
						name: 'includeBinaries',
						type: 'boolean',
						default: false,
						description: '是否在新项目中包含二进制数据',
					},
					{
						displayName: '仅保留唯一的二进制数据',
						name: 'keepOnlyUnique',
						type: 'boolean',
						default: false,
						description:
							'是否通过比较 MIME 类型、文件类型、文件大小和文件扩展名来仅保留唯一的二进制数据',
						displayOptions: {
							show: {
								includeBinaries: [true],
							},
						},
					},
					{
						displayName: '保留缺失值和空值',
						name: 'keepMissing',
						type: 'boolean',
						default: false,
						description: '当存在缺失值或空值时，是否在聚合列表中添加空条目',
						displayOptions: {
							hide: {
								'/aggregate': ['aggregateAllItemData'],
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData = { json: {}, pairedItem: [] };
		const items = this.getInputData();
		const notFoundedFields: { [key: string]: boolean[] } = {};

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
				throw new NodeOperationError(this.getNode(), '未指定字段', {
					description: '请添加要聚合的字段',
				});
			}

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: Array.from({ length: items.length }, (_, i) => i).map((index) => {
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
					throw new NodeOperationError(this.getNode(), `输出字段 '${field}' 被多次使用`, {
						description: '请确保每个输出字段名称都是唯一的',
					});
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
					for (let i = 0; i < items.length; i++) {
						if (notFoundedFields[fieldToAggregate] === undefined) {
							notFoundedFields[fieldToAggregate] = [];
						}

						if (!disableDotNotation) {
							let value = get(items[i].json, fieldToAggregate);
							notFoundedFields[fieldToAggregate].push(value === undefined ? false : true);

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
							notFoundedFields[fieldToAggregate].push(value === undefined ? false : true);

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

			returnData = newItem;
		} else {
			let newItems: IDataObject[] = items.map((item) => item.json);
			let pairedItem: IPairedItemData[] = [];
			const destinationFieldName = this.getNodeParameter('destinationFieldName', 0) as string;

			const fieldsToExclude = prepareFieldsArray(
				this.getNodeParameter('fieldsToExclude', 0, '') as string,
				'Fields To Exclude',
			);

			const fieldsToInclude = prepareFieldsArray(
				this.getNodeParameter('fieldsToInclude', 0, '') as string,
				'Fields To Include',
			);

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

			const output: INodeExecutionData = { json: { [destinationFieldName]: newItems }, pairedItem };

			returnData = output;
		}

		const includeBinaries = this.getNodeParameter('options.includeBinaries', 0, false) as boolean;

		if (includeBinaries) {
			const pairedItems = (returnData.pairedItem || []) as IPairedItemData[];

			const aggregatedItems = pairedItems.map((item) => {
				return items[item.item];
			});

			const keepOnlyUnique = this.getNodeParameter('options.keepOnlyUnique', 0, false) as boolean;

			addBinariesToItem(returnData, aggregatedItems, keepOnlyUnique);
		}

		if (Object.keys(notFoundedFields).length) {
			const hints: NodeExecutionHint[] = [];

			for (const [field, values] of Object.entries(notFoundedFields)) {
				if (values.every((value) => !value)) {
					hints.push({
						message: `在任何输入项目中都找不到字段 '${field}'`,
						location: 'outputPane',
					});
				}
			}

			if (hints.length) {
				this.addExecutionHints(...hints);
			}
		}

		return [[returnData]];
	}
}
