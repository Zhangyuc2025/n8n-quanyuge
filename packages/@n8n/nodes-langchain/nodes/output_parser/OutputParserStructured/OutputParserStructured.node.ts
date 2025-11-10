import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import type { JSONSchema7 } from 'json-schema';
import {
	jsonParse,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeOperationError,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { z } from 'zod';

import {
	buildJsonSchemaExampleNotice,
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '@utils/descriptions';
import {
	N8nOutputFixingParser,
	N8nStructuredOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { convertJsonSchemaToZod, generateSchemaFromExample } from '@utils/schemaParsing';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { NAIVE_FIX_PROMPT } from './prompt';

export class OutputParserStructured implements INodeType {
	description: INodeTypeDescription = {
		displayName: '结构化输出解析器',
		name: 'outputParserStructured',
		icon: 'fa:code',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		defaultVersion: 1.3,
		description: '以定义的 JSON 格式返回数据',
		defaults: {
			name: '结构化输出解析器',
		},

		codex: {
			alias: ['json', 'zod'],
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured/',
					},
				],
			},
		},
		inputs: `={{
			((parameters) => {
				if (parameters?.autoFix) {
					return [
						{ displayName: '模型', maxConnections: 1, type: "${NodeConnectionTypes.AiLanguageModel}", required: true }
					];
				}

				return [];
			})($parameter)
		}}`,

		outputs: [NodeConnectionTypes.AiOutputParser],
		outputNames: ['输出解析器'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{ ...schemaTypeField, displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } } },
			{
				...jsonSchemaExampleField,
				default: `{
	"state": "California",
	"cities": ["Los Angeles", "San Francisco", "San Diego"]
}`,
			},
			buildJsonSchemaExampleNotice({
				showExtraProps: {
					'@version': [{ _cnd: { gte: 1.3 } }],
				},
			}),
			{
				...inputSchemaField,
				default: `{
	"type": "object",
	"properties": {
		"state": {
			"type": "string"
		},
		"cities": {
			"type": "array",
			"items": {
				"type": "string"
			}
		}
	}
}`,
			},
			{
				displayName: 'JSON 架构',
				name: 'jsonSchema',
				type: 'json',
				description: '用于结构化和验证输出的 JSON 架构',
				default: `{
  "type": "object",
  "properties": {
    "state": {
      "type": "string"
    },
    "cities": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}`,
				typeOptions: {
					rows: 10,
				},
				required: true,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lte: 1.1 } }],
					},
				},
			},
			{
				displayName: '自动修复格式',
				description: '当输出格式不正确时是否自动修复。这将导致额外的 LLM 调用。',
				name: 'autoFix',
				type: 'boolean',
				default: false,
			},
			{
				displayName: '自定义重试提示词',
				name: 'customizeRetryPrompt',
				type: 'boolean',
				displayOptions: {
					show: {
						autoFix: [true],
					},
				},
				default: false,
				description: '是否自定义用于重试输出解析的提示词。如果禁用，将使用默认提示词。',
			},
			{
				displayName: '自定义提示词',
				name: 'prompt',
				type: 'string',
				displayOptions: {
					show: {
						autoFix: [true],
						customizeRetryPrompt: [true],
					},
				},
				default: NAIVE_FIX_PROMPT,
				typeOptions: {
					rows: 10,
				},
				hint: '应包含 "{error}"、"{instructions}" 和 "{completion}" 占位符',
				description:
					'用于修复输出的提示词模板。使用占位符："{instructions}" 表示解析规则，"{completion}" 表示失败的尝试，"{error}" 表示验证错误消息。',
			},
		],
		hints: [
			{
				message: '使用 $refs 的字段可能具有错误的类型，因为目前不支持此语法',
				type: 'warning',
				location: 'outputPane',
				whenToDisplay: 'afterExecution',
				displayCondition:
					'={{ $parameter["schemaType"] === "manual" && $parameter["inputSchema"]?.includes("$ref") }}',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const schemaType = this.getNodeParameter('schemaType', itemIndex, '') as 'fromJson' | 'manual';
		// We initialize these even though one of them will always be empty
		// it makes it easer to navigate the ternary operator
		const jsonExample = this.getNodeParameter('jsonSchemaExample', itemIndex, '') as string;

		let inputSchema: string;

		// Enforce all fields to be required in the generated schema if the node version is 1.3 or higher
		const jsonExampleAllFieldsRequired = this.getNode().typeVersion >= 1.3;

		if (this.getNode().typeVersion <= 1.1) {
			inputSchema = this.getNodeParameter('jsonSchema', itemIndex, '') as string;
		} else {
			inputSchema = this.getNodeParameter('inputSchema', itemIndex, '') as string;
		}

		const jsonSchema =
			schemaType === 'fromJson'
				? generateSchemaFromExample(jsonExample, jsonExampleAllFieldsRequired)
				: jsonParse<JSONSchema7>(inputSchema);

		const zodSchema = convertJsonSchemaToZod<z.ZodSchema<object>>(jsonSchema);
		const nodeVersion = this.getNode().typeVersion;

		const autoFix = this.getNodeParameter('autoFix', itemIndex, false) as boolean;

		let outputParser;
		try {
			outputParser = await N8nStructuredOutputParser.fromZodJsonSchema(
				zodSchema,
				nodeVersion,
				this,
			);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), '解析 JSON 架构时出错。请检查架构并重试。');
		}

		if (!autoFix) {
			return {
				response: outputParser,
			};
		}

		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;

		const prompt = this.getNodeParameter('prompt', itemIndex, NAIVE_FIX_PROMPT) as string;

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
