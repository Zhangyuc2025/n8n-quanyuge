import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { VectorStore } from '@langchain/core/vectorstores';
import { VectorDBQAChain } from 'langchain/chains';
import { VectorStoreQATool } from 'langchain/tools';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, nodeNameToToolName } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

async function getTool(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
): Promise<VectorStoreQATool> {
	const node = ctx.getNode();
	const { typeVersion } = node;
	const name =
		typeVersion <= 1
			? (ctx.getNodeParameter('name', itemIndex) as string)
			: nodeNameToToolName(node);
	const toolDescription = ctx.getNodeParameter('description', itemIndex) as string;
	const topK = ctx.getNodeParameter('topK', itemIndex, 4) as number;
	const description = VectorStoreQATool.getDescription(name, toolDescription);
	const vectorStore = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiVectorStore,
		itemIndex,
	)) as VectorStore;
	const llm = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiLanguageModel,
		itemIndex,
	)) as BaseLanguageModel;

	const vectorStoreTool = new VectorStoreQATool(name, description, {
		llm,
		vectorStore,
	});

	vectorStoreTool.chain = VectorDBQAChain.fromLLM(llm, vectorStore, {
		k: topK,
	});

	return vectorStoreTool;
}

export class ToolVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: '向量存储问答工具',
		name: 'toolVectorStore',
		icon: 'fa:database',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: '使用向量存储回答问题',
		defaults: {
			name: '使用向量存储回答问题',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolvectorstore/',
					},
				],
			},
		},

		inputs: [
			{
				displayName: '向量存储',
				maxConnections: 1,
				type: NodeConnectionTypes.AiVectorStore,
				required: true,
			},
			{
				displayName: '模型',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
		],

		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['工具'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: '数据名称',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: '例如：users_info',
				validateType: 'string-alphanumeric',
				description:
					'向量存储中的数据名称。这将用于填充此工具描述：当您需要回答有关 [名称] 的问题时很有用。每当您需要有关 [数据描述] 的信息时,您应该始终使用此工具。输入应该是一个完整的问题。',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: '数据描述',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: '在此描述您的数据,例如：用户的姓名、电子邮件等',
				description:
					'描述向量存储中的数据。这将用于填充此工具描述：当您需要回答有关 [名称] 的问题时很有用。每当您需要有关 [数据描述] 的信息时,您应该始终使用此工具。输入应该是一个完整的问题。',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: '限制',
				name: 'topK',
				type: 'number',
				default: 4,
				description: '返回的最大结果数',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const vectorStoreTool = await getTool(this, itemIndex);

		return {
			response: logWrapper(vectorStoreTool, this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputData = this.getInputData();
		const result: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < inputData.length; itemIndex++) {
			const tool = await getTool(this, itemIndex);
			const outputData = await tool.invoke(inputData[itemIndex].json);
			result.push({
				json: {
					response: outputData,
				},
				pairedItem: {
					item: itemIndex,
				},
			});
		}

		return [result];
	}
}
