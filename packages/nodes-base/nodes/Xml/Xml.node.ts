import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, deepCopy } from 'n8n-workflow';
import { Builder, Parser } from 'xml2js';

export class Xml implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'XML',
		name: 'xml',
		icon: 'fa:file-code',
		iconColor: 'purple',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"]==="jsonToxml" ? "JSON 转 XML" : "XML 转 JSON"}}',
		description: '在 XML 和 JSON 格式之间转换数据',
		defaults: {
			name: 'XML',
			color: '#333377',
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
						name: 'JSON 转 XML',
						value: 'jsonToxml',
						description: '将 JSON 数据转换为 XML 格式',
					},
					{
						name: 'XML 转 JSON',
						value: 'xmlToJson',
						description: '将 XML 数据转换为 JSON 格式',
					},
				],
				default: 'xmlToJson',
				description: '选择数据转换的方向和格式',
			},
			{
				displayName: '如果 XML 数据在二进制文件中，请先使用"从文件提取"节点将其转换为文本',
				name: 'xmlNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						mode: ['xmlToJson'],
					},
				},
			},

			// ----------------------------------
			//         option:jsonToxml
			// ----------------------------------
			{
				displayName: '属性名称',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['jsonToxml'],
					},
				},
				default: 'data',
				required: true,
				description: '用于存放转换后 XML 数据的属性名称',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				displayOptions: {
					show: {
						mode: ['jsonToxml'],
					},
				},
				default: {},
				options: [
					{
						displayName: '允许代理字符',
						name: 'allowSurrogateChars',
						type: 'boolean',
						default: false,
						description: '是否允许使用 Unicode 代理块中的字符',
					},
					{
						displayName: '属性键前缀',
						name: 'attrkey',
						type: 'string',
						default: '$',
						description: '用于访问 XML 属性的前缀字符',
					},
					{
						displayName: 'CDATA 包裹',
						name: 'cdata',
						type: 'boolean',
						default: false,
						description:
							'是否在必要时使用 &lt;![CDATA[ ... ]]&gt; 包裹文本节点，而不是转义。仅在需要时才添加 CDATA 标记。',
					},
					{
						displayName: '字符键前缀',
						name: 'charkey',
						type: 'string',
						default: '_',
						description: '用于访问字符内容的前缀字符',
					},
					{
						displayName: '省略 XML 头',
						name: 'headless',
						type: 'boolean',
						default: false,
						description: '是否省略 XML 声明头（&lt;?xml version="1.0"?&gt;）',
					},
					{
						displayName: '根元素名称',
						name: 'rootName',
						type: 'string',
						default: 'root',
						description: '要使用的 XML 根元素名称',
					},
				],
			},

			// ----------------------------------
			//         option:xmlToJson
			// ----------------------------------
			{
				displayName: '属性名称',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['xmlToJson'],
					},
				},
				default: 'data',
				required: true,
				description: '包含要转换的 XML 数据的属性名称',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				displayOptions: {
					show: {
						mode: ['xmlToJson'],
					},
				},
				default: {},
				options: [
					{
						displayName: '属性键前缀',
						name: 'attrkey',
						type: 'string',
						default: '$',
						description: '用于访问 XML 属性的前缀字符',
					},
					{
						displayName: '字符键前缀',
						name: 'charkey',
						type: 'string',
						default: '_',
						description: '用于访问字符内容的前缀字符',
					},
					{
						displayName: '显式数组',
						name: 'explicitArray',
						type: 'boolean',
						default: false,
						description:
							'是否始终将子节点放入数组中。如果为 false，仅在有多个相同名称的子节点时才创建数组。',
					},
					{
						displayName: '显式根节点',
						name: 'explicitRoot',
						type: 'boolean',
						default: true,
						description: '是否在结果对象中保留根节点。如果为 false，将直接返回根节点的内容。',
					},
					{
						displayName: '忽略属性',
						name: 'ignoreAttrs',
						type: 'boolean',
						default: false,
						description: '是否忽略所有 XML 属性，仅创建文本节点',
					},
					{
						displayName: '合并属性',
						name: 'mergeAttrs',
						type: 'boolean',
						default: true,
						description:
							'是否将属性和子元素合并为父对象的属性，而不是将属性放在单独的子对象中。如果"忽略属性"为 true，此选项将被忽略。',
					},
					{
						displayName: '标准化空白',
						name: 'normalize',
						type: 'boolean',
						default: false,
						description: '是否修剪文本节点内部的空白字符',
					},
					{
						displayName: '标准化标签',
						name: 'normalizeTags',
						type: 'boolean',
						default: false,
						description: '是否将所有标签名称转换为小写',
					},
					{
						displayName: '修剪空白',
						name: 'trim',
						type: 'boolean',
						default: false,
						description: '是否修剪文本节点开头和结尾的空白字符',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const mode = this.getNodeParameter('mode', 0) as string;
		const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);
		const options = this.getNodeParameter('options', 0, {});

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];

				if (mode === 'xmlToJson') {
					const parserOptions = Object.assign(
						{
							mergeAttrs: true,
							explicitArray: false,
						},
						options,
					);

					const parser = new Parser(parserOptions);

					if (item.json[dataPropertyName] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`数据项缺少名为 "${dataPropertyName}" 的 JSON 属性`,
							{ itemIndex },
						);
					}

					const json = await parser.parseStringPromise(item.json[dataPropertyName] as string);
					returnData.push({ json: deepCopy(json) });
				} else if (mode === 'jsonToxml') {
					const builder = new Builder(options);

					returnData.push({
						json: {
							[dataPropertyName]: builder.buildObject(items[itemIndex].json),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else {
					throw new NodeOperationError(this.getNode(), `未知的操作模式 "${mode}"`, {
						itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					items[itemIndex] = {
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					};
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
