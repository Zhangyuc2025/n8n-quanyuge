import iconv from 'iconv-lite';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	deepCopy,
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

iconv.encodingExists('utf8');

// Create options for bomAware and encoding
const bomAware: string[] = [];
const encodeDecodeOptions: INodePropertyOptions[] = [];
const encodings = (iconv as any).encodings;
Object.keys(encodings as IDataObject).forEach((encoding) => {
	if (!(encoding.startsWith('_') || typeof encodings[encoding] === 'string')) {
		// only encodings without direct alias or internals
		if (encodings[encoding].bomAware) {
			bomAware.push(encoding);
		}
		encodeDecodeOptions.push({ name: encoding, value: encoding });
	}
});

encodeDecodeOptions.sort((a, b) => {
	if (a.name < b.name) {
		return -1;
	}
	if (a.name > b.name) {
		return 1;
	}
	return 0;
});

export class MoveBinaryData implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: '二进制数据转换',
		name: 'moveBinaryData',
		icon: 'fa:exchange-alt',
		group: ['transform'],
		version: [1, 1.1],
		subtitle: '={{$parameter["mode"]==="binaryToJson" ? "二进制转 JSON" : "JSON 转二进制"}}',
		description: '在二进制和 JSON 属性之间移动数据',
		defaults: {
			name: '二进制数据转换',
			color: '#7722CC',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '模式',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: '二进制转 JSON',
						value: 'binaryToJson',
						description: '将数据从二进制移动到 JSON',
					},
					{
						name: 'JSON 转二进制',
						value: 'jsonToBinary',
						description: '将数据从 JSON 移动到二进制',
					},
				],
				default: 'binaryToJson',
				description: '数据应该从哪里移动到哪里',
			},

			// ----------------------------------
			//         binaryToJson
			// ----------------------------------
			{
				displayName: '设置所有数据',
				name: 'setAllData',
				type: 'boolean',
				displayOptions: {
					show: {
						mode: ['binaryToJson'],
					},
				},
				default: true,
				description: '是否用从二进制键检索的数据替换所有 JSON 数据。否则数据将写入单个键。',
			},
			{
				displayName: '源键',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['binaryToJson'],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description:
					'要从中获取数据的二进制键名称。也可以使用点表示法定义深层键，例如："level1.level2.currentKey"。',
			},
			{
				displayName: '目标键',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['binaryToJson'],
						setAllData: [false],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description:
					'要复制数据到的 JSON 键名称。也可以使用点表示法定义深层键，例如："level1.level2.newKey"。',
			},

			// ----------------------------------
			//         jsonToBinary
			// ----------------------------------
			{
				displayName: '转换所有数据',
				name: 'convertAllData',
				type: 'boolean',
				displayOptions: {
					show: {
						mode: ['jsonToBinary'],
					},
				},
				default: true,
				description: '是否将所有 JSON 数据转换为二进制。否则仅转换一个键的数据。',
			},
			{
				displayName: '源键',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						convertAllData: [false],
						mode: ['jsonToBinary'],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description:
					'要从中获取数据的 JSON 键名称。也可以使用点表示法定义深层键，例如："level1.level2.currentKey"。',
			},
			{
				displayName: '目标键',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['jsonToBinary'],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description:
					'要复制数据到的二进制键名称。也可以使用点表示法定义深层键，例如："level1.level2.newKey"。',
			},

			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '添加字节顺序标记（BOM）',
						name: 'addBOM',
						description: '是否在文本文件开头添加特殊标记。此标记帮助某些程序正确理解如何读取文件。',
						displayOptions: {
							show: {
								'/mode': ['jsonToBinary'],
								encoding: bomAware,
							},
						},
						type: 'boolean',
						default: false,
					},
					{
						displayName: '数据为 Base64',
						name: 'dataIsBase64',
						type: 'boolean',
						displayOptions: {
							hide: {
								useRawData: [true],
							},
							show: {
								'/mode': ['jsonToBinary'],
								'/convertAllData': [false],
							},
						},
						default: false,
						description: '是否将二进制数据保持为 base64 字符串',
					},
					{
						displayName: '编码',
						name: 'encoding',
						type: 'options',
						options: encodeDecodeOptions,
						displayOptions: {
							show: {
								'/mode': ['binaryToJson', 'jsonToBinary'],
							},
						},
						default: 'utf8',
						description: '选择用于编码数据的字符集',
					},
					{
						displayName: '移除 BOM',
						name: 'stripBOM',
						displayOptions: {
							show: {
								'/mode': ['binaryToJson'],
								encoding: bomAware,
							},
						},
						type: 'boolean',
						default: true,
					},
					{
						displayName: '文件名',
						name: 'fileName',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['jsonToBinary'],
							},
						},
						default: '',
						placeholder: 'example.json',
						description: '要设置的文件名',
					},
					{
						displayName: 'JSON 解析',
						name: 'jsonParse',
						type: 'boolean',
						displayOptions: {
							hide: {
								keepAsBase64: [true],
							},
							show: {
								'/mode': ['binaryToJson'],
								'/setAllData': [false],
							},
						},
						default: false,
						description: '是否对数据运行 JSON 解析以获取正确的对象数据',
					},
					{
						displayName: '保留源',
						name: 'keepSource',
						type: 'boolean',
						default: false,
						description: '是否保留源键。默认情况下将被删除。',
					},
					{
						displayName: '保持为 Base64',
						name: 'keepAsBase64',
						type: 'boolean',
						displayOptions: {
							hide: {
								jsonParse: [true],
							},
							show: {
								'/mode': ['binaryToJson'],
								'/setAllData': [false],
							},
						},
						default: false,
						description: '是否将二进制数据保持为 base64 字符串',
					},
					{
						displayName: 'MIME 类型',
						name: 'mimeType',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['jsonToBinary'],
							},
						},
						default: 'application/json',
						placeholder: 'application/json',
						description: '要设置的 MIME 类型。默认情况下将设置 JSON 的 MIME 类型。',
					},
					{
						displayName: '使用原始数据',
						name: 'useRawData',
						type: 'boolean',
						displayOptions: {
							hide: {
								dataIsBase64: [true],
							},
							show: {
								'/mode': ['jsonToBinary'],
							},
						},
						default: false,
						description: '是否按原样使用数据而不进行 JSON.stringify',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as string;
		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let newItem: INodeExecutionData;
		let options: IDataObject;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];
			options = this.getNodeParameter('options', itemIndex, {});

			// Copy the whole JSON data as data on any level can be renamed
			newItem = {
				json: {},
				pairedItem: {
					item: itemIndex,
				},
			};

			if (mode === 'binaryToJson') {
				const setAllData = this.getNodeParameter('setAllData', itemIndex) as boolean;
				const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;

				const value = get(item.binary, sourceKey);

				if (value === undefined) {
					// No data found so skip
					continue;
				}

				const encoding = (options.encoding as string) || 'utf8';

				const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, sourceKey);

				let convertedValue: string;

				if (setAllData) {
					// Set the full data
					convertedValue = iconv.decode(buffer, encoding, {
						stripBOM: options.stripBOM as boolean,
					});
					newItem.json = jsonParse(convertedValue);
				} else {
					// Does get added to existing data so copy it first
					newItem.json = deepCopy(item.json);

					if (options.keepAsBase64 !== true) {
						convertedValue = iconv.decode(buffer, encoding, {
							stripBOM: options.stripBOM as boolean,
						});
					} else {
						convertedValue = Buffer.from(buffer).toString(BINARY_ENCODING);
					}

					if (options.jsonParse) {
						convertedValue = jsonParse(convertedValue);
					}

					const destinationKey = this.getNodeParameter('destinationKey', itemIndex, '') as string;
					set(newItem.json, destinationKey, convertedValue);
				}

				if (options.keepSource === true) {
					// Binary data does not get touched so simply reference it
					newItem.binary = item.binary;
				} else {
					// Binary data will change so copy it
					newItem.binary = deepCopy(item.binary);
					unset(newItem.binary, sourceKey);
				}
			} else if (mode === 'jsonToBinary') {
				const convertAllData = this.getNodeParameter('convertAllData', itemIndex) as boolean;
				const destinationKey = this.getNodeParameter('destinationKey', itemIndex) as string;

				const encoding = (options.encoding as string) || 'utf8';
				let value: IDataObject | string = item.json;
				if (!convertAllData) {
					const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;
					value = get(item.json, sourceKey) as IDataObject;
				}

				if (value === undefined) {
					// No data found so skip
					continue;
				}

				if (item.binary !== undefined) {
					// Item already has binary data so copy it
					newItem.binary = deepCopy(item.binary);
				} else {
					// Item does not have binary data yet so initialize empty
					newItem.binary = {};
				}

				const nodeVersion = this.getNode().typeVersion;
				let mimeType = options.mimeType as string;

				let data: Buffer;
				if (options.dataIsBase64 !== true) {
					if (options.useRawData !== true || typeof value === 'object') {
						value = JSON.stringify(value);

						if (!mimeType) {
							mimeType = 'application/json';
						}
					}

					data = iconv.encode(value, encoding, { addBOM: options.addBOM as boolean });
				} else {
					data = Buffer.from(value as unknown as string, BINARY_ENCODING);
				}

				if (!mimeType && nodeVersion === 1) {
					mimeType = 'application/json';
				}

				const convertedValue = await this.helpers.prepareBinaryData(
					data,
					options.fileName as string,
					mimeType,
				);

				if (!convertedValue.fileName && nodeVersion > 1) {
					const fileExtension = convertedValue.fileExtension
						? `.${convertedValue.fileExtension}`
						: '';
					convertedValue.fileName = `file${fileExtension}`;
				}

				set(newItem.binary, destinationKey, convertedValue);

				if (options.keepSource === true) {
					// JSON data does not get touched so simply reference it
					newItem.json = item.json;
				} else {
					// JSON data will change so copy it

					if (convertAllData) {
						// Data should not be kept and all data got converted. So simply set new as empty
						newItem.json = {};
					} else {
						// Data should not be kept and only one key has to get removed. So copy all
						// data and then remove the not needed one
						newItem.json = deepCopy(item.json);
						const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;

						unset(newItem.json, sourceKey);
					}
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`, {
					itemIndex,
				});
			}

			returnData.push(newItem);
		}

		return [returnData];
	}
}
