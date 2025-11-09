import { Tool, StructuredTool } from '@langchain/core/tools';
import type { Toolkit } from 'langchain/agents';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { executeTool } from './utils/executeTool';

export class ToolExecutor implements INodeType {
	description: INodeTypeDescription = {
		displayName: '工具执行器',
		name: 'toolExecutor',
		version: 1,
		defaults: {
			name: '工具执行器',
		},
		hidden: true,
		inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.AiTool],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '查询',
				name: 'query',
				type: 'json',
				default: '{}',
				description: '以 JSON 或字符串形式传递给工具的参数',
			},
			{
				displayName: '工具名称',
				name: 'toolName',
				type: 'string',
				default: '',
				description: '如果连接的工具是工具包，则为要执行的工具名称',
			},
		],
		group: ['transform'],
		description: '在没有 AI 智能体的情况下执行工具的节点',
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const query = this.getNodeParameter('query', 0, {}) as string | object;
		const toolName = this.getNodeParameter('toolName', 0, '') as string;

		let parsedQuery: string | object;

		try {
			parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;
		} catch (error) {
			parsedQuery = query;
		}

		const resultData: INodeExecutionData[] = [];
		const toolInputs = await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0);

		if (!toolInputs || !Array.isArray(toolInputs)) {
			throw new NodeOperationError(this.getNode(), '未找到工具输入');
		}

		try {
			for (const tool of toolInputs) {
				// Handle toolkits
				if (tool && typeof (tool as Toolkit).getTools === 'function') {
					const toolsInToolkit = (tool as Toolkit).getTools();
					for (const toolkitTool of toolsInToolkit) {
						if (toolkitTool instanceof Tool || toolkitTool instanceof StructuredTool) {
							if (toolName === toolkitTool.name) {
								const result = await executeTool(toolkitTool, parsedQuery);
								resultData.push(result);
							}
						}
					}
				} else {
					// Handle single tool
					if (!toolName || toolName === tool.name) {
						const result = await executeTool(tool, parsedQuery);
						resultData.push(result);
					}
				}
			}
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `执行工具时出错: ${(error as Error).message}`);
		}
		return [resultData];
	}
}
