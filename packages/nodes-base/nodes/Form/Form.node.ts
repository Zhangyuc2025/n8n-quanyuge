import type {
	FormFieldsParameter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import {
	Node,
	updateDisplayOptions,
	NodeOperationError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	tryToParseJsonToFormFields,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { cssVariables } from './cssVariables';
import { renderFormCompletion } from './utils/formCompletionUtils';
import { getFormTriggerNode, renderFormNode } from './utils/formNodeUtils';
import { prepareFormReturnItem, resolveRawData } from './utils/utils';
import { configureWaitTillDate } from '../../utils/sendAndWait/configureWaitTillDate.util';
import { limitWaitTimeProperties } from '../../utils/sendAndWait/descriptions';
import { formDescription, formFields, formTitle } from '../Form/common.descriptions';

const waitTimeProperties: INodeProperties[] = [
	{
		displayName: '限制等待时间',
		name: 'limitWaitTime',
		type: 'boolean',
		default: false,
		description: '是否限制此节点在执行恢复之前等待用户响应的时间',
	},
	...updateDisplayOptions(
		{
			show: {
				limitWaitTime: [true],
			},
		},
		limitWaitTimeProperties,
	),
];

export const formFieldsProperties: INodeProperties[] = [
	{
		displayName: '定义表单',
		name: 'defineForm',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: '使用下方字段',
				value: 'fields',
			},
			{
				name: '使用 JSON',
				value: 'json',
			},
		],
		default: 'fields',
	},
	{
		displayName: '表单字段',
		name: 'jsonOutput',
		type: 'json',
		typeOptions: {
			rows: 5,
		},
		default:
			'[\n  {\n    "fieldLabel": "Name",\n    "placeholder": "enter your name",\n    "requiredField": true\n  },\n  {\n    "fieldLabel": "Age",\n    "fieldType": "number",\n    "placeholder": "enter your age"\n  },\n  {\n    "fieldLabel": "Email",\n    "fieldType": "email",\n    "requiredField": true\n  },\n  {\n    "fieldLabel": "Textarea",\n    "fieldType": "textarea"\n  },\n  {\n    "fieldLabel": "Dropdown Options",\n    "fieldType": "dropdown",\n    "fieldOptions": {\n      "values": [\n        {\n          "option": "option 1"\n        },\n        {\n          "option": "option 2"\n        }\n      ]\n    },\n    "requiredField": true\n  },\n  {\n    "fieldLabel": "Checkboxes",\n    "fieldType": "checkbox",\n    "fieldOptions": {\n      "values": [\n        {\n          "option": "option 1"\n        },\n        {\n          "option": "option 2"\n        }\n      ]\n    }\n  },\n  {\n    "fieldLabel": "Radio",\n    "fieldType": "radio",\n    "fieldOptions": {\n      "values": [\n        {\n          "option": "option 1"\n        },\n        {\n          "option": "option 2"\n        }\n      ]\n    }\n  },\n  {\n    "fieldLabel": "Email",\n    "fieldType": "email",\n    "placeholder": "me@mail.con"\n  },\n  {\n    "fieldLabel": "File",\n    "fieldType": "file",\n    "multipleFiles": true,\n    "acceptFileTypes": ".jpg, .png"\n  },\n  {\n    "fieldLabel": "Number",\n    "fieldType": "number"\n  },\n  {\n    "fieldLabel": "Password",\n    "fieldType": "password"\n  }\n]\n',
		validateType: 'form-fields',
		ignoreValidationDuringExecution: true,
		hint: '<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/" target="_blank">查看文档</a> 了解字段语法',
		displayOptions: {
			show: {
				defineForm: ['json'],
			},
		},
	},
	{ ...formFields, displayOptions: { show: { defineForm: ['fields'] } } },
];

const pageProperties = updateDisplayOptions(
	{
		show: {
			operation: ['page'],
		},
	},
	[
		...formFieldsProperties,
		...waitTimeProperties,
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{ ...formTitle, required: false },
				formDescription,
				{
					displayName: '按钮标签',
					name: 'buttonLabel',
					type: 'string',
					default: 'Submit',
				},
				{
					displayName: '自定义表单样式',
					name: 'customCss',
					type: 'string',
					typeOptions: {
						rows: 10,
						editor: 'cssEditor',
					},
					default: cssVariables.trim(),
					description: '使用 CSS 覆盖公共表单界面的默认样式',
				},
			],
		},
	],
);

