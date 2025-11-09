import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { hackerNewsApiRequest, hackerNewsApiRequestAllItems } from './GenericFunctions';

export class HackerNews implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hacker News',
		name: 'hackerNews',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:hackernews.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '使用 Hacker News API',
		defaults: {
			name: 'Hacker News',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			// ----------------------------------
			//         Resources
			// ----------------------------------
			{
				displayName: '资源',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '全部',
						value: 'all',
					},
					{
						name: '文章',
						value: 'article',
					},
					{
						name: '用户',
						value: 'user',
					},
				],
				default: 'article',
			},

			// ----------------------------------
			//         Operations
			// ----------------------------------
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['all'],
					},
				},
				options: [
					{
						name: '获取多个',
						value: 'getAll',
						description: '获取多个项目',
						action: '获取多个项目',
					},
				],
				default: 'getAll',
			},
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['article'],
					},
				},
				options: [
					{
						name: '获取',
						value: 'get',
						description: '获取 Hacker News 文章',
						action: '获取文章',
					},
				],
				default: 'get',
			},
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: '获取',
						value: 'get',
						description: '获取 Hacker News 用户',
						action: '获取用户',
					},
				],
				default: 'get',
			},
			// ----------------------------------
			//         Fields
			// ----------------------------------
			{
				displayName: '文章 ID',
				name: 'articleId',
				type: 'string',
				required: true,
				default: '',
				description: '要返回的 Hacker News 文章 ID',
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: '用户名',
				name: 'username',
				type: 'string',
				required: true,
				default: '',
				description: '要返回的 Hacker News 用户',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: '返回全部',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: '是否返回所有结果或仅返回指定数量',
				displayOptions: {
					show: {
						resource: ['all'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: '限制',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 100,
				description: '要返回的最大结果数',
				displayOptions: {
					show: {
						resource: ['all'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},
			{
				displayName: '附加字段',
				name: 'additionalFields',
				type: 'collection',
				placeholder: '添加字段',
				default: {},
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: '包含评论',
						name: 'includeComments',
						type: 'boolean',
						default: false,
						description: '是否包含 Hacker News 文章的所有评论',
					},
				],
			},
			{
				displayName: '附加字段',
				name: 'additionalFields',
				type: 'collection',
				placeholder: '添加字段',
				default: {},
				displayOptions: {
					show: {
						resource: ['all'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: '关键词',
						name: 'keyword',
						type: 'string',
						default: '',
						description: '用于过滤查询结果的关键词',
					},
					{
						displayName: '标签',
						name: 'tags',
						type: 'multiOptions',
						options: [
							{
								name: 'Ask HN',
								value: 'ask_hn', // snake case per HN tags
								description: '返回按 Ask HN 标签过滤的查询结果',
							},
							{
								name: '评论',
								value: 'comment',
								description: '返回按评论标签过滤的查询结果',
							},
							{
								name: '首页',
								value: 'front_page', // snake case per HN tags
								description: '返回按首页标签过滤的查询结果',
							},
							{
								name: '投票',
								value: 'poll',
								description: '返回按投票标签过滤的查询结果',
							},
							{
								name: 'Show HN',
								value: 'show_hn', // snake case per HN tags
								description: '返回按 Show HN 标签过滤的查询结果',
							},
							{
								name: '故事',
								value: 'story',
								description: '返回按故事标签过滤的查询结果',
							},
						],
						default: [],
						description: '用于过滤查询结果的标签',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		let returnAll = false;

		for (let i = 0; i < items.length; i++) {
			try {
				let qs: IDataObject = {};
				let endpoint = '';
				let includeComments = false;

				if (resource === 'all') {
					if (operation === 'getAll') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const keyword = additionalFields.keyword as string;
						const tags = additionalFields.tags as string[];

						qs = {
							query: keyword,
							tags: tags ? tags.join() : '',
						};

						returnAll = this.getNodeParameter('returnAll', i);

						if (!returnAll) {
							qs.hitsPerPage = this.getNodeParameter('limit', i);
						}

						endpoint = 'search?';
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'article') {
					if (operation === 'get') {
						endpoint = `items/${this.getNodeParameter('articleId', i)}`;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						includeComments = additionalFields.includeComments as boolean;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'user') {
					if (operation === 'get') {
						endpoint = `users/${this.getNodeParameter('username', i)}`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource '${resource}' is unknown!`, {
						itemIndex: i,
					});
				}

				let responseData;
				if (returnAll) {
					responseData = await hackerNewsApiRequestAllItems.call(this, 'GET', endpoint, qs);
				} else {
					responseData = await hackerNewsApiRequest.call(this, 'GET', endpoint, qs);
					if (resource === 'all' && operation === 'getAll') {
						responseData = responseData.hits;
					}
				}

				if (resource === 'article' && operation === 'get' && !includeComments) {
					delete responseData.children;
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
