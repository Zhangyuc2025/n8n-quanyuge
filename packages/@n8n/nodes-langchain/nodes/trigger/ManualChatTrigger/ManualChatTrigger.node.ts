import {
	type ITriggerFunctions,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerResponse,
	NodeConnectionTypes,
} from 'n8n-workflow';

export class ManualChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '手动聊天触发器',
		name: 'manualChatTrigger',
		icon: 'fa:comments',
		group: ['trigger'],
		version: [1, 1.1],
		description: '在新的手动聊天消息时运行工作流',
		eventTriggerDescription: '',
		maxNodes: 1,
		hidden: true,
		defaults: {
			name: '收到聊天消息时',
			color: '#909298',
		},
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/',
					},
				],
			},
			subcategories: {
				'Core Nodes': ['Other Trigger Nodes'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '此节点是手动聊天工作流执行的起始位置。要创建一个，请返回画布并点击"聊天"',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: '聊天并执行工作流',
				name: 'openChat',
				type: 'button',
				typeOptions: {
					buttonConfig: {
						action: 'openChat',
					},
				},
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
