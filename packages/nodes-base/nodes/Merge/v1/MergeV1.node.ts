import get from 'lodash/get';
import type {
	IExecuteFunctions,
	GenericValue,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy } from 'n8n-workflow';

import { oldVersionNotice } from '@utils/descriptions';

import { generatePairedItemData } from '../../../utils/utilities';

export class MergeV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			icon: 'fa:code-branch',
			version: 1,
			defaults: {
				name: '合并',
				color: '#00bbcc',
			},

			inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			inputNames: ['输入 1', '输入 2'],
			properties: [
				oldVersionNotice,
				{
					displayName: '模式',
					name: 'mode',
					type: 'options',
					options: [
						{
							name: '追加',
							value: 'append',
							description: '合并两个输入的数据。输出将包含输入 1 和输入 2 的项。',
						},
						{
							name: '保留键匹配',
							value: 'keepKeyMatches',
							description: '如果发现与输入 2 数据匹配，则保留输入 1 的数据',
						},
						{
							name: '按索引合并',
							value: 'mergeByIndex',
							description:
								'合并两个输入的数据。输出将包含输入 1 与输入 2 合并后的项。合并根据项的索引进行。因此输入 1 的第一项将与输入 2 的第一项合并，以此类推。',
						},
						{
							name: '按键合并',
							value: 'mergeByKey',
							description:
								'合并两个输入的数据。输出将包含输入 1 与输入 2 合并后的项。合并根据定义的键进行。',
						},
						{
							name: '多路复用',
							value: 'multiplex',
							description:
								'将一个输入的每个值与另一个输入的每个值合并。输出将包含 (m * n) 项，其中 (m) 和 (n) 是输入的长度。',
						},
						{
							name: '直通',
							value: 'passThrough',
							description: '通过一个输入的数据。输出将仅包含定义的输入的项。',
						},
						{
							name: '删除键匹配',
							value: 'removeKeyMatches',
							description: '如果未找到与输入 2 数据的匹配，则保留输入 1 的数据',
						},
						{
							name: '等待',
							value: 'wait',
							description:
								'等待两个输入的数据都可用，然后输出一个空项。源节点必须同时连接到输入 1 和 2。此节点仅支持 2 个源，如果需要更多源，请连接多个合并节点串行。此节点不会输出任何数据。',
						},
					],
					default: 'append',
					description: '分支数据应该如何合并',
				},
				{
					displayName: '连接方式',
					name: 'join',
					type: 'options',
					displayOptions: {
						show: {
							mode: ['mergeByIndex'],
						},
					},
					options: [
						{
							name: '内连接',
							value: 'inner',
							description:
								'合并两个输入都包含的项数。(示例: 输入1 = 5 项, 输入2 = 3 项 | 输出将包含 3 项)。',
						},
						{
							name: '左连接',
							value: 'left',
							description:
								'合并第一个输入包含的项数。(示例: 输入1 = 3 项, 输入2 = 5 项 | 输出将包含 3 项)。',
						},
						{
							name: '外连接',
							value: 'outer',
							description:
								'合并包含最多项的输入的项数。(示例: 输入1 = 3 项, 输入2 = 5 项 | 输出将包含 5 项)。',
						},
					],
					default: 'left',
					description: '如果输入包含不同数量的项，输出将包含多少项',
				},
				{
					displayName: '输入 1 的属性',
					name: 'propertyName1',
					type: 'string',
					default: '',
					hint: '字段的名称，文本形式 (例如 "id")',
					required: true,
					displayOptions: {
						show: {
							mode: ['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'],
						},
					},
					description: '决定输入 1 的哪些项要合并的属性名称',
				},
				{
					displayName: '输入 2 的属性',
					name: 'propertyName2',
					type: 'string',
					default: '',
					hint: '字段的名称，文本形式 (例如 "id")',
					required: true,
					displayOptions: {
						show: {
							mode: ['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'],
						},
					},
					description: '决定输入 2 的哪些项要合并的属性名称',
				},
				{
					displayName: '输出数据',
					name: 'output',
					type: 'options',
					displayOptions: {
						show: {
							mode: ['passThrough'],
						},
					},
					options: [
						{
							name: '输入 1',
							value: 'input1',
						},
						{
							name: '输入 2',
							value: 'input2',
						},
					],
					default: 'input1',
					description: '定义应将哪个输入的数据用作节点的输出',
				},
				{
					displayName: '覆盖方式',
					name: 'overwrite',
					type: 'options',
					displayOptions: {
						show: {
							mode: ['mergeByKey'],
						},
					},
					options: [
						{
							name: '始终',
							value: 'always',
							description: '始终覆盖所有内容',
						},
						{
							name: '如果为空',
							value: 'blank',
							description: '仅覆盖 "null"、"undefined" 或空字符串的值',
						},
						{
							name: '如果缺失',
							value: 'undefined',
							description: '仅添加尚不存在的值',
						},
					],
					default: 'always',
					description: '选择何时用输入 2 的值覆盖输入 1 的值',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		const mode = this.getNodeParameter('mode', 0) as string;

		if (mode === 'append') {
			// Simply appends the data
			for (let i = 0; i < 2; i++) {
				returnData.push.apply(returnData, this.getInputData(i));
			}
		} else if (mode === 'mergeByIndex') {
			// Merges data by index

			const join = this.getNodeParameter('join', 0) as string;

			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (dataInput1 === undefined || dataInput1.length === 0) {
				if (['inner', 'left'].includes(join)) {
					// When "inner" or "left" join return empty if first
					// input does not contain any items
					return [returnData];
				}

				// For "outer" return data of second input
				return [dataInput2];
			}

			if (dataInput2 === undefined || dataInput2.length === 0) {
				if (['left', 'outer'].includes(join)) {
					// When "left" or "outer" join return data of first input
					return [dataInput1];
				}

				// For "inner" return empty
				return [returnData];
			}

			// Default "left"
			let numEntries = dataInput1.length;
			if (join === 'inner') {
				numEntries = Math.min(dataInput1.length, dataInput2.length);
			} else if (join === 'outer') {
				numEntries = Math.max(dataInput1.length, dataInput2.length);
			}

			let newItem: INodeExecutionData;
			for (let i = 0; i < numEntries; i++) {
				if (i >= dataInput1.length) {
					returnData.push(dataInput2[i]);
					continue;
				}
				if (i >= dataInput2.length) {
					returnData.push(dataInput1[i]);
					continue;
				}

				newItem = {
					json: {},
					pairedItem: [
						dataInput1[i].pairedItem as IPairedItemData,
						dataInput2[i].pairedItem as IPairedItemData,
					],
				};

				if (dataInput1[i].binary !== undefined) {
					newItem.binary = {};
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, dataInput1[i].binary);
				}

				// Create also a shallow copy of the json data
				Object.assign(newItem.json, dataInput1[i].json);

				// Copy json data
				for (const key of Object.keys(dataInput2[i].json)) {
					newItem.json[key] = dataInput2[i].json[key];
				}

				// Copy binary data
				if (dataInput2[i].binary !== undefined) {
					if (newItem.binary === undefined) {
						newItem.binary = {};
					}

					for (const key of Object.keys(dataInput2[i].binary!)) {
						newItem.binary[key] = dataInput2[i].binary![key] ?? newItem.binary[key];
					}
				}

				returnData.push(newItem);
			}
		} else if (mode === 'multiplex') {
			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (!dataInput1 || !dataInput2) {
				return [returnData];
			}

			let entry1: INodeExecutionData;
			let entry2: INodeExecutionData;

			for (entry1 of dataInput1) {
				for (entry2 of dataInput2) {
					returnData.push({
						json: {
							...entry1.json,
							...entry2.json,
						},
						pairedItem: [
							entry1.pairedItem as IPairedItemData,
							entry2.pairedItem as IPairedItemData,
						],
					});
				}
			}
			return [returnData];
		} else if (['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'].includes(mode)) {
			const dataInput1 = this.getInputData(0);
			if (!dataInput1) {
				// If it has no input data from first input return nothing
				return [returnData];
			}

			const propertyName1 = this.getNodeParameter('propertyName1', 0) as string;
			const propertyName2 = this.getNodeParameter('propertyName2', 0) as string;
			const overwrite = this.getNodeParameter('overwrite', 0, 'always') as string;

			const dataInput2 = this.getInputData(1);
			if (!dataInput2 || !propertyName1 || !propertyName2) {
				// Second input does not have any data or the property names are not defined
				if (mode === 'keepKeyMatches') {
					// For "keepKeyMatches" return nothing
					return [returnData];
				}

				// For "mergeByKey" and "removeKeyMatches" return the data from the first input
				return [dataInput1];
			}

			// Get the data to copy
			const copyData: {
				[key: string]: INodeExecutionData;
			} = {};
			let entry: INodeExecutionData;
			for (entry of dataInput2) {
				const key = get(entry.json, propertyName2);
				if (!entry.json || !key) {
					// Entry does not have the property so skip it
					continue;
				}

				copyData[key as string] = entry;
			}

			// Copy data on entries or add matching entries
			let referenceValue: GenericValue;
			let key: string;
			for (entry of dataInput1) {
				referenceValue = get(entry.json, propertyName1);

				if (referenceValue === undefined) {
					// Entry does not have the property

					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" add item
						returnData.push(entry);
					}

					// For "mergeByKey" and "keepKeyMatches" skip item
					continue;
				}

				if (!['string', 'number'].includes(typeof referenceValue)) {
					if (referenceValue !== null && referenceValue.constructor.name !== 'Data') {
						// Reference value is not of comparable type

						if (mode === 'removeKeyMatches') {
							// For "removeKeyMatches" add item
							returnData.push(entry);
						}

						// For "mergeByKey" and "keepKeyMatches" skip item
						continue;
					}
				}

				if (typeof referenceValue === 'number') {
					referenceValue = referenceValue.toString();
				} else if (referenceValue !== null && referenceValue.constructor.name === 'Date') {
					referenceValue = (referenceValue as Date).toISOString();
				}

				if (copyData.hasOwnProperty(referenceValue as string)) {
					// Item with reference value got found

					if (['null', 'undefined'].includes(typeof referenceValue)) {
						// The reference value is null or undefined

						if (mode === 'removeKeyMatches') {
							// For "removeKeyMatches" add item
							returnData.push(entry);
						}

						// For "mergeByKey" and "keepKeyMatches" skip item
						continue;
					}

					// Match exists
					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" we can skip the item as it has a match
						continue;
					} else if (mode === 'mergeByKey') {
						// Copy the entry as the data gets changed
						entry = deepCopy(entry);

						for (key of Object.keys(copyData[referenceValue as string].json)) {
							if (key === propertyName2) {
								continue;
							}

							// TODO: Currently only copies json data and no binary one
							const value = copyData[referenceValue as string].json[key];
							if (
								overwrite === 'always' ||
								(overwrite === 'undefined' && !entry.json.hasOwnProperty(key)) ||
								(overwrite === 'blank' && [null, undefined, ''].includes(entry.json[key] as string))
							) {
								entry.json[key] = value;
							}
						}
					} else {
						// For "keepKeyMatches" we add it as it is
						returnData.push(entry);
						continue;
					}
				} else {
					// No item for reference value got found
					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" we can add it if not match got found
						returnData.push(entry);
						continue;
					}
				}

				if (mode === 'mergeByKey') {
					// For "mergeByKey" we always add the entry anyway but then the unchanged one
					returnData.push(entry);
				}
			}

			return [returnData];
		} else if (mode === 'passThrough') {
			const output = this.getNodeParameter('output', 0) as string;

			if (output === 'input1') {
				returnData.push.apply(returnData, this.getInputData(0));
			} else {
				returnData.push.apply(returnData, this.getInputData(1));
			}
		} else if (mode === 'wait') {
			const pairedItem = generatePairedItemData(this.getInputData(0).length);
			returnData.push({ json: {}, pairedItem });
		}

		return [returnData];
	}
}
