import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodePropertyOptions } from 'n8n-workflow';

import type { NodeOperationMode } from './types';

export const DEFAULT_OPERATION_MODES: NodeOperationMode[] = [
	'load',
	'insert',
	'retrieve',
	'retrieve-as-tool',
];

export const OPERATION_MODE_DESCRIPTIONS: INodePropertyOptions[] = [
	{
		name: '获取多个',
		value: 'load',
		description: '从向量存储中获取查询的多个排序文档',
		action: '从向量存储获取排序文档',
	},
	{
		name: '插入文档',
		value: 'insert',
		description: '将文档插入向量存储',
		action: '添加文档到向量存储',
	},
	{
		name: '检索文档（作为链/工具的向量存储）',
		value: 'retrieve',
		description: '从向量存储检索文档，用作 AI 节点的向量存储',
		action: '检索文档用于链/工具作为向量存储',
		outputConnectionType: NodeConnectionTypes.AiVectorStore,
	},
	{
		name: '检索文档（作为 AI 智能体的工具）',
		value: 'retrieve-as-tool',
		description: '从向量存储检索文档，用作 AI 节点的工具',
		action: '检索文档用于 AI 智能体作为工具',
		outputConnectionType: NodeConnectionTypes.AiTool,
	},
	{
		name: '更新文档',
		value: 'update',
		description: '通过 ID 更新向量存储中的文档',
		action: '更新向量存储文档',
	},
];
