import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import {
	N8nOutputFixingParser,
	type N8nStructuredOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { NAIVE_FIX_PROMPT } from './prompt';

export class OutputParserAutofixing implements INodeType {
	description: INodeTypeDescription = {
		displayName: '自动修复输出解析器',
		name: 'outputParserAutofixing',
		icon: 'fa:tools',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '已弃用，请使用结构化输出解析器',
		defaults: {
			name: '自动修复输出解析器',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserautofixing/',
					},
				],
			},
		},

		inputs: [
			{
				displayName: '模型',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
			{
				displayName: '输出解析器',
				maxConnections: 1,
				required: true,
				type: NodeConnectionTypes.AiOutputParser,
			},
		],

		outputs: [NodeConnectionTypes.AiOutputParser],
		outputNames: ['输出解析器'],
		properties: [
			{
				displayName: '此节点封装另一个输出解析器。如果第一个解析器失败，它将调用 LLM 来修复格式',
				name: 'info',
				type: 'notice',
				default: '',
			},
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '重试提示词',
						name: 'prompt',
						type: 'string',
						default: NAIVE_FIX_PROMPT,
						typeOptions: {
							rows: 10,
						},
						hint: '应包含 "{error}"、"{instructions}" 和 "{completion}" 占位符',
						description:
							'用于修复输出的提示词模板。使用占位符："{instructions}" 表示解析规则，"{completion}" 表示失败的尝试，"{error}" 表示验证错误消息。',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;
		const outputParser = (await this.getInputConnectionData(
			NodeConnectionTypes.AiOutputParser,
			itemIndex,
		)) as N8nStructuredOutputParser;
		const prompt = this.getNodeParameter('options.prompt', itemIndex, NAIVE_FIX_PROMPT) as string;

		if (prompt.length === 0 || !prompt.includes('{error}')) {
			throw new NodeOperationError(this.getNode(), '自动修复解析器提示词必须包含 {error} 占位符');
		}
		const parser = new N8nOutputFixingParser(
			this,
			model,
			outputParser,
			PromptTemplate.fromTemplate(prompt),
		);

		return {
			response: parser,
		};
	}
}
