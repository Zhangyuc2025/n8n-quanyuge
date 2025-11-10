import {
	ADD_FORM_NOTICE,
	type INodePropertyOptions,
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookFunctions,
} from 'n8n-workflow';

import {
	appendAttributionToForm,
	formDescription,
	formFields,
	formRespondMode,
	formTitle,
	formTriggerPanel,
	respondWithOptions,
	webhookPath,
} from '../common.descriptions';
import { cssVariables } from '../cssVariables';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from '../interfaces';
import { formWebhook } from '../utils/utils';

const useWorkflowTimezone: INodeProperties = {
	displayName: '使用工作流时区',
	name: 'useWorkflowTimezone',
	type: 'boolean',
	default: false,
	description: '是否使用节点设置中设置的工作流时区而不是 UTC',
};

const descriptionV2: INodeTypeDescription = {
	displayName: 'n8n 表单触发器',
	name: 'formTrigger',
	icon: 'file:form.svg',
	group: ['trigger'],
	// since trigger and node are sharing descriptions and logic we need to sync the versions
	// and keep them aligned in both nodes
	version: [2, 2.1, 2.2, 2.3],
	description: '在 n8n 中生成 Web 表单并将其响应传递给工作流',
	defaults: {
		name: '表单提交时',
	},

	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	webhooks: [
		{
			name: 'setup',
			httpMethod: 'GET',
			responseMode: 'onReceived',
			isFullPath: true,
			path: '={{ $parameter["path"] || $parameter["options"]?.path || $webhookId }}',
			ndvHideUrl: true,
			nodeType: 'form',
		},
		{
			name: 'default',
			httpMethod: 'POST',
			responseMode: '={{$parameter["responseMode"]}}',
			responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
			isFullPath: true,
			path: '={{ $parameter["path"] || $parameter["options"]?.path || $webhookId }}',
			ndvHideMethod: true,
			nodeType: 'form',
		},
	],
	eventTriggerDescription: '等待您提交表单',
	activationMessage: '现在您可以调用生产环境的表单 URL。',
	triggerPanel: formTriggerPanel,
	credentials: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
			name: 'httpBasicAuth',
			required: true,
			displayOptions: {
				show: {
					[FORM_TRIGGER_AUTHENTICATION_PROPERTY]: ['basicAuth'],
				},
			},
		},
	],
	properties: [
		{
			displayName: '身份验证',
			name: FORM_TRIGGER_AUTHENTICATION_PROPERTY,
			type: 'options',
			options: [
				{
					name: '基本认证',
					value: 'basicAuth',
				},
				{
					name: '无',
					value: 'none',
				},
			],
			default: 'none',
		},
		{ ...webhookPath, displayOptions: { show: { '@version': [{ _cnd: { lte: 2.1 } }] } } },
		formTitle,
		formDescription,
		formFields,
		{ ...formRespondMode, displayOptions: { show: { '@version': [{ _cnd: { lte: 2.1 } }] } } },
		{
			...formRespondMode,
			options: (formRespondMode.options as INodePropertyOptions[])?.filter(
				(option) => option.value !== 'responseNode',
			),
			displayOptions: { show: { '@version': [{ _cnd: { gte: 2.2 } }] } },
		},
		{
			displayName:
				'在「响应 Webhook」节点中，选择「使用 JSON 响应」并设置 <strong>formSubmittedText</strong> 键以在表单中显示自定义响应，或设置 <strong>redirectURL</strong> 键以将用户重定向到 URL',
			name: 'formNotice',
			type: 'notice',
			displayOptions: {
				show: { responseMode: ['responseNode'] },
			},
			default: '',
		},
		// notice would be shown if no Form node was connected to trigger
		{
			displayName: '通过在工作流后续步骤中添加表单页面来构建多步骤表单',
			name: ADD_FORM_NOTICE,
			type: 'notice',
			default: '',
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				appendAttributionToForm,
				{
					displayName: '按钮标签',
					description: '表单中提交按钮的标签',
					name: 'buttonLabel',
					type: 'string',
					default: 'Submit',
				},
				{
					...webhookPath,
					required: false,
					displayOptions: { show: { '@version': [{ _cnd: { gte: 2.2 } }] } },
				},
				{
					...respondWithOptions,
					displayOptions: {
						hide: {
							'/responseMode': ['responseNode'],
						},
					},
				},
				{
					displayName: '忽略机器人',
					name: 'ignoreBots',
					type: 'boolean',
					default: false,
					description: '是否忽略来自机器人（如链接预览器和网络爬虫）的请求',
				},
				{
					...useWorkflowTimezone,
					default: false,
					description: "是否在 'submittedAt' 字段中使用工作流时区或 UTC",
					displayOptions: {
						show: {
							'@version': [2],
						},
					},
				},
				{
					...useWorkflowTimezone,
					default: true,
					description: "是否在 'submittedAt' 字段中使用工作流时区或 UTC",
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gt: 2 } }],
						},
					},
				},
				{
					displayName: '自定义表单样式',
					name: 'customCss',
					type: 'string',
					typeOptions: {
						rows: 10,
						editor: 'cssEditor',
					},
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gt: 2 } }],
						},
					},
					default: cssVariables.trim(),
					description: '使用 CSS 覆盖公共表单界面的默认样式',
				},
			],
		},
	],
};

export class FormTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...descriptionV2,
		};
	}

	async webhook(this: IWebhookFunctions) {
		return await formWebhook(this);
	}
}
