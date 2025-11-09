import type { INodeProperties } from 'n8n-workflow';

export const operationProperty: INodeProperties = {
	displayName: '操作',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: '从文件读取',
			value: 'fromFile',
			description: '从电子表格文件读取数据',
			action: '从电子表格文件读取数据',
		},
		{
			name: '写入文件',
			value: 'toFile',
			description: '将工作流数据写入电子表格文件',
			action: '将数据写入电子表格文件',
		},
	],
	default: 'fromFile',
};

export const binaryProperty: INodeProperties = {
	displayName: '输入二进制字段',
	name: 'binaryPropertyName',
	type: 'string',
	default: 'data',
	required: true,
	placeholder: '',
	hint: '包含要处理的文件数据的输入字段名称',
	displayOptions: {
		show: {
			operation: ['fromFile'],
		},
	},
};

export const toFileProperties: INodeProperties[] = [
	{
		displayName: '文件格式',
		name: 'fileFormat',
		type: 'options',
		options: [
			{
				name: 'CSV',
				value: 'csv',
				description: '逗号分隔值',
			},
			{
				name: 'HTML',
				value: 'html',
				description: 'HTML 表格',
			},
			{
				name: 'ODS',
				value: 'ods',
				description: 'OpenDocument 电子表格',
			},
			{
				name: 'RTF',
				value: 'rtf',
				description: '富文本格式',
			},
			{
				name: 'XLS',
				value: 'xls',
				description: 'Excel',
			},
			{
				name: 'XLSX',
				value: 'xlsx',
				description: 'Excel',
			},
		],
		default: 'xls',
		displayOptions: {
			show: {
				operation: ['toFile'],
			},
		},
		description: '保存数据的文件格式',
	},
	{
		displayName: '输出文件放入字段',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: ['toFile'],
			},
		},
		placeholder: '',
		hint: '要将文件放入的输出二进制字段名称',
	},
];

export const toFileOptions: INodeProperties = {
	displayName: '选项',
	name: 'options',
	type: 'collection',
	placeholder: '添加选项',
	default: {},
	displayOptions: {
		show: {
			operation: ['toFile'],
		},
	},
	options: [
		{
			displayName: '压缩',
			name: 'compression',
			type: 'boolean',
			displayOptions: {
				show: {
					'/fileFormat': ['xlsx', 'ods'],
				},
			},
			default: false,
			description: '是否应用压缩',
		},
		{
			displayName: '文件名',
			name: 'fileName',
			type: 'string',
			default: '',
			description: '在二进制数据中设置的文件名。默认使用 "spreadsheet.&lt;fileFormat&gt;"',
		},
		{
			displayName: '标题行',
			name: 'headerRow',
			type: 'boolean',
			default: true,
			description: '文件的第一行是否包含标题名称',
		},
		{
			displayName: '工作表名称',
			name: 'sheetName',
			type: 'string',
			displayOptions: {
				show: {
					'/fileFormat': ['ods', 'xls', 'xlsx'],
				},
			},
			default: 'Sheet',
			description: '在电子表格中创建的工作表名称',
		},
	],
};

export const fromFileOptions: INodeProperties = {
	displayName: '选项',
	name: 'options',
	type: 'collection',
	placeholder: '添加选项',
	default: {},
	displayOptions: {
		show: {
			operation: ['fromFile'],
		},
	},
	options: [
		{
			displayName: '分隔符',
			name: 'delimiter',
			type: 'string',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: ',',
			placeholder: '例如：,',
			description: '设置字段分隔符，通常是逗号',
		},
		{
			displayName: '编码',
			name: 'encoding',
			type: 'options',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			options: [
				{ name: 'ASCII', value: 'ascii' },
				{ name: 'Latin1', value: 'latin1' },
				{ name: 'UCS-2', value: 'ucs-2' },
				{ name: 'UCS2', value: 'ucs2' },
				{ name: 'UTF-8', value: 'utf-8' },
				{ name: 'UTF16LE', value: 'utf16le' },
				{ name: 'UTF8', value: 'utf8' },
			],
			default: 'utf-8',
		},
		{
			displayName: '排除字节顺序标记 (BOM)',
			name: 'enableBOM',
			type: 'boolean',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: false,
			description: '是否检测并排除 CSV 输入中的字节顺序标记（如果存在）',
		},
		{
			displayName: '保留引号',
			name: 'relaxQuotes',
			type: 'boolean',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: false,
			description: '是否将 CSV 字段中未闭合的引号作为字段内容的一部分处理，而不是抛出解析错误',
		},
		{
			displayName: '标题行',
			name: 'headerRow',
			type: 'boolean',
			default: true,
			description: '文件的第一行是否包含标题名称',
		},
		{
			displayName: '包含空单元格',
			name: 'includeEmptyCells',
			type: 'boolean',
			default: false,
			description: '从文件读取时是否包含空单元格。空单元格将填充为空字符串',
		},
		{
			displayName: '最大加载行数',
			name: 'maxRowCount',
			type: 'number',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: -1,
			placeholder: '例如：10',
			description: '读取指定行数后停止处理记录。如果要加载所有行，请使用 -1',
		},
		{
			displayName: '范围',
			name: 'range',
			type: 'string',
			default: '',
			description:
				'从表中读取的范围。如果设置为数字，则为起始行。如果设置为字符串，则用作 A1 样式表示法范围',
		},
		{
			displayName: '原始数据',
			name: 'rawData',
			type: 'boolean',
			default: false,
			description: '是否返回原始数据，而不是解析后的数据',
		},
		{
			displayName: '作为字符串读取',
			name: 'readAsString',
			type: 'boolean',
			default: false,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description: '在某些情况和文件格式中，需要作为字符串读取以确保正确解释特殊字符',
		},
		{
			displayName: '工作表名称',
			name: 'sheetName',
			type: 'string',
			default: 'Sheet',
			placeholder: '例如：mySheet',
			description: '电子表格中要读取的工作表名称（如果支持）。如果未设置，将选择第一个',
		},
		{
			displayName: '起始行',
			name: 'fromLine',
			type: 'number',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: 0,
			placeholder: '例如：0',
			description: '从请求的行号开始处理记录。从 0 开始',
		},
		{
			displayName: '跳过有错误的记录',
			name: 'skipRecordsWithErrors',
			type: 'fixedCollection',
			default: { value: { enabled: true, maxSkippedRecords: -1 } },
			options: [
				{
					displayName: '值',
					name: 'value',
					values: [
						{
							displayName: '启用',
							name: 'enabled',
							type: 'boolean',
							default: false,
							description: '从文件读取时是否跳过有错误的记录',
						},
						{
							displayName: '最大跳过记录数',
							name: 'maxSkippedRecords',
							type: 'number',
							default: -1,
							description: '可以跳过的最大记录数，超过此数量将抛出错误。设置为 -1 以移除限制',
						},
					],
				},
			],
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
		},
	],
};
