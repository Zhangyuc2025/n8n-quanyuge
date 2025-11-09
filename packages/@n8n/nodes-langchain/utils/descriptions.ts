import type { DisplayCondition, INodeProperties, NodeParameterValue } from 'n8n-workflow';

export const schemaTypeField: INodeProperties = {
	displayName: 'Schema Type',
	name: 'schemaType',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Generate From JSON Example',
			value: 'fromJson',
			description: 'Generate a schema from an example JSON object',
		},
		{
			name: 'Define using JSON Schema',
			value: 'manual',
			description: 'Define the JSON schema manually',
		},
	],
	default: 'fromJson',
	description: 'How to specify the schema for the function',
};

/**
 * Returns a field for inputting a JSON example that can be used to generate the schema.
 * @param props
 */
export const buildJsonSchemaExampleField = (props?: {
	showExtraProps?: Record<string, Array<NodeParameterValue | DisplayCondition> | undefined>;
}): INodeProperties => ({
	displayName: 'JSON Example',
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
	description: 'Example JSON object to use to generate the schema',
});

/**
 * Returns a notice field about the generated schema properties being required by default.
 * @param props
 */
export const buildJsonSchemaExampleNotice = (props?: {
	showExtraProps?: Record<string, Array<NodeParameterValue | DisplayCondition> | undefined>;
}): INodeProperties => ({
	displayName:
		"All properties will be required. To make them optional, use the 'JSON Schema' schema type instead",
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
	displayName: 'Input Schema',
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
	description: 'Schema to use for the function',
	hint: 'Use <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format (<a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html">examples</a>). $refs syntax is currently not supported.',
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
	displayName: 'Description',
	name: 'toolDescription',
	type: 'string',
	default: 'AI Agent that can call other tools',
	required: true,
	typeOptions: { rows: 2 },
	description:
		'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
};
