import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { JSONSchema7 } from 'json-schema';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { jsonParse, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';
import type { z } from 'zod';

import {
	buildJsonSchemaExampleNotice,
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '@utils/descriptions';
import { convertJsonSchemaToZod, generateSchemaFromExample } from '@utils/schemaParsing';
import { getBatchingOptionFields } from '@utils/sharedFields';

import { SYSTEM_PROMPT_TEMPLATE } from './constants';
import { makeZodSchemaFromAttributes } from './helpers';
import { processItem } from './processItem';
import type { AttributeDefinition } from './types';

export class InformationExtractor implements INodeType {
	description: INodeTypeDescription = {
		displayName: '信息提取器',
		name: 'informationExtractor',
		icon: 'fa:project-diagram',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		defaultVersion: 1.2,
		description: '以结构化格式从文本中提取信息',
		codex: {
			alias: ['NER', 'parse', 'parsing', 'JSON', 'data extraction', 'structured'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.information-extractor/',
					},
				],
			},
		},
		defaults: {
			name: '信息提取器',
		},
		inputs: [
			{ displayName: '', type: NodeConnectionTypes.Main },
			{
				displayName: '模型',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '文本',
				name: 'text',
				type: 'string',
				default: '',
				description: '要从中提取信息的文本',
				typeOptions: {
					rows: 2,
				},
			},
			{
				...schemaTypeField,
				description: '如何指定所需输出的模式',
				options: [
					{
						name: '从属性描述',
						value: 'fromAttributes',
						description: '根据类型和描述从文本中提取特定属性',
					} as INodePropertyOptions,
					...(schemaTypeField.options as INodePropertyOptions[]),
				],
				default: 'fromAttributes',
			},
			{
				...jsonSchemaExampleField,
				default: `{
	"state": "California",
	"cities": ["Los Angeles", "San Francisco", "San Diego"]
}`,
			},
			buildJsonSchemaExampleNotice({
				showExtraProps: {
					'@version': [{ _cnd: { gte: 1.2 } }],
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
				displayName: '属性',
				name: 'attributes',
				placeholder: '添加属性',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						schemaType: ['fromAttributes'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attributes',
						displayName: '属性列表',
						values: [
							{
								displayName: '名称',
								name: 'name',
								type: 'string',
								default: '',
								description: '要提取的属性',
								placeholder: '例如：company_name',
								required: true,
							},
							{
								displayName: '类型',
								name: 'type',
								type: 'options',
								description: '属性的数据类型',
								required: true,
								options: [
									{
										name: '布尔值',
										value: 'boolean',
									},
									{
										name: '日期',
										value: 'date',
									},
									{
										name: '数字',
										value: 'number',
									},
									{
										name: '字符串',
										value: 'string',
									},
								],
								default: 'string',
							},
							{
								displayName: '描述',
								name: 'description',
								type: 'string',
								default: '',
								description: '描述您的属性',
								placeholder: '为属性添加描述',
								required: true,
							},
							{
								displayName: '必需',
								name: 'required',
								type: 'boolean',
								default: false,
								description: '属性是否必需',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: '添加选项',
				options: [
					{
						displayName: '系统提示词模板',
						name: 'systemPromptTemplate',
						type: 'string',
						default: SYSTEM_PROMPT_TEMPLATE,
						description: '直接用作系统提示词模板的字符串',
						typeOptions: {
							rows: 6,
						},
					},
					getBatchingOptionFields({
						show: {
							'@version': [{ _cnd: { gte: 1.1 } }],
						},
					}),
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const llm = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const schemaType = this.getNodeParameter('schemaType', 0, '') as
			| 'fromAttributes'
			| 'fromJson'
			| 'manual';

		let parser: OutputFixingParser<object>;

		if (schemaType === 'fromAttributes') {
			const attributes = this.getNodeParameter(
				'attributes.attributes',
				0,
				[],
			) as AttributeDefinition[];

			if (attributes.length === 0) {
				throw new NodeOperationError(this.getNode(), 'At least one attribute must be specified');
			}

			parser = OutputFixingParser.fromLLM(
				llm,
				StructuredOutputParser.fromZodSchema(makeZodSchemaFromAttributes(attributes)),
			);
		} else {
			let jsonSchema: JSONSchema7;

			if (schemaType === 'fromJson') {
				const jsonExample = this.getNodeParameter('jsonSchemaExample', 0, '') as string;
				// Enforce all fields to be required in the generated schema if the node version is 1.2 or higher
				const jsonExampleAllFieldsRequired = this.getNode().typeVersion >= 1.2;

				jsonSchema = generateSchemaFromExample(jsonExample, jsonExampleAllFieldsRequired);
			} else {
				const inputSchema = this.getNodeParameter('inputSchema', 0, '') as string;
				jsonSchema = jsonParse<JSONSchema7>(inputSchema);
			}

			const zodSchema = convertJsonSchemaToZod<z.ZodSchema<object>>(jsonSchema);

			parser = OutputFixingParser.fromLLM(llm, StructuredOutputParser.fromZodSchema(zodSchema));
		}

		const resultData: INodeExecutionData[] = [];
		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;
		if (this.getNode().typeVersion >= 1.1 && batchSize >= 1) {
			// Batch processing
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					const itemIndex = i + batchItemIndex;
					return await processItem(this, itemIndex, llm, parser);
				});

				const batchResults = await Promise.allSettled(batchPromises);

				batchResults.forEach((response, index) => {
					if (response.status === 'rejected') {
						const error = response.reason as Error;
						if (this.continueOnFail()) {
							resultData.push({
								json: { error: error.message },
								pairedItem: { item: i + index },
							});
							return;
						} else {
							throw new NodeOperationError(this.getNode(), error.message);
						}
					}
					const output = response.value;
					resultData.push({ json: { output } });
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			// Sequential processing
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const output = await processItem(this, itemIndex, llm, parser);
					resultData.push({ json: { output } });
				} catch (error) {
					if (this.continueOnFail()) {
						resultData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
						continue;
					}

					throw error;
				}
			}
		}

		return [resultData];
	}
}