const completionProperties = updateDisplayOptions(
	{
		show: {
			operation: ['completion'],
		},
	},
	[
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			displayName: '提交 n8n 表单时',
			name: 'respondWith',
			type: 'options',
			default: 'text',
			options: [
				{
					name: '显示完成屏幕',
					value: 'text',
					description: '向用户显示响应文本',
				},
				{
					name: '重定向到 URL',
					value: 'redirect',
					description: '将用户重定向到 URL',
				},
				{
					name: '显示文本',
					value: 'showText',
					description: '显示简单文本或 HTML',
				},
				{
					name: '返回二进制文件',
					value: 'returnBinary',
					description: '返回传入的二进制文件',
				},
			],
		},
		{
			displayName: 'URL 地址',
			name: 'redirectUrl',
			validateType: 'url',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					respondWith: ['redirect'],
				},
			},
		},
		{
			displayName: '完成标题',
			name: 'completionTitle',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					respondWith: ['text', 'returnBinary'],
				},
			},
		},
		{
			displayName: '完成消息',
			name: 'completionMessage',
			type: 'string',
			default: '',
			typeOptions: {
				rows: 2,
			},
			displayOptions: {
				show: {
					respondWith: ['text', 'returnBinary'],
				},
			},
		},
		{
			displayName: '文本',
			name: 'responseText',
			type: 'string',
			displayOptions: {
				show: {
					respondWith: ['showText'],
				},
			},
			typeOptions: {
				rows: 2,
			},
			default: '',
			placeholder: '例如：感谢您填写此表单',
			description: '要在页面上显示的文本。使用 HTML 可以显示自定义网页。',
		},
		{
			displayName: '输入数据字段名称',
			name: 'inputDataFieldName',
			type: 'string',
			displayOptions: {
				show: {
					respondWith: ['returnBinary'],
				},
			},
			default: 'data',
			placeholder: '例如：data',
			description: '在左侧输入面板的二进制选项卡中查找包含要返回的二进制数据的输入字段名称',
			hint: '包含要返回的二进制文件数据的输入字段名称',
		},
		...waitTimeProperties,
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{ ...formTitle, required: false, displayName: '完成页面标题' },
				{
					displayName: '自定义表单样式',
					name: 'customCss',
					type: 'string',
					typeOptions: {
						rows: 10,
						editor: 'cssEditor',
					},
					default: cssVariables.trim(),
					description: '使用 CSS 覆盖公共表单界面的默认样式',
				},
			],
			displayOptions: {
				show: {
					respondWith: ['text', 'returnBinary', 'redirect'],
				},
			},
		},
	],
);

export class Form extends Node {
	nodeInputData: INodeExecutionData[] = [];

	description: INodeTypeDescription = {
		displayName: 'n8n 表单',
		name: 'form',
		icon: 'file:form.svg',
		group: ['input'],
		// since trigger and node are sharing descriptions and logic we need to sync the versions
		// and keep them aligned in both nodes
		version: [1, 2.3],
		description: '在 n8n 中生成 Web 表单并将其响应传递给工作流',
		defaults: {
			name: '表单',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		waitingNodeTooltip:
			'=Execution will continue when form is submitted on <a href="{{ $execution.resumeFormUrl }}" target="_blank">{{ $execution.resumeFormUrl }}</a>',
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'responseNode',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
		],
		properties: [
			{
				displayName: '必须在此节点之前设置 n8n 表单触发器节点',
				name: 'triggerNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '页面类型',
				name: 'operation',
				type: 'options',
				default: 'page',
				noDataExpression: true,
				options: [
					{
						name: '下一个表单页面',
						value: 'page',
					},
					{
						name: '表单结束',
						value: 'completion',
					},
				],
			},
			...pageProperties,
			...completionProperties,
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const res = context.getResponseObject();

		const operation = context.getNodeParameter('operation', '') as string;

		const trigger = getFormTriggerNode(context);

		const mode = context.evaluateExpression(`{{ $('${trigger.name}').first().json.formMode }}`) as
			| 'test'
			| 'production';

		const defineForm = context.getNodeParameter('defineForm', false) as string;

		let fields: FormFieldsParameter = [];
		if (defineForm === 'json') {
			try {
				const jsonOutput = context.getNodeParameter('jsonOutput', '', {
					rawExpressions: true,
				}) as string;

				fields = tryToParseJsonToFormFields(resolveRawData(context, jsonOutput));
			} catch (error) {
				throw new NodeOperationError(context.getNode(), error.message, {
					description: error.message,
					type: mode === 'test' ? 'manual-form-test' : undefined,
				});
			}
		} else {
			fields = context.getNodeParameter('formFields.values', []) as FormFieldsParameter;
		}

		const method = context.getRequestObject().method;

		if (operation === 'completion' && method === 'GET') {
			return await renderFormCompletion(context, res, trigger);
		}

		if (operation === 'completion' && method === 'POST') {
			return {
				workflowData: [context.evaluateExpression('{{ $input.all() }}') as INodeExecutionData[]],
			};
		}

		if (method === 'GET') {
			return await renderFormNode(context, res, trigger, fields, mode);
		}

		let useWorkflowTimezone = context.evaluateExpression(
			`{{ $('${trigger.name}').params.options?.useWorkflowTimezone }}`,
		) as boolean;

		if (useWorkflowTimezone === undefined && trigger?.typeVersion > 2) {
			useWorkflowTimezone = true;
		}

		const returnItem = await prepareFormReturnItem(context, fields, mode, useWorkflowTimezone);

		return {
			webhookResponse: { status: 200 },
			workflowData: [[returnItem]],
		};
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = context.getNodeParameter('operation', 0);

		if (operation === 'completion') {
			this.nodeInputData = context.getInputData();
		}

		const parentNodes = context.getParentNodes(context.getNode().name);
		const hasFormTrigger = parentNodes.some((node) => node.type === FORM_TRIGGER_NODE_TYPE);

		if (!hasFormTrigger) {
			throw new NodeOperationError(
				context.getNode(),
				'Form Trigger node must be set before this node',
			);
		}

		const childNodes = context.getChildNodes(context.getNode().name);
		const hasNextPage = childNodes.some((node) => node.type === FORM_NODE_TYPE);

		if (operation === 'completion' && hasNextPage) {
			throw new NodeOperationError(
				context.getNode(),
				'Completion has to be the last Form node in the workflow',
			);
		}

		const waitTill = configureWaitTillDate(context, 'root');
		await context.putExecutionToWait(waitTill);

		context.sendResponse({
			headers: {
				location: context.evaluateExpression('{{ $execution.resumeFormUrl }}', 0),
			},
			statusCode: 307,
		});

		return [context.getInputData()];
	}
}
