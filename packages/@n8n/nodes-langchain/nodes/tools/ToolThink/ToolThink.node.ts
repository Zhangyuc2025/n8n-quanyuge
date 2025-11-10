import { DynamicTool } from 'langchain/tools';
import {
	type IExecuteFunctions,
	NodeConnectionTypes,
	nodeNameToToolName,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type INodeExecutionData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

async function getTool(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
): Promise<DynamicTool> {
	const node = ctx.getNode();
	const { typeVersion } = node;

	const name = typeVersion === 1 ? 'thinking_tool' : nodeNameToToolName(node);
	const description = ctx.getNodeParameter('description', itemIndex) as string;

	return new DynamicTool({
		name,
		description,
		func: async (subject: string) => {
			return subject;
		},
	});
}

// A thinking tool, see https://www.anthropic.com/engineering/claude-think-tool

const defaultToolDescription =
	'使用该工具思考某事。它不会获取新信息或更改数据库，只是将想法附加到日志中。当需要复杂推理或一些缓存记忆时使用它。';

export class ToolThink implements INodeType {
	description: INodeTypeDescription = {
		displayName: '思考工具',
		name: 'toolThink',
		icon: 'fa:brain',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: '邀请 AI 智能体进行思考',
		defaults: {
			name: '思考',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolthink/',
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
				displayName: '思考工具描述',
				name: 'description',
				type: 'string',
				default: defaultToolDescription,
				placeholder: '在此描述您的思考工具,解释它将如何帮助 AI 思考',
				description: '思考工具的描述',
				typeOptions: {
					rows: 3,
				},
				required: true,
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const tool = await getTool(this, itemIndex);

		return {
			response: logWrapper(tool, this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const input = this.getInputData();
		const response: INodeExecutionData[] = [];
		for (let i = 0; i < input.length; i++) {
			const inputItem = input[i];
			const tool = await getTool(this, i);
			const result = await tool.invoke(inputItem.json);
			response.push({
				json: {
					response: result,
				},
				pairedItem: {
					item: i,
				},
			});
		}

		return [response];
	}
}
