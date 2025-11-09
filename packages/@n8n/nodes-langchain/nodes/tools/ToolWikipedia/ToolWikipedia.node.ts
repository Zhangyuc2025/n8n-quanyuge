import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run';
import {
	type IExecuteFunctions,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type INodeExecutionData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

function getTool(ctx: ISupplyDataFunctions | IExecuteFunctions): WikipediaQueryRun {
	const WikiTool = new WikipediaQueryRun();
	WikiTool.name = ctx.getNode().name;
	WikiTool.description = '用于与 Wikipedia API 交互并从中获取数据的工具。输入应始终是字符串查询。';
	return WikiTool;
}

export class ToolWikipedia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wikipedia',
		name: 'toolWikipedia',
		icon: 'file:wikipedia.svg',
		group: ['transform'],
		version: 1,
		description: '在 Wikipedia 中搜索',
		defaults: {
			name: 'Wikipedia',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolwikipedia/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['工具'],
		properties: [getConnectionHintNoticeField([NodeConnectionTypes.AiAgent])],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(getTool(this), this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const WikiTool = getTool(this);

		const items = this.getInputData();

		const response: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < this.getInputData().length; itemIndex++) {
			const item = items[itemIndex];
			if (item === undefined) {
				continue;
			}
			const result = await WikiTool.invoke(item.json);
			response.push({
				json: { response: result },
				pairedItem: { item: itemIndex },
			});
		}

		return [response];
	}
}
