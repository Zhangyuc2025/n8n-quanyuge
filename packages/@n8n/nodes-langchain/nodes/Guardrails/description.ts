/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeProperties, type INodeTypeDescription } from 'n8n-workflow';

import { JAILBREAK_PROMPT } from './actions/checks/jailbreak';
import { NSFW_SYSTEM_PROMPT } from './actions/checks/nsfw';
import { PII_NAME_MAP, PIIEntity } from './actions/checks/pii';
import { TOPICAL_ALIGNMENT_SYSTEM_PROMPT } from './actions/checks/topicalAlignment';
import { configureNodeInputs } from './helpers/configureNodeInputs';
import { LLM_SYSTEM_RULES } from './helpers/model';

const THRESHOLD_OPTION: INodeProperties = {
	displayName: '阈值',
	name: 'threshold',
	type: 'number',
	default: '',
	description: '触发防护栏的最小置信度阈值（0.0 到 1.0）',
	hint: '评分低于此值的输入将被视为违规',
};

const getPromptOption: (
	defaultPrompt: string,
	collapsible?: boolean,
	hint?: string,
) => INodeProperties[] = (defaultPrompt, collapsible = true, hint) => {
	const promptParameters: INodeProperties = {
		displayName: '提示词',
		name: 'prompt',
		type: 'string',
		default: defaultPrompt,
		description: '防护栏使用的系统提示词。阈值和 JSON 输出由节点自动执行。',
		hint,
		typeOptions: {
			rows: 6,
		},
	};
	if (collapsible) {
		return [
			{ displayName: '自定义提示词', name: 'customizePrompt', type: 'boolean', default: false },
			{ ...promptParameters, displayOptions: { show: { customizePrompt: [true] } } },
		];
	}
	return [promptParameters];
};

const wrapValue = (properties: INodeProperties[]) => ({
	displayName: '值',
	name: 'value',
	values: properties,
});

