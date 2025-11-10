/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '../../../../utils/descriptions';
import { getConnectionHintNoticeField } from '../../../../utils/sharedFields';

export const versionDescription: INodeTypeDescription = {
	displayName: '调用 n8n 工作流工具',
	name: 'toolWorkflow',
	group: ['transform'],
	version: [1, 1.1, 1.2, 1.3],
	description: '使用另一个 n8n 工作流作为工具。允许将任何 n8n 节点打包为工具。',
	defaults: {
		name: '调用 n8n 工作流工具',
	},
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools'],
			Tools: ['Recommended Tools'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/',
				},
			],
		},
	},

	inputs: [],

	outputs: [NodeConnectionTypes.AiTool],
	outputNames: ['工具'],
	properties: [
		getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
		{
			displayName:
				'在<a href="/templates/1953" target="_blank">这里</a>查看使用 AI 建议会议时间段的工作流示例。',
			name: 'noticeTemplateExample',
			type: 'notice',
			default: '',
		},
		{
			displayName: '名称',
			name: 'name',
			type: 'string',
			default: '',
			placeholder: 'My_Color_Tool',
			displayOptions: {
				show: {
					'@version': [1],
				},
			},
		},
		{
			displayName: '名称',
			name: 'name',
			type: 'string',
			default: '',
			placeholder: '例如：My_Color_Tool',
			validateType: 'string-alphanumeric',
			description: '要调用的函数名称,只能包含字母、数字和下划线',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { gte: 1.1 } }],
				},
			},
		},
		{
			displayName: '描述',
			name: 'description',
			type: 'string',
			default: '',
			placeholder: '调用此工具获取随机颜色。输入应该是一个字符串,包含要排除的颜色名称,用逗号分隔。',
			typeOptions: {
				rows: 3,
			},
		},

		{
			displayName:
				'此工具将调用您在下面定义的工作流,并在最后一个节点中查找响应。工作流需要以执行工作流触发器开始',
			name: 'executeNotice',
			type: 'notice',
			default: '',
		},

		{
			displayName: '来源',
			name: 'source',
			type: 'options',
			options: [
				{
					name: '数据库',
					value: 'database',
					description: '通过 ID 从数据库加载工作流',
				},
				{
					name: '在下面定义',
					value: 'parameter',
					description: '传递工作流的 JSON 代码',
				},
			],
			default: 'database',
			description: '从哪里获取要执行的工作流',
		},

		// ----------------------------------
		//         source:database
		// ----------------------------------
		{
			displayName: '工作流 ID',
			name: 'workflowId',
			type: 'string',
			displayOptions: {
				show: {
					source: ['database'],
					'@version': [{ _cnd: { lte: 1.1 } }],
				},
			},
			default: '',
			required: true,
			description: '要执行的工作流',
			hint: '可以在工作流的 URL 中找到',
		},

		{
			displayName: '工作流',
			name: 'workflowId',
			type: 'workflowSelector',
			displayOptions: {
				show: {
					source: ['database'],
					'@version': [{ _cnd: { gte: 1.2 } }],
				},
			},
			default: '',
			required: true,
		},

		// ----------------------------------
		//         source:parameter
		// ----------------------------------
		{
			displayName: '工作流 JSON',
			name: 'workflowJson',
			type: 'json',
			typeOptions: {
				rows: 10,
			},
			displayOptions: {
				show: {
					source: ['parameter'],
				},
			},
			default: '\n\n\n\n\n\n\n\n\n',
			required: true,
			description: '要执行的工作流 JSON 代码',
		},
		// ----------------------------------
		//         For all
		// ----------------------------------
		{
			displayName: '要返回的字段',
			name: 'responsePropertyName',
			type: 'string',
			default: 'response',
			required: true,
			hint: '工作流最后执行的节点中包含响应的字段',
			description:
				'在哪里找到此工具应返回的数据。n8n 将在工作流最后执行的节点的输出中查找具有此名称的字段,并返回其值。',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lt: 1.3 } }],
				},
			},
		},
		{
			displayName: '额外工作流输入',
			name: 'fields',
			placeholder: '添加值',
			type: 'fixedCollection',
			description: '这些将由被调用工作流的"执行工作流"触发器输出',
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			default: {},
			options: [
				{
					name: 'values',
					displayName: '值',
					values: [
						{
							displayName: '名称',
							name: 'name',
							type: 'string',
							default: '',
							placeholder: '例如：fieldName',
							description: '要设置值的字段名称。支持点表示法。示例：data.person[0].name。',
							requiresDataPath: 'single',
						},
						{
							displayName: '类型',
							name: 'type',
							type: 'options',
							description: '字段值类型',
							// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
							options: [
								{
									name: '字符串',
									value: 'stringValue',
								},
								{
									name: '数字',
									value: 'numberValue',
								},
								{
									name: '布尔值',
									value: 'booleanValue',
								},
								{
									name: '数组',
									value: 'arrayValue',
								},
								{
									name: '对象',
									value: 'objectValue',
								},
							],
							default: 'stringValue',
						},
						{
							displayName: '值',
							name: 'stringValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									type: ['stringValue'],
								},
							},
							validateType: 'string',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: '值',
							name: 'numberValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									type: ['numberValue'],
								},
							},
							validateType: 'number',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: '值',
							name: 'booleanValue',
							type: 'options',
							default: 'true',
							options: [
								{
									name: '真',
									value: 'true',
								},
								{
									name: '假',
									value: 'false',
								},
							],
							displayOptions: {
								show: {
									type: ['booleanValue'],
								},
							},
							validateType: 'boolean',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: '值',
							name: 'arrayValue',
							type: 'string',
							default: '',
							placeholder: '例如：[ arrayItem1, arrayItem2, arrayItem3 ]',
							displayOptions: {
								show: {
									type: ['arrayValue'],
								},
							},
							validateType: 'array',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: '值',
							name: 'objectValue',
							type: 'json',
							default: '={}',
							typeOptions: {
								rows: 2,
							},
							displayOptions: {
								show: {
									type: ['objectValue'],
								},
							},
							validateType: 'object',
							ignoreValidationDuringExecution: true,
						},
					],
				},
			],
		},
		// ----------------------------------
		//         Output Parsing
		// ----------------------------------
		{
			displayName: '指定输入架构',
			name: 'specifyInputSchema',
			type: 'boolean',
			description: '是否为函数指定架构。这将要求 LLM 以正确的格式提供输入,并根据架构进行验证。',
			noDataExpression: true,
			default: false,
		},
		{ ...schemaTypeField, displayOptions: { show: { specifyInputSchema: [true] } } },
		jsonSchemaExampleField,
		inputSchemaField,
	],
};
