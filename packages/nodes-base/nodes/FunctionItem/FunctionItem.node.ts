import type { NodeVMOptions } from '@n8n/vm2';
import { NodeVM } from '@n8n/vm2';
import type {
	IExecuteFunctions,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy, NodeOperationError } from 'n8n-workflow';

import { vmResolver } from '../Code/JavaScriptSandbox';

export class FunctionItem implements INodeType {
	description: INodeTypeDescription = {
		displayName: '函数项',
		name: 'functionItem',
		hidden: true,
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: '运行自定义函数代码，每个数据项执行一次',
		defaults: {
			name: '函数项',
			color: '#ddbb33',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '此节点类型有更新的版本，称为"代码"节点',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'JavaScript 代码',
				name: 'functionCode',
				typeOptions: {
					alwaysOpenEditWindow: true,
					codeAutocomplete: 'functionItem',
					editor: 'jsEditor',
					rows: 10,
				},
				type: 'string',
				default: `// 此处的代码将对每个输入数据项运行一次
// 更多信息和帮助：https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.functionitem/
// 提示：你可以使用 luxon 处理日期，使用 $jmespath 查询 JSON 结构

// 在数据项的 JSON 中添加一个名为 'myNewField' 的新字段
item.myNewField = 1;

// 你可以在浏览器控制台中写入日志
console.log('完成！');

return item;`,
				description: '要为每个数据项执行的 JavaScript 代码',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		const cleanupData = (inputData: IDataObject): IDataObject => {
			Object.keys(inputData).map((key) => {
				if (inputData[key] !== null && typeof inputData[key] === 'object') {
					if (inputData[key].constructor.name === 'Object') {
						// Is regular node.js object so check its data
						inputData[key] = cleanupData(inputData[key] as IDataObject);
					} else {
						// Is some special object like a Date so stringify
						inputData[key] = deepCopy(inputData[key]);
					}
				}
			});
			return inputData;
		};

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			const mode = this.getMode();

			try {
				item = items[itemIndex];
				item.index = itemIndex;

				// Copy the items as they may get changed in the functions
				item = deepCopy(item);

				// Define the global objects for the custom function
				const sandbox = {
					/** @deprecated for removal - replaced by getBinaryDataAsync() */
					getBinaryData: (): IBinaryKeyData | undefined => {
						if (mode === 'manual') {
							this.sendMessageToUI(
								'getBinaryData(...) is deprecated and will be removed in a future version. Please consider switching to getBinaryDataAsync(...) instead.',
							);
						}
						return item.binary;
					},
					/** @deprecated for removal - replaced by setBinaryDataAsync() */
					setBinaryData: async (data: IBinaryKeyData) => {
						if (mode === 'manual') {
							this.sendMessageToUI(
								'setBinaryData(...) is deprecated and will be removed in a future version. Please consider switching to setBinaryDataAsync(...) instead.',
							);
						}
						item.binary = data;
					},
					getNodeParameter: this.getNodeParameter.bind(this),
					getWorkflowStaticData: this.getWorkflowStaticData.bind(this),
					helpers: this.helpers,
					item: item.json,
					getBinaryDataAsync: async (): Promise<IBinaryKeyData | undefined> => {
						// Fetch Binary Data, if available. Cannot check item with `if (item?.index)`, as index may be 0.
						if (item?.binary && item?.index !== undefined && item?.index !== null) {
							for (const binaryPropertyName of Object.keys(item.binary)) {
								item.binary[binaryPropertyName].data = (
									await this.helpers.getBinaryDataBuffer(item.index, binaryPropertyName)
								)?.toString('base64');
							}
						}
						// Return Data
						return item.binary;
					},
					setBinaryDataAsync: async (data: IBinaryKeyData) => {
						// Ensure data is present
						if (!data) {
							throw new NodeOperationError(
								this.getNode(),
								'未向 setBinaryDataAsync 提供数据 (data: IBinaryKeyData)。',
							);
						}

						// Set Binary Data
						for (const binaryPropertyName of Object.keys(data)) {
							const binaryItem = data[binaryPropertyName];
							data[binaryPropertyName] = await this.helpers.setBinaryDataBuffer(
								binaryItem,
								Buffer.from(binaryItem.data, 'base64'),
							);
						}

						// Set Item Reference
						item.binary = data;
					},
				};

				// Make it possible to access data via $node, $parameter, ...
				const dataProxy = this.getWorkflowDataProxy(itemIndex);
				Object.assign(sandbox, dataProxy);

				const options: NodeVMOptions = {
					console: mode === 'manual' ? 'redirect' : 'inherit',
					sandbox,
					require: vmResolver,
				};

				const vm = new NodeVM(options as unknown as NodeVMOptions);

				if (mode === 'manual') {
					vm.on('console.log', this.sendMessageToUI.bind(this));
				}

				// Get the code to execute
				const functionCode = this.getNodeParameter('functionCode', itemIndex) as string;

				let jsonData: IDataObject;
				try {
					// Execute the function code
					jsonData = await vm.run(
						`module.exports = async function() {${functionCode}\n}()`,
						__dirname,
					);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					} else {
						// Try to find the line number which contains the error and attach to error message
						const stackLines = error.stack.split('\n');
						if (stackLines.length > 0) {
							stackLines.shift();
							const lineParts = stackLines
								.find((line: string) => line.includes('FunctionItem'))
								.split(':');
							if (lineParts.length > 2) {
								const lineNumber = lineParts.splice(-2, 1);
								if (!isNaN(lineNumber as number)) {
									error.message = `${error.message} [Line ${lineNumber} | Item Index: ${itemIndex}]`;
									throw error;
								}
							}
						}

						error.message = `${error.message} [Item Index: ${itemIndex}]`;

						throw error;
					}
				}

				// Do very basic validation of the data
				if (jsonData === undefined) {
					throw new NodeOperationError(this.getNode(), '未返回任何数据。始终要返回一个对象！');
				}

				const returnItem: INodeExecutionData = {
					json: cleanupData(jsonData),
					pairedItem: {
						item: itemIndex,
					},
				};

				if (item.binary) {
					returnItem.binary = item.binary;
				}

				returnData.push(returnItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
