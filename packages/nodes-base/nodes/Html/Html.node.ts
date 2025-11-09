import cheerio from 'cheerio';
import get from 'lodash/get';
import type {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeProperties,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getResolvables, sanitizeDataPathKey } from '@utils/utilities';

import { placeholder } from './placeholder';
import type { IValueData } from './types';
import { getValue } from './utils';

export const capitalizeHeader = (header: string, capitalize?: boolean) => {
	if (!capitalize) return header;
	return header
		.split('_')
		.filter((word) => word)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
};

const extractionValuesCollection: INodeProperties = {
	displayName: '提取值',
	name: 'extractionValues',
	placeholder: '添加值',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'values',
			displayName: '值',
			values: [
				{
					displayName: '键',
					name: 'key',
					type: 'string',
					default: '',
					description: '保存提取值的键名',
				},
				{
					displayName: 'CSS 选择器',
					name: 'cssSelector',
					type: 'string',
					default: '',
					placeholder: '.price',
					description: '要使用的 CSS 选择器',
				},
				{
					displayName: '返回值类型',
					name: 'returnValue',
					type: 'options',
					options: [
						{
							name: '属性',
							value: 'attribute',
							description: '获取元素的属性值，如 "class"',
						},
						{
							name: 'HTML',
							value: 'html',
							description: '获取元素包含的 HTML',
						},
						{
							name: '文本',
							value: 'text',
							description: '仅获取元素的文本内容',
						},
						{
							name: '值',
							value: 'value',
							description: '获取 input、select 或 textarea 的值',
						},
					],
					default: 'text',
					description: '应该返回什么类型的数据',
				},
				{
					displayName: '属性名',
					name: 'attribute',
					type: 'string',
					displayOptions: {
						show: {
							returnValue: ['attribute'],
						},
					},
					default: '',
					placeholder: 'class',
					description: '要返回值的属性名称',
				},
				{
					displayName: '跳过的选择器',
					name: 'skipSelectors',
					type: 'string',
					displayOptions: {
						show: {
							returnValue: ['text'],
							'@version': [{ _cnd: { gt: 1.1 } }],
						},
					},
					default: '',
					placeholder: '例如：img, .className, #ItemId',
					description: '在文本提取中要跳过的选择器列表，以逗号分隔',
				},
				{
					displayName: '返回数组',
					name: 'returnArray',
					type: 'boolean',
					default: false,
					description:
						'是否将值作为数组返回，以便找到的多个值也可以单独返回。如果未设置，所有值将作为单个字符串返回',
				},
			],
		},
	],
};

