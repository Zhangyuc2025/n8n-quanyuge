import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { addBinariesToItem, prepareFieldsArray } from '../../helpers/utils';
import { disableDotNotationBoolean } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Aggregate',
		name: 'aggregate',
		type: 'options',
		default: 'aggregateIndividualFields',
		options: [
			{
				name: 'Individual Fields',
				value: 'aggregateIndividualFields',
			},
			{
				name: 'All Item Data (Into a Single List)',
				value: 'aggregateAllItemData',
			},
		],
	},
	{
		displayName: 'Fields To Aggregate',
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
						displayName: 'Input Field Name',
						name: 'fieldToAggregate',
						type: 'string',
						default: '',
						description: '输入项目中要聚合的字段名称',
						// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
						placeholder: 'e.g. id',
						hint: ' 以文本形式输入字段名称',
						requiresDataPath: 'single',
					},
					{
						displayName: 'Rename Field',
						name: 'renameField',
						type: 'boolean',
						default: false,
						description: '是否在输出中为字段使用不同的名称',
					},
					{
						displayName: 'Output Field Name',
						name: 'outputFieldName',
						displayOptions: {
							show: {
								renameField: [true],
							},
						},
						type: 'string',
						default: '',
						description: '放置聚合数据的字段名称。留空则使用输入字段名称。',
						requiresDataPath: 'single',
					},
				],
			},
		],
	},
	{
		displayName: 'Put Output in Field',
		name: 'destinationFieldName',
		type: 'string',
		displayOptions: {
			show: {
				aggregate: ['aggregateAllItemData'],
			},
		},
		default: 'data',
		description: '放置数据的输出字段名称',
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'options',
		default: 'allFields',
		options: [
			{
				name: 'All Fields',
				value: 'allFields',
			},
			{
				name: 'Specified Fields',
				value: 'specifiedFields',
			},
			{
				name: 'All Fields Except',
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
		displayName: 'Fields To Exclude',
		name: 'fieldsToExclude',
		type: 'string',
		placeholder: 'e.g. email, name',
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
		displayName: 'Fields To Include',
		name: 'fieldsToInclude',
		type: 'string',
		placeholder: 'e.g. email, name',
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: '添加字段',
		default: {},
		options: [
			{
				...disableDotNotationBoolean,
				displayOptions: {
					hide: {
						'/aggregate': ['aggregateAllItemData'],
					},
				},
			},
			{
				displayName: 'Merge Lists',
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
				displayName: 'Include Binaries',
				name: 'includeBinaries',
				type: 'boolean',
				default: false,
				description: '是否在新项目中包含二进制数据',
			},
			{
				displayName: 'Keep Only Unique Binaries',
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
				displayName: 'Keep Missing And Null Values',
				name: 'keepMissing',
				type: 'boolean',
				default: false,
				description: '当存在缺失或空值时，是否向聚合列表添加 null 条目',
				displayOptions: {
					hide: {
						'/aggregate': ['aggregateAllItemData'],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['concatenateItems'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData = { json: {}, pairedItem: [] };

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
				for (let i = 0; i < items.length; i++) {
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

	return [returnData];
}
