import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import Parser from 'rss-parser';
import { URL } from 'url';

import { generatePairedItemData } from '../../utils/utilities';

// Utility function

function validateURL(url: string) {
	try {
		new URL(url);
		return true;
	} catch (err) {
		return false;
	}
}

export class RssFeedRead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS 读取',
		name: 'rssFeedRead',
		icon: 'fa:rss',
		iconColor: 'orange-red',
		group: ['input'],
		version: [1, 1.1, 1.2],
		description: '从 RSS 订阅源读取数据',
		defaults: {
			name: 'RSS 读取',
			color: '#b02020',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'RSS 订阅源的 URL 地址',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '自定义字段',
						name: 'customFields',
						type: 'string',
						default: '',
						description:
							'要在输出中包含的自定义字段列表，用逗号分隔。例如："author, contentSnippet"。',
					},
					{
						displayName: '忽略 SSL 问题（不安全）',
						name: 'ignoreSSL',
						type: 'boolean',
						default: false,
						description: '是否忽略 SSL/TLS 证书问题',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const nodeVersion = this.getNode().typeVersion;
		const items = this.getInputData();

		let itemsLength = items.length ? 1 : 0;
		let fallbackPairedItems;

		if (nodeVersion >= 1.1) {
			itemsLength = items.length;
		} else {
			fallbackPairedItems = generatePairedItemData(items.length);
		}

		for (let i = 0; i < itemsLength; i++) {
			try {
				const url = this.getNodeParameter('url', i) as string;
				const options = this.getNodeParameter('options', i);
				const ignoreSSL = Boolean(options.ignoreSSL);

				if (!url) {
					throw new NodeOperationError(this.getNode(), '必须设置 URL 参数！', {
						itemIndex: i,
					});
				}

				if (!validateURL(url)) {
					throw new NodeOperationError(this.getNode(), '提供的 URL 无效！', {
						itemIndex: i,
					});
				}

				const parserOptions: IDataObject = {
					requestOptions: {
						rejectUnauthorized: !ignoreSSL,
					},
				};

				if (nodeVersion >= 1.2) {
					parserOptions.headers = {
						Accept:
							'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4',
					};
				}

				if (options.customFields) {
					const customFields = options.customFields as string;
					parserOptions.customFields = {
						item: customFields.split(',').map((field) => field.trim()),
					};
				}

				const parser = new Parser(parserOptions);

				let feed: Parser.Output<IDataObject>;
				try {
					feed = await parser.parseURL(url);
				} catch (error) {
					if (error.code === 'ECONNREFUSED') {
						throw new NodeOperationError(
							this.getNode(),
							`无法连接到该 URL。请确保 URL "${url}" 是有效的！`,
							{
								itemIndex: i,
							},
						);
					}

					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex: i,
					});
				}

				if (feed.items) {
					const feedItems = (feed.items as IDataObject[]).map((item) => ({
						json: item,
					})) as INodeExecutionData[];

					const itemData = fallbackPairedItems ?? [{ item: i }];

					const executionData = this.helpers.constructExecutionMetaData(feedItems, {
						itemData,
					});

					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: fallbackPairedItems ?? [{ item: i }],
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
