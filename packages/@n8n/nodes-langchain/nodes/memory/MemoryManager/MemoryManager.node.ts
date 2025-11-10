import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { MessageContent, BaseMessage } from '@langchain/core/messages';
import { AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

type MessageRole = 'ai' | 'system' | 'user';
interface MessageRecord {
	type: MessageRole;
	message: string;
	hideFromUI: boolean;
}

export function simplifyMessages(messages: BaseMessage[]): Array<Record<string, MessageContent>> {
	if (messages.length === 0) return [];

	const result: Array<Record<string, MessageContent>> = [];
	let index = 0;

	while (index < messages.length) {
		const currentGroup: Record<string, MessageContent> = {};

		do {
			const message = messages[index];
			const messageType = message.getType();

			if (messageType in currentGroup) {
				break;
			}

			currentGroup[messageType] = message.content;
			index++;
		} while (index < messages.length);

		result.push(currentGroup);
	}

	return result;
}

const prepareOutputSetup = (ctx: IExecuteFunctions, version: number, memory: BaseChatMemory) => {
	if (version === 1) {
		//legacy behavior of insert and delete for version 1
		return async (i: number) => {
			const messages = await memory.chatHistory.getMessages();

			const serializedMessages = messages?.map((message) => message.toJSON()) ?? [];

			const executionData = ctx.helpers.constructExecutionMetaData(
				ctx.helpers.returnJsonArray(serializedMessages as unknown as IDataObject[]),
				{ itemData: { item: i } },
			);

			return executionData;
		};
	}
	return async (i: number) => {
		return [
			{
				json: { success: true },
				pairedItem: { item: i },
			},
		];
	};
};

export class MemoryManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: '聊天记忆管理器',
		name: 'memoryManager',
		icon: 'fa:database',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: '管理聊天消息记忆并在工作流中使用',
		defaults: {
			name: '聊天记忆管理器',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Miscellaneous', 'Root Nodes'],
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
			{
				displayName: '',
				type: NodeConnectionTypes.Main,
			},
			{
				displayName: '记忆',
				type: NodeConnectionTypes.AiMemory,
				required: true,
				maxConnections: 1,
			},
		],

		outputs: [
			{
				displayName: '',
				type: NodeConnectionTypes.Main,
			},
		],
		properties: [
			{
				displayName: '操作模式',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				default: 'load',
				options: [
					{
						name: '获取多条消息',
						description: '从已连接的记忆中检索聊天消息',
						value: 'load',
					},
					{
						name: '插入消息',
						description: '将聊天消息插入已连接的记忆',
						value: 'insert',
					},
					{
						name: '删除消息',
						description: '从已连接的记忆中删除聊天消息',
						value: 'delete',
					},
				],
			},
			{
				displayName: '插入模式',
				name: 'insertMode',
				type: 'options',
				description: '选择如何将新消息插入记忆',
				noDataExpression: true,
				default: 'insert',
				options: [
					{
						name: '插入消息',
						value: 'insert',
						description: '在现有消息旁添加消息',
					},
					{
						name: '覆盖所有消息',
						value: 'override',
						description: '用新消息替换当前记忆',
					},
				],
				displayOptions: {
					show: {
						mode: ['insert'],
					},
				},
			},
			{
				displayName: '删除模式',
				name: 'deleteMode',
				type: 'options',
				description: '如何从记忆中删除消息',
				noDataExpression: true,
				default: 'lastN',
				options: [
					{
						name: '最后 N 条',
						value: 'lastN',
						description: '删除最后 N 条消息',
					},
					{
						name: '所有消息',
						value: 'all',
						description: '清除记忆中的所有消息',
					},
				],
				displayOptions: {
					show: {
						mode: ['delete'],
					},
				},
			},
			{
				displayName: '聊天消息',
				name: 'messages',
				description: '要插入记忆的聊天消息',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: '添加消息',
				options: [
					{
						name: 'messageValues',
						displayName: '消息',
						values: [
							{
								displayName: '类型名称或 ID',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'AI',
										value: 'ai',
									},
									{
										name: '系统',
										value: 'system',
									},
									{
										name: '用户',
										value: 'user',
									},
								],
								default: 'system',
							},
							{
								displayName: '消息',
								name: 'message',
								type: 'string',
								required: true,
								default: '',
							},
							{
								displayName: '在聊天中隐藏消息',
								name: 'hideFromUI',
								type: 'boolean',
								required: true,
								default: false,
								description: '是否从聊天 UI 中隐藏该消息',
							},
						],
					},
				],
				displayOptions: {
					show: {
						mode: ['insert'],
					},
				},
			},
			{
				displayName: '消息数量',
				name: 'lastMessagesCount',
				type: 'number',
				description: '要删除的最后消息数量',
				default: 2,
				displayOptions: {
					show: {
						mode: ['delete'],
						deleteMode: ['lastN'],
					},
				},
			},
			{
				displayName: '简化输出',
				name: 'simplifyOutput',
				type: 'boolean',
				description: '是否将输出简化为仅包含发送者和文本',
				default: true,
				displayOptions: {
					show: {
						mode: ['load'],
					},
				},
			},
			{
				displayName: '选项',
				name: 'options',
				placeholder: '添加选项',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: '分组消息',
						name: 'groupMessages',
						type: 'boolean',
						default: true,
						description: '是否将消息分组到单个项目中，或将每条消息作为单独的项目返回',
					},
				],
				displayOptions: {
					show: {
						mode: ['load'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const nodeVersion = this.getNode().typeVersion;
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0, 'load') as 'load' | 'insert' | 'delete';
		const memory = (await this.getInputConnectionData(
			NodeConnectionTypes.AiMemory,
			0,
		)) as BaseChatMemory;

		const prepareOutput = prepareOutputSetup(this, nodeVersion, memory);

		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const messages = await memory.chatHistory.getMessages();

			if (mode === 'delete') {
				const deleteMode = this.getNodeParameter('deleteMode', i) as 'lastN' | 'all';

				if (deleteMode === 'lastN') {
					const lastMessagesCount = this.getNodeParameter('lastMessagesCount', i) as number;
					if (messages.length >= lastMessagesCount) {
						const newMessages = messages.slice(0, messages.length - lastMessagesCount);

						await memory.chatHistory.clear();
						for (const message of newMessages) {
							await memory.chatHistory.addMessage(message);
						}
					}
				} else {
					await memory.chatHistory.clear();
				}

				returnData.push(...(await prepareOutput(i)));
			}

			if (mode === 'insert') {
				const insertMode = this.getNodeParameter('insertMode', i) as 'insert' | 'override';
				const messagesToInsert = this.getNodeParameter(
					'messages.messageValues',
					i,
					[],
				) as MessageRecord[];

				const templateMapper = {
					ai: AIMessage,
					system: SystemMessage,
					user: HumanMessage,
				};

				if (insertMode === 'override') {
					await memory.chatHistory.clear();
				}

				for (const message of messagesToInsert) {
					const MessageClass = new templateMapper[message.type](message.message);

					if (message.hideFromUI) {
						MessageClass.additional_kwargs.hideFromUI = true;
					}

					await memory.chatHistory.addMessage(MessageClass);
				}

				returnData.push(...(await prepareOutput(i)));
			}

			if (mode === 'load') {
				const simplifyOutput = this.getNodeParameter('simplifyOutput', i, false) as boolean;
				const options = this.getNodeParameter('options', i);

				//Load mode, legacy behavior for version 1, buggy - outputs only for single input item
				if (simplifyOutput && messages.length && nodeVersion === 1) {
					const groupMessages = options.groupMessages as boolean;
					const output = simplifyMessages(messages);

					return [
						this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(
								groupMessages ? [{ messages: output, messagesCount: output.length }] : output,
							),
							{ itemData: { item: i } },
						),
					];
				}

				let groupMessages = true;
				//disable grouping if explicitly set to false
				if (options.groupMessages === false) {
					groupMessages = false;
				}
				//disable grouping if not set and node version is 1 (legacy behavior)
				if (options.groupMessages === undefined && nodeVersion === 1) {
					groupMessages = false;
				}

				let output: IDataObject[] =
					(simplifyOutput
						? simplifyMessages(messages)
						: (messages?.map((message) => message.toJSON()) as unknown as IDataObject[])) ?? [];

				if (groupMessages) {
					output = [{ messages: output, messagesCount: output.length }];
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(output),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
		}

		return [returnData];
	}
}
