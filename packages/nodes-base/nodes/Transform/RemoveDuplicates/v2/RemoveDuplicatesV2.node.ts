import { NodeConnectionTypes, NodeOperationError, tryToParseDateTime } from 'n8n-workflow';
import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	DeduplicationScope,
} from 'n8n-workflow';

import { removeDuplicatesNodeFields } from './RemoveDuplicatesV2.description';
import { removeDuplicateInputItems } from '../utils';

const versionDescription: INodeTypeDescription = {
	displayName: '去除重复项',
	name: 'removeDuplicates',
	icon: 'file:removeDuplicates.svg',
	group: ['transform'],
	subtitle: '',
	version: [2],
	description: '删除具有相同字段值的项',
	defaults: {
		name: '去除重复项',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	outputNames: ['保留', '丢弃'],
	hints: [
		{
			message: '在"去重值"中设置的去重键没有值',
			displayCondition:
				'={{ $parameter["operation"] === "removeItemsSeenInPreviousExecutions" && ($parameter["logic"] === "removeItemsWithAlreadySeenKeyValues" && $parameter["dedupeValue"] === undefined) || ($parameter["logic"] === "removeItemsUpToStoredIncrementalKey" && $parameter["incrementalDedupeValue"] === undefined) || ($parameter["logic"] === "removeItemsUpToStoredDate" && $parameter["dateDedupeValue"] === undefined) }}',
			whenToDisplay: 'beforeExecution',
			location: 'outputPane',
		},
	],
	properties: [...removeDuplicatesNodeFields],
};
export class RemoveDuplicatesV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const returnData: INodeExecutionData[][] = [];
		const DEFAULT_MAX_ENTRIES = 10000;
		try {
			switch (operation) {
				case 'removeDuplicateInputItems': {
					return removeDuplicateInputItems(this, items);
				}
				case 'removeItemsSeenInPreviousExecutions': {
					const logic = this.getNodeParameter('logic', 0);
					const scope = this.getNodeParameter('options.scope', 0, 'node') as DeduplicationScope;

					if (logic === 'removeItemsWithAlreadySeenKeyValues') {
						if (!['node', 'workflow'].includes(scope)) {
							throw new NodeOperationError(
								this.getNode(),
								`不支持作用域 '${scope}'。请选择 "node" 或 "workflow"`,
							);
						}

						let checkValue: string;
						const itemMapping: {
							[key: string]: INodeExecutionData[];
						} = {};
						for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
							checkValue = this.getNodeParameter('dedupeValue', itemIndex, '')?.toString() ?? '';
							if (itemMapping[checkValue]) {
								itemMapping[checkValue].push(items[itemIndex]);
							} else {
								itemMapping[checkValue] = [items[itemIndex]];
							}
						}

						const maxEntries = this.getNodeParameter(
							'options.historySize',
							0,
							DEFAULT_MAX_ENTRIES,
						) as number;
						const maxEntriesNum = Number(maxEntries);

						const currentProcessedDataCount = await this.helpers.getProcessedDataCount(scope, {
							mode: 'entries',
							maxEntries,
						});
						if (currentProcessedDataCount + items.length > maxEntriesNum) {
							throw new NodeOperationError(
								this.getNode(),
								'要处理的项数超过了最大历史大小。请增加历史大小或减少要处理的项数',
							);
						}
						const itemsProcessed = await this.helpers.checkProcessedAndRecord(
							Object.keys(itemMapping),
							scope,
							{ mode: 'entries', maxEntries },
						);
						const processedDataCount = await this.helpers.getProcessedDataCount(scope, {
							mode: 'entries',
							maxEntries,
						});
						returnData.push(
							itemsProcessed.new
								.map((key) => {
									return itemMapping[key];
								})
								.flat(),
							itemsProcessed.processed
								.map((key) => {
									return itemMapping[key];
								})
								.flat(),
						);

						if (maxEntriesNum > 0 && processedDataCount / maxEntriesNum > 0.5) {
							this.addExecutionHints({
								message: `由于您正在接近最大历史大小（${maxEntriesNum} 项），可能无法删除某些重复项。您可以使用"历史大小"选项提高此限制`,
								location: 'outputPane',
							});
						}
						return returnData;
					} else if (logic === 'removeItemsUpToStoredIncrementalKey') {
						if (!['node', 'workflow'].includes(scope)) {
							throw new NodeOperationError(
								this.getNode(),
								`不支持作用域 '${scope}'。请选择 "node" 或 "workflow"`,
							);
						}

						let parsedIncrementalKey: number;
						const itemMapping: {
							[key: string]: INodeExecutionData[];
						} = {};

						for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
							const incrementalKey = this.getNodeParameter('incrementalDedupeValue', itemIndex, '');
							if (!incrementalKey?.toString()) {
								throw new NodeOperationError(this.getNode(), '去重值为空。请提供一个值');
							}
							parsedIncrementalKey = Number(incrementalKey);
							if (isNaN(parsedIncrementalKey)) {
								throw new NodeOperationError(
									this.getNode(),
									`值 '${incrementalKey}' 不是数字。请提供一个数字`,
								);
							}
							if (itemMapping[parsedIncrementalKey]) {
								itemMapping[parsedIncrementalKey].push(items[itemIndex]);
							} else {
								itemMapping[parsedIncrementalKey] = [items[itemIndex]];
							}
						}

						const itemsProcessed = await this.helpers.checkProcessedAndRecord(
							Object.keys(itemMapping),
							scope,
							{ mode: 'latestIncrementalKey' },
						);

						returnData.push(
							itemsProcessed.new
								.map((key) => {
									return itemMapping[key];
								})
								.flat(),
							itemsProcessed.processed
								.map((key) => {
									return itemMapping[key];
								})
								.flat(),
						);

						return returnData;
					} else if (logic === 'removeItemsUpToStoredDate') {
						if (!['node', 'workflow'].includes(scope)) {
							throw new NodeOperationError(
								this.getNode(),
								`不支持作用域 '${scope}'。请选择 "node" 或 "workflow"`,
							);
						}

						let checkValue: string;
						const itemMapping: {
							[key: string]: INodeExecutionData[];
						} = {};

						for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
							checkValue =
								this.getNodeParameter('dateDedupeValue', itemIndex, '')?.toString() ?? '';
							if (!checkValue) {
								throw new NodeOperationError(this.getNode(), '去重值为空。请提供一个值');
							}
							try {
								tryToParseDateTime(checkValue);
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									`值 '${checkValue}' 不是有效的日期。请提供一个有效的日期`,
								);
							}
							if (itemMapping[checkValue]) {
								itemMapping[checkValue].push(items[itemIndex]);
							} else {
								itemMapping[checkValue] = [items[itemIndex]];
							}
						}
						const itemsProcessed = await this.helpers.checkProcessedAndRecord(
							Object.keys(itemMapping),
							scope,
							{ mode: 'latestDate' },
						);

						returnData.push(
							itemsProcessed.new
								.map((key) => {
									return itemMapping[key];
								})
								.flat(),
							itemsProcessed.processed
								.map((key) => {
									return itemMapping[key];
								})
								.flat(),
						);

						return returnData;
					} else {
						return [items];
					}
				}
				case 'clearDeduplicationHistory': {
					const mode = this.getNodeParameter('mode', 0) as string;
					if (mode === 'updateKeyValuesInDatabase') {
					} else if (mode === 'deleteKeyValuesFromDatabase') {
					} else if (mode === 'cleanDatabase') {
						const scope = this.getNodeParameter('options.scope', 0, 'node') as DeduplicationScope;
						await this.helpers.clearAllProcessedItems(scope, {
							mode: 'entries',
						});
					}

					return [items];
				}
				default: {
					return [items];
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push([{ json: this.getInputData(0)[0].json, error }]);
			} else {
				throw error;
			}
		}
		return returnData;
	}
}
