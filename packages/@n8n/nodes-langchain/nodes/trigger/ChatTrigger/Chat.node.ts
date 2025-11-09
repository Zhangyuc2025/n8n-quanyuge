/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { BaseChatMemory } from 'langchain/memory';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_WAIT_USER_REPLY,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	INodeProperties,
} from 'n8n-workflow';

import { configureInputs, configureWaitTillDate } from './util';

const limitWaitTimeProperties: INodeProperties[] = [
	{
		displayName: '限制类型',
		name: 'limitType',
		type: 'options',
		default: 'afterTimeInterval',
		description: '设置执行恢复的条件。可以是指定日期或一段时间后',
		options: [
			{
				name: '时间间隔后',
				description: '等待一定的时间',
				value: 'afterTimeInterval',
			},
			{
				name: '在指定时间',
				description: '等待到设定的日期和时间后继续',
				value: 'atSpecifiedTime',
			},
		],
	},
	{
		displayName: '数量',
		name: 'resumeAmount',
		type: 'number',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
			},
		},
		typeOptions: {
			minValue: 0,
			numberPrecision: 2,
		},
		default: 1,
		description: '等待的时间',
	},
	{
		displayName: '单位',
		name: 'resumeUnit',
		type: 'options',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
			},
		},
		options: [
			{
				name: '分钟',
				value: 'minutes',
			},
			{
				name: '小时',
				value: 'hours',
			},
			{
				name: '天',
				value: 'days',
			},
		],
		default: 'hours',
		description: '时间间隔的单位',
	},
	{
		displayName: '最大日期和时间',
		name: 'maxDateAndTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				limitType: ['atSpecifiedTime'],
			},
		},
		default: '',
		description: '在指定的日期和时间后继续执行',
	},
];

const limitWaitTimeOption: INodeProperties = {
	displayName: '限制等待时间',
	name: 'limitWaitTime',
	type: 'fixedCollection',
	description: '是否限制此节点在执行恢复前等待用户响应的时间',
	default: { values: { limitType: 'afterTimeInterval', resumeAmount: 45, resumeUnit: 'minutes' } },
	options: [
		{
			displayName: '值',
			name: 'values',
			values: limitWaitTimeProperties,
		},
	],
	displayOptions: {
		show: {
			[`/${CHAT_WAIT_USER_REPLY}`]: [true],
		},
	},
};

export class Chat implements INodeType {
	description: INodeTypeDescription = {
		displayName: '响应聊天',
		name: 'chat',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['input'],
		version: 1,
		description: '向聊天发送消息',
		defaults: {
			name: '响应聊天',
		},
		codex: {
			categories: ['Core Nodes', 'HITL'],
			subcategories: {
				HITL: ['Human in the Loop'],
			},
			alias: ['human', 'wait', 'hitl'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chat/',
					},
				],
			},
		},
		inputs: `={{ (${configureInputs})($parameter) }}`,
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '请确认您使用的是聊天触发器，并将"响应模式"选项设置为"使用响应节点"',
				name: 'generalNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: '消息',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: '等待用户回复',
				name: CHAT_WAIT_USER_REPLY,
				type: 'boolean',
				default: true,
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '添加记忆输入连接',
						name: 'memoryConnection',
						type: 'boolean',
						default: false,
					},
					limitWaitTimeOption,
				],
			},
		],
	};

	async onMessage(
		context: IExecuteFunctions,
		data: INodeExecutionData,
	): Promise<INodeExecutionData[][]> {
		const options = context.getNodeParameter('options', 0, {}) as {
			memoryConnection?: boolean;
		};

		const waitForReply = context.getNodeParameter(CHAT_WAIT_USER_REPLY, 0, true) as boolean;

		if (!waitForReply) {
			const inputData = context.getInputData();
			return [inputData];
		}

		if (options.memoryConnection) {
			const memory = (await context.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			const message = data.json?.chatInput;

			if (memory && message) {
				await memory.chatHistory.addUserMessage(message as string);
			}
		}

		return [[data]];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const connectedNodes = this.getParentNodes(this.getNode().name, {
			includeNodeParameters: true,
		});

		const chatTrigger = connectedNodes.find(
			(node) => node.type === CHAT_TRIGGER_NODE_TYPE && !node.disabled,
		);

		if (!chatTrigger) {
			throw new NodeOperationError(this.getNode(), '工作流必须从聊天触发器节点启动');
		}

		const parameters = chatTrigger.parameters as {
			mode?: 'hostedChat' | 'webhook';
			options: { responseMode: 'lastNode' | 'responseNodes' | 'streaming' | 'responseNode' };
		};

		if (parameters.mode === 'webhook') {
			throw new NodeOperationError(
				this.getNode(),
				'不支持"嵌入式聊天"，请将聊天触发器节点中的"模式"更改为"托管聊天"',
			);
		}

		if (parameters.options.responseMode !== 'responseNodes') {
			throw new NodeOperationError(
				this.getNode(),
				'聊天触发器节点中的"响应模式"必须设置为"响应节点"',
			);
		}

		const message = (this.getNodeParameter('message', 0) as string) ?? '';
		const options = this.getNodeParameter('options', 0, {}) as {
			memoryConnection?: boolean;
		};

		if (options.memoryConnection) {
			const memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			if (memory) {
				await memory.chatHistory.addAIChatMessage(message);
			}
		}

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [[{ json: {}, sendMessage: message }]];
	}
}
