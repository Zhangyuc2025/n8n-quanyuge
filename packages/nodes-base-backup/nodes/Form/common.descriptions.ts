import type { INodeProperties } from 'n8n-workflow';

import { appendAttributionOption } from '../../utils/descriptions';

export const placeholder: string = `
<!-- Your custom HTML here --->


`.trimStart();

export const webhookPath: INodeProperties = {
	displayName: '表单路径',
	name: 'path',
	type: 'string',
	default: '',
	placeholder: 'webhook',
	required: true,
	description: '表单 URL 的最后一段，用于测试和生产环境',
};

export const formTitle: INodeProperties = {
	displayName: '表单标题',
	name: 'formTitle',
	type: 'string',
	default: '',
	placeholder: '例如：联系我们',
	required: true,
	description: '显示在表单顶部',
};

export const formDescription: INodeProperties = {
	displayName: '表单描述',
	name: 'formDescription',
	type: 'string',
	default: '',
	placeholder: '例如：我们会尽快回复您',
	description: '显示在表单标题下方。可用于提示用户如何填写表单。支持 HTML。',
	typeOptions: {
		rows: 2,
	},
};

export const formFields: INodeProperties = {
	displayName: '表单元素',
	name: 'formFields',
	placeholder: '添加表单元素',
	type: 'fixedCollection',
	default: {},
	typeOptions: {
		multipleValues: true,
		sortable: true,
	},
	options: [
		{
			displayName: '值',
			name: 'values',
			values: [
				{
					displayName: '字段名称',
					name: 'fieldLabel',
					type: 'string',
					default: '',
					placeholder: '例如：您的姓名是什么？',
					description: '显示在输入字段上方的标签',
					required: true,
					displayOptions: {
						hide: {
							fieldType: ['hiddenField', 'html'],
						},
					},
				},
				{
					displayName: '字段名称',
					name: 'fieldName',
					description: '字段的名称，用于输入属性并由工作流引用',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							fieldType: ['hiddenField'],
						},
					},
				},
				{
					displayName: '元素类型',
					name: 'fieldType',
					type: 'options',
					default: 'text',
					description: '要添加到表单的字段类型',
					// Update ALLOWED_FIELD_TYPES in packages/workflow/src/type-validation.ts when adding new field types
					options: [
						{
							name: '复选框',
							value: 'checkbox',
						},
						{
							name: '自定义 HTML',
							value: 'html',
						},
						{
							name: '日期',
							value: 'date',
						},
						{
							name: '下拉列表',
							value: 'dropdown',
						},
						{
							name: '电子邮件',
							value: 'email',
						},
						{
							name: '文件',
							value: 'file',
						},
						{
							name: '隐藏字段',
							value: 'hiddenField',
						},
						{
							name: '数值',
							value: 'number',
						},
						{
							name: '密码',
							value: 'password',
						},
						{
							name: '单选按钮',
							value: 'radio',
						},
						{
							name: '文本',
							value: 'text',
						},
						{
							name: '文本域',
							value: 'textarea',
						},
					],
					required: true,
				},
				{
					displayName: '元素名称',
					name: 'elementName',
					type: 'string',
					default: '',
					placeholder: '例如：content-section',
					description: '可选字段。可用于在输出中包含 html。',
					displayOptions: {
						show: {
							fieldType: ['html'],
						},
					},
				},
				{
					displayName: '占位符',
					name: 'placeholder',
					description: '在字段内显示的示例文本',
					type: 'string',
					default: '',
					displayOptions: {
						hide: {
							fieldType: ['dropdown', 'date', 'file', 'html', 'hiddenField', 'radio', 'checkbox'],
						},
					},
				},
				{
					displayName: '字段值',
					name: 'fieldValue',
					description: '可以在此处设置输入值，如果未设置值，则将通过字段名称作为查询参数传递',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							fieldType: ['hiddenField'],
						},
					},
				},

				{
					displayName: '字段选项',
					name: 'fieldOptions',
					placeholder: '添加字段选项',
					description: '可以从下拉列表中选择的选项列表',
					type: 'fixedCollection',
					default: { values: [{ option: '' }] },
					required: true,
					displayOptions: {
						show: {
							fieldType: ['dropdown'],
						},
					},
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					options: [
						{
							displayName: '值',
							name: 'values',
							values: [
								{
									displayName: '选项',
									name: 'option',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: '复选框',
					name: 'fieldOptions',
					placeholder: '添加复选框',
					type: 'fixedCollection',
					default: { values: [{ option: '' }] },
					required: true,
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
						},
					},
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					options: [
						{
							displayName: '值',
							name: 'values',
							values: [
								{
									displayName: '复选框标签',
									name: 'option',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: '单选按钮',
					name: 'fieldOptions',
					placeholder: '添加单选按钮',
					type: 'fixedCollection',
					default: { values: [{ option: '' }] },
					required: true,
					displayOptions: {
						show: {
							fieldType: ['radio'],
						},
					},
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					options: [
						{
							displayName: '值',
							name: 'values',
							values: [
								{
									displayName: '单选按钮标签',
									name: 'option',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: '多选是一个旧选项，请改用复选框或单选按钮字段类型',
					name: 'multiselectLegacyNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							multiselect: [true],
							fieldType: ['dropdown'],
							'@version': [{ _cnd: { lt: 2.3 } }],
						},
					},
				},
				{
					displayName: '多选',
					name: 'multiselect',
					type: 'boolean',
					default: false,
					description: '是否允许用户从下拉列表中选择多个选项',
					displayOptions: {
						show: {
							fieldType: ['dropdown'],
							'@version': [{ _cnd: { lt: 2.3 } }],
						},
					},
				},
				{
					displayName: '限制选择',
					name: 'limitSelection',
					type: 'options',
					default: 'unlimited',
					options: [
						{
							name: '精确数量',
							value: 'exact',
						},
						{
							name: '范围',
							value: 'range',
						},
						{
							name: '无限制',
							value: 'unlimited',
						},
					],
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
						},
					},
				},
				{
					displayName: '选择数量',
					name: 'numberOfSelections',
					type: 'number',
					default: 1,
					typeOptions: {
						numberPrecision: 0,
						minValue: 1,
					},
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
							limitSelection: ['exact'],
						},
					},
				},
				{
					displayName: '最少选择数',
					name: 'minSelections',
					type: 'number',
					default: 0,
					typeOptions: {
						numberPrecision: 0,
						minValue: 0,
					},
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
							limitSelection: ['range'],
						},
					},
				},
				{
					displayName: '最多选择数',
					name: 'maxSelections',
					type: 'number',
					default: 1,
					typeOptions: {
						numberPrecision: 0,
						minValue: 1,
					},
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
							limitSelection: ['range'],
						},
					},
				},
				{
					displayName: 'HTML',
					name: 'html',
					typeOptions: {
						editor: 'htmlEditor',
					},
					type: 'string',
					noDataExpression: true,
					default: placeholder,
					description: '要在表单页面上显示的 HTML 元素',
					hint: '不接受 <code>&lt;script&gt;</code>、<code>&lt;style&gt;</code> 或 <code>&lt;input&gt;</code> 标签',
					displayOptions: {
						show: {
							fieldType: ['html'],
						},
					},
				},
				{
					displayName: '多个文件',
					name: 'multipleFiles',
					type: 'boolean',
					default: true,
					description: '是否允许用户从文件输入中选择多个文件或仅选择一个',
					displayOptions: {
						show: {
							fieldType: ['file'],
						},
					},
				},
				{
					displayName: '接受的文件类型',
					name: 'acceptFileTypes',
					type: 'string',
					default: '',
					description: '允许的文件扩展名的逗号分隔列表',
					hint: '留空以允许所有文件类型',
					placeholder: '例如：.jpg, .png',
					displayOptions: {
						show: {
							fieldType: ['file'],
						},
					},
				},
				{
					displayName: '显示的日期根据用户浏览器的区域设置进行格式化',
					name: 'formatDate',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							fieldType: ['date'],
						},
					},
				},
				{
					displayName: '必填字段',
					name: 'requiredField',
					type: 'boolean',
					default: false,
					description: '是否要求用户在提交表单前为此字段输入值',
					displayOptions: {
						hide: {
							fieldType: ['html', 'hiddenField'],
						},
					},
				},
			],
		},
	],
};

