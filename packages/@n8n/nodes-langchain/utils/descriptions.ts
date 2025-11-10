import type { DisplayCondition, INodeProperties, NodeParameterValue } from 'n8n-workflow';

export const schemaTypeField: INodeProperties = {
	displayName: '架构类型',
	name: 'schemaType',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: '从 JSON 示例生成',
			value: 'fromJson',
			description: '从 JSON 示例对象生成架构',
		},
		{
			name: '使用 JSON Schema 定义',
			value: 'manual',
			description: '手动定义 JSON 架构',
		},
	],
	default: 'fromJson',
	description: '如何指定函数的架构',
};

/**
 * Returns a field for inputting a JSON example that can be used to generate the schema.
 * @param props
 */
export const buildJsonSchemaExampleField = (props?: {
	showExtraProps?: Record<string, Array<NodeParameterValue | DisplayCondition> | undefined>;
}): INodeProperties => ({
	displayName: 'JSON 示例',
	name: 'jsonSchemaExample',
	type: 'json',
	default: `{
	"some_input": "some_value"
}`,
	noDataExpression: true,
	typeOptions: {
		rows: 10,
	},
	displayOptions: {
		show: {
			...props?.showExtraProps,
			schemaType: ['fromJson'],
		},
	},
	description: '用于生成架构的 JSON 示例对象',
});

/**
 * Returns a notice field about the generated schema properties being required by default.
 * @param props
 */
export const buildJsonSchemaExampleNotice = (props?: {
	showExtraProps?: Record<string, Array<NodeParameterValue | DisplayCondition> | undefined>;
}): INodeProperties => ({
	displayName: "所有属性都将是必需的。要使其成为可选，请改用 'JSON Schema' 架构类型",
	name: 'notice',
	type: 'notice',
	default: '',
	displayOptions: {
		show: {
			...props?.showExtraProps,
			schemaType: ['fromJson'],
		},
	},
});

export const jsonSchemaExampleField = buildJsonSchemaExampleField();

export const buildInputSchemaField = (props?: {
	showExtraProps?: Record<string, Array<NodeParameterValue | DisplayCondition> | undefined>;
}): INodeProperties => ({
	displayName: '输入架构',
	name: 'inputSchema',
	type: 'json',
	default: `{
"type": "object",
"properties": {
	"some_input": {
		"type": "string",
		"description": "Some input to the function"
		}
	}
}`,
	noDataExpression: false,
	typeOptions: {
		rows: 10,
	},
	displayOptions: {
		show: {
			...props?.showExtraProps,
			schemaType: ['manual'],
		},
	},
	description: '用于函数的架构',
	hint: '使用 <a target="_blank" href="https://json-schema.org/">JSON Schema</a> 格式（<a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html">示例</a>）。目前不支持 $refs 语法。',
});

export const inputSchemaField = buildInputSchemaField();

export const promptTypeOptions: INodeProperties = {
	displayName: '提示词来源（用户消息）',
	name: 'promptType',
	type: 'options',
	options: [
		{
			name: '聊天触发器节点',
			value: 'auto',
			description: "从直接连接的聊天触发器中查找名为 'chatInput' 的输入字段",
		},
		{
			name: '护栏节点',
			value: 'guardrails',
			description: "从直接连接的护栏节点中查找名为 'guardrailsInput' 的输入字段",
		},
		{
			name: '手动定义',
			value: 'define',
			description: '使用表达式引用之前节点的数据或输入静态文本',
		},
	],
	default: 'auto',
};

export const textInput: INodeProperties = {
	displayName: '提示词（用户消息）',
	name: 'text',
	type: 'string',
	required: true,
	default: '',
	placeholder: '例如：你好，你可以帮我做什么？',
	typeOptions: {
		rows: 2,
	},
};

export const textFromPreviousNode: INodeProperties = {
	displayName: '提示词（用户消息）',
	name: 'text',
	type: 'string',
	required: true,
	default: '={{ $json.chatInput }}',
	typeOptions: {
		rows: 2,
	},
	disabledOptions: { show: { promptType: ['auto'] } },
};

export const textFromGuardrailsNode: INodeProperties = {
	displayName: '提示词（用户消息）',
	name: 'text',
	type: 'string',
	required: true,
	default: '={{ $json.guardrailsInput }}',
	typeOptions: {
		rows: 2,
	},
	disabledOptions: { show: { promptType: ['guardrails'] } },
};

export const toolDescription: INodeProperties = {
	displayName: '描述',
	name: 'toolDescription',
	type: 'string',
	default: '可以调用其他工具的 AI 智能体',
	required: true,
	typeOptions: { rows: 2 },
	description: '向 LLM 解释此工具的作用，一个良好、具体的描述可以让 LLM 更频繁地产生预期结果',
};