export class Html implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTML',
		name: 'html',
		icon: { light: 'file:html.svg', dark: 'file:html.dark.svg' },
		group: ['transform'],
		version: [1, 1.1, 1.2],
		subtitle: '={{ $parameter["operation"] }}',
		description: '处理 HTML',
		defaults: {
			name: 'HTML',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '生成 HTML 模板',
						value: 'generateHtmlTemplate',
						action: '生成 HTML 模板',
					},
					{
						name: '提取 HTML 内容',
						value: 'extractHtmlContent',
						action: '提取 HTML 内容',
					},
					{
						name: '转换为 HTML 表格',
						value: 'convertToHtmlTable',
						action: '转换为 HTML 表格',
					},
				],
				default: 'generateHtmlTemplate',
			},
			{
				displayName: 'HTML 模板',
				name: 'html',
				typeOptions: {
					editor: 'htmlEditor',
				},
				type: 'string',
				default: placeholder,
				noDataExpression: true,
				description: '要渲染的 HTML 模板',
				displayOptions: {
					show: {
						operation: ['generateHtmlTemplate'],
					},
				},
			},
			{
				displayName:
					'<b>提示</b>：按 Ctrl+空格键可获得自动完成。使用 <code>{{ }}</code> 编写表达式，使用 <code>&lt;style&gt;</code> 标签添加 CSS。<code>&lt;script&gt;</code> 标签中的 JS 会被包含但不会在 n8n 中执行',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['generateHtmlTemplate'],
					},
				},
			},
			{
				displayName: '源数据',
				name: 'sourceData',
				type: 'options',
				options: [
					{
						name: '二进制',
						value: 'binary',
					},
					{
						name: 'JSON',
						value: 'json',
					},
				],
				default: 'json',
				description: 'HTML 应该从二进制数据还是 JSON 数据中读取',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
					},
				},
			},
			{
				displayName: '输入二进制字段',
				name: 'dataPropertyName',
				type: 'string',
				requiresDataPath: 'single',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						sourceData: ['binary'],
					},
				},
				default: 'data',
				required: true,
				hint: '包含要提取文件的输入二进制字段名称',
			},
			{
				displayName: 'JSON 属性',
				name: 'dataPropertyName',
				type: 'string',
				requiresDataPath: 'single',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						sourceData: ['json'],
					},
				},
				default: 'data',
				required: true,
				description: '包含要提取数据的 HTML 的 JSON 属性名称。该属性可以包含字符串或字符串数组',
			},
			{
				...extractionValuesCollection,
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						'@version': [1],
					},
				},
			},
			{
				...extractionValuesCollection,
				default: {
					values: [
						{
							key: '',
							cssSelector: '',
							returnValue: 'text',
							returnArray: false,
						},
					],
				},
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						'@version': [{ _cnd: { gt: 1 } }],
					},
				},
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
					},
				},
				options: [
					{
						displayName: '修剪值',
						name: 'trimValues',
						type: 'boolean',
						default: true,
						description: '是否自动删除值开头和结尾的所有空格和换行符',
					},
					{
						displayName: '清理文本',
						name: 'cleanUpText',
						type: 'boolean',
						default: true,
						description: '是否删除前导和尾随空格、换行符，并将多个连续空格压缩为单个空格',
					},
				],
			},
			// ----------------------------------
			//       convertToHtmlTable
			// ----------------------------------
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						operation: ['convertToHtmlTable'],
					},
				},
				options: [
					{
						displayName: '首字母大写标题',
						name: 'capitalize',
						type: 'boolean',
						default: false,
						description: '是否将标题首字母大写',
					},
					{
						displayName: '自定义样式',
						name: 'customStyling',
						type: 'boolean',
						default: false,
						description: '是否使用自定义样式',
					},
					{
						displayName: '标题',
						name: 'caption',
						type: 'string',
						default: '',
						description: '要添加到表格的标题',
					},
					{
						displayName: '表格属性',
						name: 'tableAttributes',
						type: 'string',
						default: '',
						description: '要附加到表格的属性',
						placeholder: '例如：style="padding:10px"',
					},
					{
						displayName: '表头属性',
						name: 'headerAttributes',
						type: 'string',
						default: '',
						description: '要附加到表头的属性',
						placeholder: '例如：style="padding:10px"',
					},
					{
						displayName: '行属性',
						name: 'rowAttributes',
						type: 'string',
						default: '',
						description: '要附加到表格行的属性',
						placeholder: '例如：style="padding:10px"',
					},
					{
						displayName: '单元格属性',
						name: 'cellAttributes',
						type: 'string',
						default: '',
						description: '要附加到表格单元格的属性',
						placeholder: '例如：style="padding:10px"',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;

		if (operation === 'convertToHtmlTable' && items.length) {
			let table = '';

			const options = this.getNodeParameter('options', 0);

			let tableStyle = '';
			let headerStyle = '';
			let cellStyle = '';

			if (!options.customStyling) {
				tableStyle = "style='border-spacing:0; font-family:helvetica,arial,sans-serif'";
				headerStyle =
					"style='margin:0; padding:7px 20px 7px 0px; border-bottom:1px solid #eee; text-align:left; color:#888; font-weight:normal'";
				cellStyle = "style='margin:0; padding:7px 20px 7px 0px; border-bottom:1px solid #eee'";
			}

			const tableAttributes = (options.tableAttributes as string) || '';
			const headerAttributes = (options.headerAttributes as string) || '';

			const itemsData: IDataObject[] = [];
			const itemsKeys = new Set<string>();

			for (const entry of items) {
				itemsData.push(entry.json);

				for (const key of Object.keys(entry.json)) {
					itemsKeys.add(key);
				}
			}

			const headers = Array.from(itemsKeys);

			table += `<table ${tableStyle} ${tableAttributes}>`;

			if (options.caption) {
				table += `<caption>${options.caption}</caption>`;
			}

			table += `<thead ${headerStyle} ${headerAttributes}>`;
			table += '<tr>';
			table += headers
				.map((header) => '<th>' + capitalizeHeader(header, options.capitalize as boolean) + '</th>')
				.join('');
			table += '</tr>';
			table += '</thead>';

			table += '<tbody>';
			itemsData.forEach((entry, entryIndex) => {
				const rowsAttributes = this.getNodeParameter(
					'options.rowAttributes',
					entryIndex,
					'',
				) as string;

				table += `<tr  ${rowsAttributes}>`;

				const cellsAttributes = this.getNodeParameter(
					'options.cellAttributes',
					entryIndex,
					'',
				) as string;

				table += headers
					.map((header) => {
						let td = `<td ${cellStyle} ${cellsAttributes}>`;

						if (typeof entry[header] === 'boolean') {
							const isChecked = entry[header] ? 'checked="checked"' : '';
							td += `<input type="checkbox" ${isChecked}/>`;
						} else {
							td += entry[header];
						}
						td += '</td>';
						return td;
					})
					.join('');
				table += '</tr>';
			});

			table += '</tbody>';
			table += '</table>';

			return [
				[
					{
						json: { table },
						pairedItem: items.map((_item, index) => ({
							item: index,
						})),
					},
				],
			];
		}

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				if (operation === 'generateHtmlTemplate') {
					// ----------------------------------
					//       generateHtmlTemplate
					// ----------------------------------

					let html = this.getNodeParameter('html', itemIndex) as string;

					for (const resolvable of getResolvables(html)) {
						html = html.replace(
							resolvable,
							this.evaluateExpression(resolvable, itemIndex) as string,
						);
					}

					const result = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ html }),
						{
							itemData: { item: itemIndex },
						},
					);

					returnData.push(...result);
				} else if (operation === 'extractHtmlContent') {
					// ----------------------------------
					//         extractHtmlContent
					// ----------------------------------

					const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);
					const extractionValues = this.getNodeParameter(
						'extractionValues',
						itemIndex,
					) as IDataObject;
					const options = this.getNodeParameter('options', itemIndex, {});
					const sourceData = this.getNodeParameter('sourceData', itemIndex) as string;

					item = items[itemIndex];

					let htmlArray: string[] | string = [];
					if (sourceData === 'json') {
						if (nodeVersion === 1) {
							const key = sanitizeDataPathKey(item.json, dataPropertyName);
							if (item.json[key] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No property named "${dataPropertyName}" exists!`,
									{ itemIndex },
								);
							}
							htmlArray = item.json[key] as string;
						} else {
							const value = get(item.json, dataPropertyName);
							if (value === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No property named "${dataPropertyName}" exists!`,
									{ itemIndex },
								);
							}
							htmlArray = value as string;
						}
					} else {
						this.helpers.assertBinaryData(itemIndex, dataPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
							itemIndex,
							dataPropertyName,
						);
						htmlArray = binaryDataBuffer.toString('utf-8');
					}

					// Convert it always to array that it works with a string or an array of strings
					if (!Array.isArray(htmlArray)) {
						htmlArray = [htmlArray];
					}

					for (const html of htmlArray) {
						const $ = cheerio.load(html);

						const newItem: INodeExecutionData = {
							json: {},
							pairedItem: {
								item: itemIndex,
							},
						};

						// Iterate over all the defined values which should be extracted
						let htmlElement;
						for (const valueData of extractionValues.values as IValueData[]) {
							htmlElement = $(valueData.cssSelector);

							if (valueData.returnArray) {
								// An array should be returned so iterate over one
								// value at a time
								newItem.json[valueData.key] = [];
								htmlElement.each((_, el) => {
									(newItem.json[valueData.key] as Array<string | undefined>).push(
										getValue($(el), valueData, options, nodeVersion),
									);
								});
							} else {
								// One single value should be returned
								newItem.json[valueData.key] = getValue(
									htmlElement,
									valueData,
									options,
									nodeVersion,
								);
							}
						}
						returnData.push(newItem);
					}
				}
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
