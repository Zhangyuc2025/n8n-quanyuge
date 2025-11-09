import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import pick from 'lodash/pick';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { compareItems, flattenKeys } from '@utils/utilities';

import { prepareFieldsArray } from '../utils/utils';

export const validateInputData = (
	node: INode,
	items: INodeExecutionData[],
	keysToCompare: string[],
	disableDotNotation: boolean,
) => {
	for (const key of keysToCompare) {
		let type: any = undefined;
		for (const [i, item] of items.entries()) {
			if (key === '') {
				throw new NodeOperationError(node, '要比较的字段名称为空');
			}
			const value = !disableDotNotation ? get(item.json, key) : item.json[key];
			if (value === null && node.typeVersion > 1) continue;

			if (value === undefined && disableDotNotation && key.includes('.')) {
				throw new NodeOperationError(node, `某些输入项缺少 '${key}' 字段`, {
					description: '如果您尝试使用嵌套字段，请确保在节点选项中关闭"禁用点符号"',
				});
			} else if (value === undefined) {
				throw new NodeOperationError(node, `某些输入项缺少 '${key}' 字段`);
			}
			if (type !== undefined && value !== undefined && type !== typeof value) {
				const description =
					'此字段在项之间的类型不一致' +
					(node.typeVersion > 1
						? `，在项 [${i - 1}] 中是 ${type}，在项 [${i}] 中是 ${typeof value} `
						: '');
				throw new NodeOperationError(node, `'${key}' 并非始终是相同的类型`, {
					description,
				});
			} else {
				type = typeof value;
			}
		}
	}
};

export function removeDuplicateInputItems(context: IExecuteFunctions, items: INodeExecutionData[]) {
	const compare = context.getNodeParameter('compare', 0) as string;
	const disableDotNotation = context.getNodeParameter(
		'options.disableDotNotation',
		0,
		false,
	) as boolean;
	const removeOtherFields = context.getNodeParameter(
		'options.removeOtherFields',
		0,
		false,
	) as boolean;

	let keys = disableDotNotation
		? Object.keys(items[0].json)
		: Object.keys(flattenKeys(items[0].json));

	for (const item of items) {
		const itemKeys = disableDotNotation
			? Object.keys(item.json)
			: Object.keys(flattenKeys(item.json));
		for (const key of itemKeys) {
			if (!keys.includes(key)) {
				keys.push(key);
			}
		}
	}

	if (compare === 'allFieldsExcept') {
		const fieldsToExclude = prepareFieldsArray(
			context.getNodeParameter('fieldsToExclude', 0, '') as string,
			'要排除的字段',
		);

		if (!fieldsToExclude.length) {
			throw new NodeOperationError(context.getNode(), '未指定字段。请添加要从比较中排除的字段');
		}
		if (!disableDotNotation) {
			keys = Object.keys(flattenKeys(items[0].json));
		}
		keys = keys.filter((key) => !fieldsToExclude.includes(key));
	}
	if (compare === 'selectedFields') {
		const fieldsToCompare = prepareFieldsArray(
			context.getNodeParameter('fieldsToCompare', 0, '') as string,
			'要比较的字段',
		);
		if (!fieldsToCompare.length) {
			throw new NodeOperationError(context.getNode(), '未指定字段。请添加要比较的字段');
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

	validateInputData(context.getNode(), newItems, keys, disableDotNotation);

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
	let updatedItems: INodeExecutionData[] = items.filter(
		(_, index) => !removedIndexes.includes(index),
	);

	if (removeOtherFields) {
		updatedItems = updatedItems.map((item, index) => ({
			json: pick(item.json, ...keys),
			pairedItem: { item: index },
		}));
	}
	return [updatedItems];
}
