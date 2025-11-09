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

export class Function implements INodeType {
	description: INodeTypeDescription = {
		displayName: '函数',
		name: 'function',
		hidden: true,
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: '运行自定义函数代码，只执行一次，允许你添加、删除、修改和替换数据项',
		defaults: {
			name: '函数',
			color: '#FF9922',
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
					codeAutocomplete: 'function',
					editor: 'jsEditor',
					rows: 10,
				},
				type: 'string',
				default: `// 此处的代码只会运行一次，无论有多少个输入数据项
// 更多信息和帮助：https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.function/
// 提示：你可以使用 luxon 处理日期，使用 $jmespath 查询 JSON 结构

// 循环遍历输入并在每个数据项的 JSON 中添加一个名为 'myNewField' 的新字段
for (item of items) {
  item.json.myNewField = 1;
}

// 你可以在浏览器控制台中写入日志
console.log('完成！');

return items;`,
				description: '要执行的 JavaScript 代码',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// const item = this.getInputData();
		let items = this.getInputData();

		// Copy the items as they may get changed in the functions
		items = deepCopy(items);

		// Assign item indexes
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			items[itemIndex].index = itemIndex;
		}

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

		// Define the global objects for the custom function
		const sandbox = {
			getNodeParameter: this.getNodeParameter.bind(this),
			getWorkflowStaticData: this.getWorkflowStaticData.bind(this),
			helpers: this.helpers,
			items,
			// To be able to access data of other items
			$item: (index: number) => this.getWorkflowDataProxy(index),
			getBinaryDataAsync: async (item: INodeExecutionData): Promise<IBinaryKeyData | undefined> => {
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
			setBinaryDataAsync: async (item: INodeExecutionData, data: IBinaryKeyData) => {
				// Ensure item is provided, else return a friendly error.
				if (!item) {
					throw new NodeOperationError(
						this.getNode(),
						'No item was provided to setBinaryDataAsync (item: INodeExecutionData, data: IBinaryKeyData).',
					);
				}

				// Ensure data is provided, else return a friendly error.
				if (!data) {
					throw new NodeOperationError(
						this.getNode(),
						'No data was provided to setBinaryDataAsync (item: INodeExecutionData, data: IBinaryKeyData).',
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
		// By default use data from first item
		Object.assign(sandbox, sandbox.$item(0));

		const mode = this.getMode();

		const options: NodeVMOptions = {
			console: mode === 'manual' ? 'redirect' : 'inherit',
			sandbox,
			require: vmResolver,
		};

		const vm = new NodeVM(options);

		if (mode === 'manual') {
			vm.on('console.log', this.sendMessageToUI.bind(this));
		}

		// Get the code to execute
		const functionCode = this.getNodeParameter('functionCode', 0) as string;

		try {
			// Execute the function code
			items = await vm.run(`module.exports = async function() {${functionCode}\n}()`, __dirname);
			items = this.helpers.normalizeItems(items);

			// Do very basic validation of the data
			if (items === undefined) {
				throw new NodeOperationError(this.getNode(), '未返回任何数据。始终要返回一个数据项数组！');
			}
			if (!Array.isArray(items)) {
				throw new NodeOperationError(this.getNode(), '始终要返回一个数据项数组！');
			}
			for (const item of items) {
				if (item.json === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						'所有返回的数据项都必须包含一个名为"json"的属性！',
					);
				}
				if (typeof item.json !== 'object') {
					throw new NodeOperationError(this.getNode(), 'json 属性必须是一个对象！');
				}

				item.json = cleanupData(item.json);

				if (item.binary !== undefined) {
					if (Array.isArray(item.binary) || typeof item.binary !== 'object') {
						throw new NodeOperationError(this.getNode(), 'binary 属性必须是一个对象！');
					}
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				items = [{ json: { error: error.message } }];
			} else {
				// Try to find the line number which contains the error and attach to error message
				const stackLines = error.stack.split('\n');
				if (stackLines.length > 0) {
					stackLines.shift();
					const lineParts = stackLines.find((line: string) => line.includes('Function')).split(':');
					if (lineParts.length > 2) {
						const lineNumber = lineParts.splice(-2, 1);
						if (!isNaN(lineNumber as number)) {
							error.message = `${error.message} [Line ${lineNumber}]`;
						}
					}
				}

				throw error;
			}
		}

		return [items];
	}
}
