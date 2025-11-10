import type { INodeProperties } from 'n8n-workflow';

export const SYSTEM_PROMPT_TEMPLATE = `你是一个问答任务的助手。使用以下检索到的上下文片段来回答问题。
如果你不知道答案，就说你不知道，不要试图编造答案。
----------------
上下文：{context}`;

// Due to the refactoring in version 1.5, the variable name {question} needed to be changed to {input} in the prompt template.
export const LEGACY_INPUT_TEMPLATE_KEY = 'question';
export const INPUT_TEMPLATE_KEY = 'input';

export const systemPromptOption: INodeProperties = {
	displayName: '系统提示词模板',
	name: 'systemPromptTemplate',
	type: 'string',
	default: SYSTEM_PROMPT_TEMPLATE,
	typeOptions: {
		rows: 6,
	},
};
