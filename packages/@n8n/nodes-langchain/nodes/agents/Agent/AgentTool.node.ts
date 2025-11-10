import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AgentToolV2 } from './V2/AgentToolV2.node';

export class AgentTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'AI 智能体工具',
			name: 'agentTool',
			icon: 'fa:robot',
			iconColor: 'black',
			group: ['transform'],
			description: '生成行动计划并执行。可以使用外部工具。',
			codex: {
				alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools'],
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Other Tools'],
				},
			},
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			// Should have the same versioning as Agent node
			// because internal agent logic often checks for node version
			2.2: new AgentToolV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