export const versionDescription: INodeTypeDescription = {
	displayName: '防护栏',
	name: 'guardrails',
	icon: 'file:guardrails.svg',
	group: ['transform'],
	version: 1,
	description: '保护 AI 模型免受恶意输入的影响，或防止它们生成不良响应',
	defaults: {
		name: '防护栏',
	},
	codex: {
		alias: ['LangChain', 'Guardrails', 'PII', 'Secret', 'Injection', 'Sanitize'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.guardrails/',
				},
			],
		},
	},
	inputs: `={{(${configureNodeInputs})($parameter.operation)}}`,
	outputs: `={{
		((parameters) => {
			const operation = parameters.operation ?? 'classify';

			if (operation === 'classify') {
				return [{displayName: "Pass", type: "${NodeConnectionTypes.Main}"}, {displayName: "Fail", type: "${NodeConnectionTypes.Main}"}]
			}

			return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
		})($parameter)
	}}`,
	properties: [
		{
			displayName:
				'使用防护栏根据一组策略（例如 NSFW、提示词注入）验证文本，或对其进行清理（例如个人数据、密钥）',
			name: 'guardrailsUsage',
			type: 'notice',
			default: '',
		},
		{
			displayName: '操作',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: '检查文本是否违规',
					value: 'classify',
					action: '检查文本是否违规',
					description: '根据一组策略（例如 NSFW、提示词注入）验证文本',
				},
				{
					name: '清理文本',
					value: 'sanitize',
					action: '清理文本',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period
					description: '编辑文本以屏蔽个人数据、密钥、URL 等。',
				},
			],
			default: 'classify',
		},
		{
			displayName: '要检查的文本',
			name: 'text',
			type: 'string',
			required: true,
			default: '',
			typeOptions: {
				rows: 1,
			},
		},
		{
			displayName: '防护栏',
			name: 'guardrails',
			placeholder: '添加防护栏',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: '关键词',
					name: 'keywords',
					type: 'string',
					default: '',
					description:
						'此防护栏检查输入文本中是否出现指定的关键词，并可配置为根据关键词匹配触发警报。可以用逗号分隔添加多个关键词。',
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: '越狱',
					name: 'jailbreak',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: '检测试图越狱或绕过 AI 安全措施的行为',
					options: [wrapValue([THRESHOLD_OPTION, ...getPromptOption(JAILBREAK_PROMPT)])],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: 'NSFW（不适合工作场合）',
					name: 'nsfw',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: '检测试图生成 NSFW 内容的行为',
					options: [wrapValue([THRESHOLD_OPTION, ...getPromptOption(NSFW_SYSTEM_PROMPT)])],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: '个人数据（PII）',
					name: 'pii',
					type: 'fixedCollection',
					default: { value: { type: 'all' } },
					description: '检测试图使用个人数据内容的行为',
					options: [
						wrapValue([
							{
								displayName: '类型',
								name: 'type',
								type: 'options',
								default: '',
								options: [
									{ name: '全部', value: 'all' },
									{ name: '已选择', value: 'selected' },
								],
							},
							{
								displayName: '实体',
								name: 'entities',
								type: 'multiOptions',
								default: [],
								displayOptions: {
									show: {
										type: ['selected'],
									},
								},
								options: Object.values(PIIEntity).map((entity) => ({
									name: PII_NAME_MAP[entity],
									value: entity,
								})),
							},
						]),
					],
				},
				{
					displayName: '密钥',
					name: 'secretKeys',
					type: 'fixedCollection',
					default: { value: { permissiveness: 'balanced' } },
					description:
						'检测输入文本中尝试使用密钥的行为。扫描文本中的常见模式，应用熵分析来检测看起来随机的字符串。',
					options: [
						wrapValue([
							{
								displayName: '宽松度',
								name: 'permissiveness',
								type: 'options',
								default: '',
								options: [
									{
										name: '严格',
										value: 'strict',
										description: '最敏感，可能会有更多误报（通常会标记高熵文件名或代码）',
									},
									{
										name: '平衡',
										value: 'balanced',
										description: '在敏感性和特异性之间取得平衡',
									},
									{
										name: '宽松',
										value: 'permissive',
										description: '最不敏感，可能会错过一些密钥（但也减少了误报）',
									},
								],
							},
						]),
					],
				},
				{
					displayName: '主题对齐',
					name: 'topicalAlignment',
					type: 'fixedCollection',
					default: { value: { threshold: 0.7 } },
					description: '检测试图偏离业务范围的行为',
					options: [
						wrapValue([
							THRESHOLD_OPTION,
							...getPromptOption(TOPICAL_ALIGNMENT_SYSTEM_PROMPT, false, '请确保替换占位符。'),
						]),
					],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: 'URL',
					name: 'urls',
					type: 'fixedCollection',
					default: { value: { allowedSchemes: ['https'], allowedUrls: '' } },
					description: '阻止不在允许列表中的 URL',
					options: [
						wrapValue([
							{
								displayName: '阻止所有 URL，除了',
								name: 'allowedUrls',
								type: 'string',
								// keep placeholder to avoid limitation that removes collections with unchanged default values
								default: 'PLACEHOLDER',
								description: '可以用逗号分隔添加多个 URL。留空以阻止所有 URL。',
							},
							{
								displayName: '允许的协议',
								name: 'allowedSchemes',
								type: 'multiOptions',
								default: ['https'],
								// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
								options: [
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'https', value: 'https' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'http', value: 'http' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'ftp', value: 'ftp' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'data', value: 'data' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'javascript', value: 'javascript' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'vbscript', value: 'vbscript' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'mailto', value: 'mailto' },
								],
							},
							{
								displayName: '阻止用户信息',
								name: 'blockUserinfo',
								type: 'boolean',
								default: true,
								description: '是否阻止包含用户信息的 URL（user:pass@domain）以防止凭据注入',
								displayOptions: {
									show: {
										'/operation': ['classify'],
									},
								},
							},
							{
								displayName: '清理用户信息',
								name: 'blockUserinfo',
								type: 'boolean',
								default: true,
								description: '是否清理包含用户信息的 URL（user:pass@domain）以防止凭据注入',
								displayOptions: {
									show: {
										'/operation': ['sanitize'],
									},
								},
							},
							{
								displayName: '允许子域名',
								name: 'allowSubdomains',
								type: 'boolean',
								default: true,
								description: '是否允许子域名（例如，如果允许 domain.com，则允许 sub.domain.com）',
							},
						]),
					],
				},
				{
					displayName: '自定义',
					name: 'custom',
					type: 'fixedCollection',
					typeOptions: {
						sortable: true,
						multipleValues: true,
					},
					placeholder: '添加自定义防护栏',
					default: {
						guardrail: [{ name: '自定义防护栏' }],
					},
					options: [
						{
							displayName: '防护栏',
							name: 'guardrail',
							values: [
								{
									displayName: '名称',
									name: 'name',
									type: 'string',
									default: '',
									description: '自定义防护栏的名称',
								},
								THRESHOLD_OPTION,
								...getPromptOption('', false),
							],
						},
					],
					displayOptions: {
						show: {
							'/operation': ['classify'],
						},
					},
				},
				{
					displayName: '自定义正则表达式',
					name: 'customRegex',
					type: 'fixedCollection',
					typeOptions: {
						sortable: true,
						multipleValues: true,
					},
					placeholder: '添加自定义正则表达式',
					default: {},
					options: [
						{
							displayName: '正则表达式',
							name: 'regex',
							values: [
								{
									displayName: '名称',
									name: 'name',
									type: 'string',
									default: '',
									description: '自定义正则表达式的名称。清理时将用于替换。',
								},
								{
									displayName: '正则表达式',
									name: 'value',
									type: 'string',
									default: '',
									description: '用于匹配输入文本的正则表达式',
									placeholder: '/text/gi',
								},
							],
						},
					],
				},
			],
		},
		{
			displayName: '自定义系统消息',
			name: 'customizeSystemMessage',
			description: '是否自定义防护栏使用的系统消息以指定输出格式',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					'/operation': ['classify'],
				},
			},
		},
		{
			displayName: '系统消息',
			name: 'systemMessage',
			type: 'string',
			description: '防护栏使用的系统消息，用于根据架构执行阈值和 JSON 输出',
			hint: '此消息在防护栏定义的提示词之后附加',
			default: LLM_SYSTEM_RULES,
			typeOptions: {
				rows: 6,
			},
			displayOptions: {
				show: {
					'/customizeSystemMessage': [true],
				},
			},
		},
	],
};
