import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AgentV1 } from './V1/AgentV1.node';
import { AgentV2 } from './V2/AgentV2.node';
import { AgentV3 } from './V3/AgentV3.node';

export class Agent extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'AI 智能体',
			name: 'agent',
			icon: 'fa:robot',
			iconColor: 'black',
			group: ['transform'],
			description: '生成行动计划并执行。可以使用外部工具。',
			codex: {
				alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools'],
				categories: ['AI'],
				subcategories: {
					AI: ['Agents', 'Root Nodes'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
						},
					],
					// 额外的教学资源（将同步到数据库 documentationConfig）
					tutorialLinks: {
						quickStart: 'https://docs.n8n.io/advanced-ai/intro-tutorial/',
						exampleWorkflow: '/workflows/templates/1954',
					},
				},
			},
			defaultVersion: 3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new AgentV1(baseDescription),
			1.1: new AgentV1(baseDescription),
			1.2: new AgentV1(baseDescription),
			1.3: new AgentV1(baseDescription),
			1.4: new AgentV1(baseDescription),
			1.5: new AgentV1(baseDescription),
			1.6: new AgentV1(baseDescription),
			1.7: new AgentV1(baseDescription),
			1.8: new AgentV1(baseDescription),
			1.9: new AgentV1(baseDescription),
			2: new AgentV2(baseDescription),
			2.1: new AgentV2(baseDescription),
			2.2: new AgentV2(baseDescription),
			3: new AgentV3(baseDescription),
			// IMPORTANT Reminder to update AgentTool
		};

		super(nodeVersions, baseDescription);
	}
}
