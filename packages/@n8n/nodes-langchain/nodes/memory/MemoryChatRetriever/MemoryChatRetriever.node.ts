import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseMessage } from '@langchain/core/messages';
import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

function simplifyMessages(messages: BaseMessage[]) {
	const chunkedMessages = [];
	for (let i = 0; i < messages.length; i += 2) {
		chunkedMessages.push([messages[i], messages[i + 1]]);
	}

	const transformedMessages = chunkedMessages.map((exchange) => {
		const simplified = {
			[exchange[0]._getType()]: exchange[0].content,
		};

		if (exchange[1]) {
			simplified[exchange[1]._getType()] = exchange[1].content;
		}

		return {
			json: simplified,
		};
	});
	return transformedMessages;
}

// This node is deprecated. Use MemoryManager instead.
export class MemoryChatRetriever implements INodeType {
	description: INodeTypeDescription = {
		displayName: '聊天消息检索器',
		name: 'memoryChatRetriever',
		icon: 'fa:database',
		iconColor: 'black',
		group: ['transform'],
		hidden: true,
		version: 1,
		description: '从记忆中检索聊天消息并在工作流中使用',
		defaults: {
			name: '聊天消息检索器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Miscellaneous'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymanager/',
					},
				],
			},
		},

		inputs: [
			NodeConnectionTypes.Main,
			{
				displayName: '记忆',
				maxConnections: 1,
				type: NodeConnectionTypes.AiMemory,
				required: true,
			},
		],

		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '此节点已弃用。请改用"聊天记忆管理器"节点。',
				type: 'notice',
				default: '',
				name: 'deprecatedNotice',
			},
			{
				displayName: '简化输出',
				name: 'simplifyOutput',
				type: 'boolean',
				description: '是否将输出简化为仅包含发送者和文本',
				default: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Chat Memory Retriever');

		const memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
			| BaseChatMemory
			| undefined;
		const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;

		const messages = await memory?.chatHistory.getMessages();

		if (simplifyOutput && messages) {
			return [simplifyMessages(messages)];
		}

		const serializedMessages =
			messages?.map((message) => {
				const serializedMessage = message.toJSON();
				return { json: serializedMessage as unknown as IDataObject };
			}) ?? [];

		return [serializedMessages];
	}
}
