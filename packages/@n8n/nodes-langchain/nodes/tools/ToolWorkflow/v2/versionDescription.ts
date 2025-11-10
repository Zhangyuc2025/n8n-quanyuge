/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { getConnectionHintNoticeField } from '../../../../utils/sharedFields';

export const versionDescription: INodeTypeDescription = {
	displayName: '调用 n8n 工作流工具',
	name: 'toolWorkflow',
	group: ['transform'],
	description: '使用另一个 n8n 工作流作为工具。允许将任何 n8n 节点打包为工具。',
	defaults: {
		name: '调用 n8n 工作流工具',
	},
	version: [2, 2.1, 2.2],
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
			placeholder: '例如：My_Color_Tool',
			validateType: 'string-alphanumeric',
			description: '要调用的函数名称,只能包含字母、数字和下划线',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lte: 2.1 } }],
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
			displayName: '工作流',
			name: 'workflowId',
			type: 'workflowSelector',
			displayOptions: {
				show: {
					source: ['database'],
				},
			},
			default: '',
			required: true,
		},
		// -----------------------------------------------
		//         Resource mapper for workflow inputs
		// -----------------------------------------------
		{
			displayName: '工作流输入',
			name: 'workflowInputs',
			type: 'resourceMapper',
			noDataExpression: true,
			default: {
				mappingMode: 'defineBelow',
				value: null,
			},
			required: true,
			typeOptions: {
				loadOptionsDependsOn: ['workflowId.value'],
				resourceMapper: {
					localResourceMapperMethod: 'loadSubWorkflowInputs',
					valuesLabel: '工作流输入',
					mode: 'map',
					fieldWords: {
						singular: '工作流输入',
						plural: '工作流输入',
					},
					addAllFields: true,
					multiKeyMatch: false,
					supportAutoMap: false,
				},
			},
			displayOptions: {
				show: {
					source: ['database'],
				},
				hide: {
					workflowId: [''],
				},
			},
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
	],
};
