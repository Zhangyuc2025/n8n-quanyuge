import {
	AIMessagePromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { IDataObject, INodeInputConfiguration, INodeProperties } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	promptTypeOptions,
	textFromGuardrailsNode,
	textFromPreviousNode,
} from '@utils/descriptions';
import { getBatchingOptionFields, getTemplateNoticeField } from '@utils/sharedFields';

/**
 * Dynamic input configuration generation based on node parameters
 */
export function getInputs(parameters: IDataObject) {
	const inputs: INodeInputConfiguration[] = [
		{ displayName: '', type: 'main' },
		{
			displayName: '模型',
			maxConnections: 1,
			type: 'ai_languageModel',
			required: true,
		},
	];

	const needsFallback = parameters?.needsFallback;

	if (needsFallback === true) {
		inputs.push({
			displayName: '备用模型',
			maxConnections: 1,
			type: 'ai_languageModel',
			required: true,
		});
	}

	// If `hasOutputParser` is undefined it must be version 1.3 or earlier so we
	// always add the output parser input
	const hasOutputParser = parameters?.hasOutputParser;
	if (hasOutputParser === undefined || hasOutputParser === true) {
		inputs.push({
			displayName: '输出解析器',
			type: 'ai_outputParser',
			maxConnections: 1,
			required: false,
		});
	}

	return inputs;
}

/**
 * Node properties configuration
 */
export const nodeProperties: INodeProperties[] = [
	getTemplateNoticeField(1978),
	{
		displayName: '提示词',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '={{ $json.input }}',
		displayOptions: {
			show: {
				'@version': [1],
			},
		},
	},
	{
		displayName: '提示词',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '={{ $json.chat_input }}',
		displayOptions: {
			show: {
				'@version': [1.1, 1.2],
			},
		},
	},
	{
		displayName: '提示词',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '={{ $json.chatInput }}',
		displayOptions: {
			show: {
				'@version': [1.3],
			},
		},
	},
	{
		...promptTypeOptions,
		displayOptions: {
			hide: {
				'@version': [1, 1.1, 1.2, 1.3],
			},
		},
	},
	{
		...textFromGuardrailsNode,
		displayOptions: { show: { promptType: ['guardrails'], '@version': [{ _cnd: { gte: 1.5 } }] } },
	},
	{
		...textFromPreviousNode,
		displayOptions: { show: { promptType: ['auto'], '@version': [{ _cnd: { gte: 1.5 } }] } },
	},
	{
		displayName: '提示词（用户消息）',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		placeholder: '例如：你好，你能帮我什么？',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				promptType: ['define'],
			},
		},
	},
	{
		displayName: '要求特定输出格式',
		name: 'hasOutputParser',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		displayOptions: {
			hide: {
				'@version': [1, 1.1, 1.3],
			},
		},
	},
	{
		displayName: '启用备用模型',
		name: 'needsFallback',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		displayOptions: {
			hide: {
				'@version': [1, 1.1, 1.3],
			},
		},
	},
	{
		displayName: '聊天消息（如果使用聊天模型）',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: '添加提示词',
		options: [
			{
				name: 'messageValues',
				displayName: '提示词',
				values: [
					{
						displayName: '类型名称或 ID',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'AI',
								value: AIMessagePromptTemplate.lc_name(),
							},
							{
								name: '系统',
								value: SystemMessagePromptTemplate.lc_name(),
							},
							{
								name: '用户',
								value: HumanMessagePromptTemplate.lc_name(),
							},
						],
						default: SystemMessagePromptTemplate.lc_name(),
					},
					{
						displayName: '消息类型',
						name: 'messageType',
						type: 'options',
						displayOptions: {
							show: {
								type: [HumanMessagePromptTemplate.lc_name()],
							},
						},
						options: [
							{
								name: '文本',
								value: 'text',
								description: '简单文本消息',
							},
							{
								name: '图像（二进制）',
								value: 'imageBinary',
								description: '处理来自上一个节点的二进制输入',
							},
							{
								name: '图像（URL）',
								value: 'imageUrl',
								description: '处理来自指定 URL 的图像',
							},
						],
						default: 'text',
					},
					{
						displayName: '图像数据字段名称',
						name: 'binaryImageDataKey',
						type: 'string',
						default: 'data',
						required: true,
						description: '链输入中包含要处理的二进制图像文件的字段名称',
						displayOptions: {
							show: {
								messageType: ['imageBinary'],
							},
						},
					},
					{
						displayName: '图像 URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						required: true,
						description: '要处理的图像的 URL',
						displayOptions: {
							show: {
								messageType: ['imageUrl'],
							},
						},
					},
					{
						displayName: '图像细节',
						description: '控制模型如何处理图像并生成其文本理解',
						name: 'imageDetail',
						type: 'options',
						displayOptions: {
							show: {
								type: [HumanMessagePromptTemplate.lc_name()],
								messageType: ['imageBinary', 'imageUrl'],
							},
						},
						options: [
							{
								name: '自动',
								value: 'auto',
								description:
									'模型将使用自动设置，根据图像输入大小决定是使用低分辨率还是高分辨率设置',
							},
							{
								name: '低',
								value: 'low',
								description:
									'模型将接收 512px x 512px 的低分辨率图像版本，并使用 65 个 token 的预算来表示图像。这使 API 能够返回更快的响应并为不需要高细节的用例消耗更少的输入 token',
							},
							{
								name: '高',
								value: 'high',
								description:
									'允许模型查看低分辨率图像，然后根据输入图像大小创建 512px 正方形的详细裁剪。每个详细裁剪使用两倍的 token 预算（65 个 token），总共 129 个 token',
							},
						],
						default: 'auto',
					},

					{
						displayName: '消息',
						name: 'message',
						type: 'string',
						required: true,
						displayOptions: {
							hide: {
								messageType: ['imageBinary', 'imageUrl'],
							},
						},
						default: '',
					},
				],
			},
		],
	},
	getBatchingOptionFields({
		show: {
			'@version': [{ _cnd: { gte: 1.7 } }],
		},
	}),
	{
		displayName: `在画布上连接一个<a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>输出解析器</a>以指定您需要的输出格式`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				hasOutputParser: [true],
			},
		},
	},
	{
		displayName: '在画布上连接一个额外的语言模型，以便在主模型失败时将其用作备用',
		name: 'fallbackNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				needsFallback: [true],
			},
		},
	},
];