export const formRespondMode: INodeProperties = {
	displayName: '响应时机',
	name: 'responseMode',
	type: 'options',
	options: [
		{
			name: '表单提交时',
			value: 'onReceived',
			description: '此节点接收到表单提交时立即响应',
		},
		{
			name: '工作流完成时',
			value: 'lastNode',
			description: '工作流的最后一个节点执行时响应',
		},
		{
			name: '使用"响应 Webhook"节点',
			value: 'responseNode',
			description: '执行"响应 Webhook"节点时响应',
		},
	],
	default: 'onReceived',
	description: '何时响应表单提交',
};

export const formTriggerPanel = {
	header: 'Pull in a test form submission',
	executionsHelp: {
		inactive:
			"Form Trigger has two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Execute step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
		active:
			"Form Trigger has two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Execute step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
	},
	activationHint: {
		active:
			"This node will also trigger automatically on new form submissions (but those executions won't show up here).",
		inactive:
			'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new form submissions created via the Production URL.',
	},
};

export const respondWithOptions: INodeProperties = {
	displayName: '表单响应',
	name: 'respondWithOptions',
	type: 'fixedCollection',
	placeholder: '添加选项',
	default: { values: { respondWith: 'text' } },
	options: [
		{
			displayName: '值',
			name: 'values',
			values: [
				{
					displayName: '响应方式',
					name: 'respondWith',
					type: 'options',
					default: 'text',
					options: [
						{
							name: '表单提交文本',
							value: 'text',
							description: '向用户显示响应文本',
						},
						{
							name: '重定向 URL',
							value: 'redirect',
							description: '将用户重定向到 URL',
						},
					],
				},
				{
					displayName: '要显示的文本',
					name: 'formSubmittedText',
					description: '用户填写表单后显示的文本。如果不想显示任何附加文本，请留空。',
					type: 'string',
					default: '您的回复已记录',
					displayOptions: {
						show: {
							respondWith: ['text'],
						},
					},
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					displayName: '重定向到的 URL',
					name: 'redirectUrl',
					description: '用户填写表单后重定向到的 URL。必须是有效的 URL。',
					type: 'string',
					default: '',
					validateType: 'url',
					placeholder: '例如：http://www.n8n.io',
					displayOptions: {
						show: {
							respondWith: ['redirect'],
						},
					},
				},
			],
		},
	],
};

export const appendAttributionToForm: INodeProperties = {
	...appendAttributionOption,
	description: '是否在表单底部包含"使用 n8n 自动化表单"链接',
};
