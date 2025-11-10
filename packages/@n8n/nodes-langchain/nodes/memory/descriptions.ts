import type { INodeProperties } from 'n8n-workflow';

export const sessionIdOption: INodeProperties = {
	displayName: '会话 ID',
	name: 'sessionIdType',
	type: 'options',
	options: [
		{
			name: '已连接的聊天触发器节点',
			value: 'fromInput',
			description: "查找来自直接连接的聊天触发器的名为 'sessionId' 的输入字段",
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			name: '在下方定义',
			value: 'customKey',
			description: '使用表达式引用前面节点的数据或输入静态文本',
		},
	],
	default: 'fromInput',
};

export const expressionSessionKeyProperty = (fromVersion: number): INodeProperties => ({
	displayName: '来自前面节点的会话键',
	name: 'sessionKey',
	type: 'string',
	default: '={{ $json.sessionId }}',
	disabledOptions: { show: { sessionIdType: ['fromInput'] } },
	displayOptions: {
		show: {
			sessionIdType: ['fromInput'],
			'@version': [{ _cnd: { gte: fromVersion } }],
		},
	},
});

export const sessionKeyProperty: INodeProperties = {
	displayName: '键',
	name: 'sessionKey',
	type: 'string',
	default: '',
	description: '用于在记忆中存储会话 ID 的键',
	displayOptions: {
		show: {
			sessionIdType: ['customKey'],
		},
	},
};

export const contextWindowLengthProperty: INodeProperties = {
	displayName: '上下文窗口长度',
	name: 'contextWindowLength',
	type: 'number',
	default: 5,
	hint: '模型接收多少过去的交互作为上下文',
};
