import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { JsTaskRunnerSandbox } from 'n8n-nodes-base/dist/nodes/Code/JsTaskRunnerSandbox';
import { PythonSandbox } from 'n8n-nodes-base/dist/nodes/Code/PythonSandbox';
import type { Sandbox } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { getSandboxContext } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import type {
	ExecutionError,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import {
	jsonParse,
	NodeConnectionTypes,
	nodeNameToToolName,
	NodeOperationError,
} from 'n8n-workflow';

import {
	buildInputSchemaField,
	buildJsonSchemaExampleField,
	buildJsonSchemaExampleNotice,
	schemaTypeField,
} from '@utils/descriptions';
import { convertJsonSchemaToZod, generateSchemaFromExample } from '@utils/schemaParsing';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import type { DynamicZodObject } from '../../../types/zod.types';

const jsonSchemaExampleField = buildJsonSchemaExampleField({
	showExtraProps: { specifyInputSchema: [true] },
});

const jsonSchemaExampleNotice = buildJsonSchemaExampleNotice({
	showExtraProps: {
		specifyInputSchema: [true],
		'@version': [{ _cnd: { gte: 1.3 } }],
	},
});

const jsonSchemaField = buildInputSchemaField({ showExtraProps: { specifyInputSchema: [true] } });

function getTool(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
	log: boolean = true,
) {
	const node = ctx.getNode();
	const workflowMode = ctx.getMode();

	const runnersConfig = Container.get(TaskRunnersConfig);
	const isRunnerEnabled = runnersConfig.enabled;

	const { typeVersion } = node;
	const name =
		typeVersion <= 1.1
			? (ctx.getNodeParameter('name', itemIndex) as string)
			: nodeNameToToolName(node);

	const description = ctx.getNodeParameter('description', itemIndex) as string;

	const useSchema = ctx.getNodeParameter('specifyInputSchema', itemIndex) as boolean;

	const language = ctx.getNodeParameter('language', itemIndex) as string;
	let code = '';
	if (language === 'javaScript') {
		code = ctx.getNodeParameter('jsCode', itemIndex) as string;
	} else {
		code = ctx.getNodeParameter('pythonCode', itemIndex) as string;
	}

	// @deprecated - TODO: Remove this after a new python runner is implemented
	const getSandbox = (query: string | IDataObject, index = 0) => {
		const context = getSandboxContext.call(ctx, index);
		context.query = query;

		let sandbox: Sandbox;
		if (language === 'javaScript') {
			sandbox = new JavaScriptSandbox(context, code, ctx.helpers);
		} else {
			sandbox = new PythonSandbox(context, code, ctx.helpers);
		}

		sandbox.on(
			'output',
			workflowMode === 'manual'
				? ctx.sendMessageToUI.bind(ctx)
				: (...args: unknown[]) =>
						console.log(`[Workflow "${ctx.getWorkflow().id}"][Node "${node.name}"]`, ...args),
		);
		return sandbox;
	};

	const runFunction = async (query: string | IDataObject): Promise<unknown> => {
		if (language === 'javaScript' && isRunnerEnabled) {
			const sandbox = new JsTaskRunnerSandbox(
				code,
				'runOnceForAllItems',
				workflowMode,
				ctx,
				undefined,
				{
					query,
				},
			);
			const executionData = await sandbox.runCodeForTool();
			return executionData;
		} else {
			// use old vm2-based sandbox for python or when without runner enabled
			const sandbox = getSandbox(query, itemIndex);
			return await sandbox.runCode<string>();
		}
	};

	const toolHandler = async (query: string | IDataObject): Promise<string> => {
		const { index } = log
			? ctx.addInputData(NodeConnectionTypes.AiTool, [[{ json: { query } }]])
			: { index: 0 };

		let response: any = '';
		let executionError: ExecutionError | undefined;
		try {
			response = await runFunction(query);
		} catch (error: unknown) {
			executionError = new NodeOperationError(ctx.getNode(), error as ExecutionError);
			response = `发生错误: "${executionError.message}"`;
		}

		if (typeof response === 'number') {
			response = (response as number).toString();
		}

		if (typeof response !== 'string') {
			// TODO: Do some more testing. Issues here should actually fail the workflow
			executionError = new NodeOperationError(ctx.getNode(), '返回了错误的输出类型', {
				description: `响应属性应该是字符串，但它是 ${typeof response}`,
			});
			response = `发生错误: "${executionError.message}"`;
		}

		if (executionError && log) {
			void ctx.addOutputData(NodeConnectionTypes.AiTool, index, executionError);
		} else if (log) {
			void ctx.addOutputData(NodeConnectionTypes.AiTool, index, [[{ json: { response } }]]);
		}

		return response;
	};

	const commonToolOptions = {
		name,
		description,
		func: toolHandler,
	};

	let tool: DynamicTool | DynamicStructuredTool | undefined = undefined;

	if (useSchema) {
		try {
			// We initialize these even though one of them will always be empty
			// it makes it easier to navigate the ternary operator
			const jsonExample = ctx.getNodeParameter('jsonSchemaExample', itemIndex, '') as string;
			const inputSchema = ctx.getNodeParameter('inputSchema', itemIndex, '') as string;

			const schemaType = ctx.getNodeParameter('schemaType', itemIndex) as 'fromJson' | 'manual';

			const jsonSchema =
				schemaType === 'fromJson'
					? generateSchemaFromExample(jsonExample, ctx.getNode().typeVersion >= 1.3)
					: jsonParse<JSONSchema7>(inputSchema);

			const zodSchema = convertJsonSchemaToZod<DynamicZodObject>(jsonSchema);

			tool = new DynamicStructuredTool({
				schema: zodSchema,
				...commonToolOptions,
			});
		} catch (error) {
			throw new NodeOperationError(ctx.getNode(), '解析 JSON 架构时出错。\n ' + error);
		}
	} else {
		tool = new DynamicTool(commonToolOptions);
	}

	return tool;
}

export class ToolCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: '代码工具',
		name: 'toolCode',
		icon: 'fa:code',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: '用 JS 或 Python 编写工具',
		defaults: {
			name: '代码工具',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['工具'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'在<a href="/templates/1963" target="_blank">这里</a>查看使用 JavaScript 编写自定义工具的对话智能体示例。',
				name: 'noticeTemplateExample',
				type: 'notice',
				default: '',
			},
			{
				displayName: '名称',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'My_Tool',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: '名称',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: '例如：My_Tool',
				validateType: 'string-alphanumeric',
				description: '要调用的函数名称，只能包含字母、数字和下划线',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				displayName: '描述',
				name: 'description',
				type: 'string',
				default: '',
				placeholder:
					'调用此工具获取随机颜色。输入应该是一个字符串，包含要排除的颜色名称，用逗号分隔。',
				typeOptions: {
					rows: 3,
				},
			},

			{
				displayName: '语言',
				name: 'language',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'JavaScript',
						value: 'javaScript',
					},
					{
						name: 'Python (Beta)',
						value: 'python',
					},
				],
				default: 'javaScript',
			},
			{
				displayName: 'JavaScript',
				name: 'jsCode',
				type: 'string',
				displayOptions: {
					show: {
						language: ['javaScript'],
					},
				},
				typeOptions: {
					editor: 'jsEditor',
				},
				default: '// 示例：将传入的查询转换为大写并返回\nreturn query.toUpperCase()',
				// TODO: Add proper text here later
				hint: '您可以通过输入属性 "query" 访问工具接收的输入。返回值应该是单个字符串。',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: '例如：将任何文本转换为大写',
				noDataExpression: true,
			},
			{
				displayName: 'Python',
				name: 'pythonCode',
				type: 'string',
				displayOptions: {
					show: {
						language: ['python'],
					},
				},
				typeOptions: {
					editor: 'codeNodeEditor', // TODO: create a separate `pythonEditor` component
					editorLanguage: 'python',
				},
				default: '# 示例：将传入的查询转换为大写并返回\nreturn query.upper()',
				// TODO: Add proper text here later
				hint: '您可以通过输入属性 "query" 访问工具接收的输入。返回值应该是单个字符串。',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: '例如：将任何文本转换为大写',
				noDataExpression: true,
			},
			{
				displayName: '指定输入架构',
				name: 'specifyInputSchema',
				type: 'boolean',
				description: '是否为函数指定架构。这将要求 LLM 以正确的格式提供输入，并根据架构进行验证。',
				noDataExpression: true,
				default: false,
			},
			{ ...schemaTypeField, displayOptions: { show: { specifyInputSchema: [true] } } },
			jsonSchemaExampleField,
			jsonSchemaExampleNotice,
			jsonSchemaField,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		return {
			response: getTool(this, itemIndex),
		};
	}
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const result: INodeExecutionData[] = [];
		const input = this.getInputData();
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const tool = getTool(this, i, false);
			result.push({
				json: {
					response: await tool.invoke(item.json),
				},
				pairedItem: {
					item: i,
				},
			});
		}

		return [result];
	}
}
