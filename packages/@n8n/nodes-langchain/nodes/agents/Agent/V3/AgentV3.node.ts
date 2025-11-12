import {
	promptTypeOptions,
	textFromGuardrailsNode,
	textFromPreviousNode,
	textInput,
} from '@utils/descriptions';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import { toolsAgentProperties } from '../agents/ToolsAgent/V3/description';
import type { RequestResponseMetadata } from '../agents/ToolsAgent/V3/execute';
import { toolsAgentExecute } from '../agents/ToolsAgent/V3/execute';
import { getInputs } from '../utils';

export class AgentV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [3],
			defaults: {
				name: 'AI 智能体',
				color: '#404040',
			},
			inputs: `={{
				((hasOutputParser, needsFallback) => {
					${getInputs.toString()};
					return getInputs(true, hasOutputParser, needsFallback);
				})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true, $parameter.needsFallback !== undefined && $parameter.needsFallback === true)
			}}`,
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					// 注意：链接URL将从数据库 documentationConfig 中读取（可后台管理修改）
					displayName:
						'提示：通过我们的快速<a href="{{tutorialUrl}}" target="_blank">教程</a>了解智能体，或查看此节点的<a href="{{exampleUrl}}" target="_blank">示例</a>',
					name: 'aiAgentStarterCallout',
					type: 'callout',
					default: '',
					// 默认链接（如果数据库中没有配置，则使用这些）：
					// tutorialUrl: 'https://docs.n8n.io/advanced-ai/intro-tutorial/'
					// exampleUrl: '/workflows/templates/1954'
				},
				promptTypeOptions,
				{
					...textFromGuardrailsNode,
					displayOptions: {
						show: {
							promptType: ['guardrails'],
						},
					},
				},
				{
					...textFromPreviousNode,
					displayOptions: {
						show: {
							promptType: ['auto'],
						},
					},
				},
				{
					...textInput,
					displayOptions: {
						show: {
							promptType: ['define'],
						},
					},
				},
				{
					displayName: '要求特定输出格式',
					name: 'hasOutputParser',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				},
				{
					displayName: `在画布上连接一个<a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>输出解析器</a>以指定所需的输出格式`,
					name: 'notice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							hasOutputParser: [true],
						},
					},
				},
				{
					displayName: '启用备用模型',
					name: 'needsFallback',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				},
				{
					displayName: '在画布上连接一个额外的语言模型，当主模型失败时作为备用',
					name: 'fallbackNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							needsFallback: [true],
						},
					},
				},
				toolsAgentProperties,
			],
			hints: [
				{
					message: '您正在使用流式响应。请确保在连接的触发器节点上将响应模式设置为"流式响应"。',
					type: 'warning',
					location: 'outputPane',
					whenToDisplay: 'afterExecution',
					displayCondition: '={{ $parameter["enableStreaming"] === true }}',
				},
			],
		};
	}

	async execute(
		this: IExecuteFunctions,
		response?: EngineResponse<RequestResponseMetadata>,
	): Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>> {
		return await toolsAgentExecute.call(this, response);
	}
}
