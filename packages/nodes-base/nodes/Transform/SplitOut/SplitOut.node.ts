import get from 'lodash/get';
import unset from 'lodash/unset';
import { NodeOperationError, deepCopy, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { prepareFieldsArray } from '../utils/utils';
import { FieldsTracker } from './utils';

export class SplitOut implements INodeType {
	description: INodeTypeDescription = {
		displayName: '拆分',
		name: 'splitOut',
		icon: 'file:splitOut.svg',
		group: ['transform'],
		subtitle: '',
		version: 1,
		description: '将项目内的列表拆分为单独的项目',
		defaults: {
			name: '拆分',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '要拆分的字段',
				name: 'fieldToSplitOut',
				type: 'string',
				default: '',
				required: true,
				placeholder: '从左侧拖动字段或输入字段名',
				description:
					'要拆分为单独项目的输入字段名称。多个字段名用逗号分隔。对于二进制数据，使用 $binary',
				requiresDataPath: 'multiple',
				hint: '使用 $binary 按二进制数据拆分输入项目',
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
				description: '是否将其他字段复制到新项目中',
			},
			{
				displayName: '要包含的字段',
				name: 'fieldsToInclude',
				type: 'string',
				placeholder: '例如：email, name',
				requiresDataPath: 'multiple',
				description: '输入项目中要一起聚合的字段',
				default: '',
				displayOptions: {
					show: {
						include: ['selectedOtherFields'],
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
						description: '是否禁止在字段名中使用 `parent.child` 引用子字段',
					},
					{
						displayName: '目标字段名',
						name: 'destinationFieldName',
						type: 'string',
						requiresDataPath: 'multiple',
						default: '',
						description: '输出中放置拆分字段内容的字段',
					},
					{
						displayName: '包含二进制数据',
						name: 'includeBinary',
						type: 'boolean',
						default: false,
						description: '是否在新项目中包含二进制数据',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();
		const fieldsTracker = new FieldsTracker();

		for (let i = 0; i < items.length; i++) {
			const fieldsToSplitOut = (this.getNodeParameter('fieldToSplitOut', i) as string)
				.split(',')
				.map((field) => field.trim().replace(/^\$json\./, ''));

			const options = this.getNodeParameter('options', i, {});

			const disableDotNotation = options.disableDotNotation as boolean;

			const destinationFields = ((options.destinationFieldName as string) || '')
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
			const splited: INodeExecutionData[] = [];
			for (const [entryIndex, fieldToSplitOut] of fieldsToSplitOut.entries()) {
				const destinationFieldName = destinationFields[entryIndex] || '';

				let entityToSplit: IDataObject[] = [];

				if (fieldToSplitOut === '$binary') {
					entityToSplit = Object.entries(items[i].binary || {}).map(([key, value]) => ({
						[key]: value,
					}));
				} else {
					if (!disableDotNotation) {
						entityToSplit = get(item, fieldToSplitOut) as IDataObject[];
					} else {
						entityToSplit = item[fieldToSplitOut] as IDataObject[];
					}

					fieldsTracker.add(fieldToSplitOut);

					const entryExists = entityToSplit !== undefined;

					if (!entryExists) {
						entityToSplit = [];
					}

					fieldsTracker.update(fieldToSplitOut, entryExists);

					if (typeof entityToSplit !== 'object' || entityToSplit === null) {
						entityToSplit = [entityToSplit] as unknown as IDataObject[];
					}

					if (!Array.isArray(entityToSplit)) {
						entityToSplit = Object.values(entityToSplit);
					}
				}

				for (const [elementIndex, element] of entityToSplit.entries()) {
					if (splited[elementIndex] === undefined) {
						splited[elementIndex] = { json: {}, pairedItem: { item: i } };
					}

					const fieldName = destinationFieldName || fieldToSplitOut;

					if (fieldToSplitOut === '$binary') {
						if (splited[elementIndex].binary === undefined) {
							splited[elementIndex].binary = {};
						}
						splited[elementIndex].binary[Object.keys(element)[0]] = Object.values(
							element,
						)[0] as IBinaryData;

						continue;
					}

					if (typeof element === 'object' && element !== null && include === 'noOtherFields') {
						if (destinationFieldName === '' && !multiSplit) {
							splited[elementIndex] = {
								json: { ...splited[elementIndex].json, ...element },
								pairedItem: { item: i },
							};
						} else {
							splited[elementIndex].json[fieldName] = element;
						}
					} else {
						splited[elementIndex].json[fieldName] = element;
					}
				}
			}

			for (const splitEntry of splited) {
				let newItem: INodeExecutionData = splitEntry;

				if (include === 'allOtherFields') {
					const itemCopy = deepCopy(item);
					for (const fieldToSplitOut of fieldsToSplitOut) {
						if (!disableDotNotation) {
							unset(itemCopy, fieldToSplitOut);
						} else {
							delete itemCopy[fieldToSplitOut];
						}
					}
					newItem.json = { ...itemCopy, ...splitEntry.json };
				}

				if (include === 'selectedOtherFields') {
					const fieldsToInclude = prepareFieldsArray(
						this.getNodeParameter('fieldsToInclude', i, '') as string,
						'Fields To Include',
					);

					if (!fieldsToInclude.length) {
						throw new NodeOperationError(this.getNode(), 'No fields specified', {
							description: 'Please add a field to include',
						});
					}

					for (const field of fieldsToInclude) {
						if (!disableDotNotation) {
							splitEntry.json[field] = get(item, field);
						} else {
							splitEntry.json[field] = item[field];
						}
					}

					newItem = splitEntry;
				}

				const includeBinary = options.includeBinary as boolean;

				if (includeBinary) {
					if (items[i].binary && !newItem.binary) {
						newItem.binary = items[i].binary;
					}
				}

				returnData.push(newItem);
			}
		}

		const hints = fieldsTracker.getHints();

		if (hints.length) {
			this.addExecutionHints(...hints);
		}

		return [returnData];
	}
}
