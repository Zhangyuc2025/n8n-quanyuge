import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { openThesaurusApiRequest } from './GenericFunctions';

export class OpenThesaurus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenThesaurus',
		name: 'openThesaurus',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:openthesaurus.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '使用 OpenThesaurus API 获取德语单词的同义词',
		defaults: {
			name: 'OpenThesaurus',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '获取同义词',
						value: 'getSynonyms',
						description: '获取德语单词的同义词',
						action: '获取同义词',
					},
				],
				default: 'getSynonyms',
			},
			{
				displayName: '文本',
				name: 'text',
				type: 'string',
				default: '',
				description: '要获取同义词的单词',
				required: true,
				displayOptions: {
					show: {
						operation: ['getSynonyms'],
					},
				},
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				displayOptions: {
					show: {
						operation: ['getSynonyms'],
					},
				},
				default: {},
				options: [
					{
						displayName: '基本形式',
						name: 'baseform',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description: '如果搜索词不是基本形式，则指定其基本形式',
					},
					{
						displayName: '相似词',
						name: 'similar',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'每个答案还会返回最多五个拼写相似的单词。这对于在可能出现拼写错误时向用户提供建议很有用。',
					},
					{
						displayName: '开头匹配',
						name: 'startswith',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description: '类似于 substring = true，但只查找以指定搜索词开头的单词',
					},
					{
						displayName: '子串',
						name: 'substring',
						type: 'boolean',
						default: false,
						description: '是否为每个答案返回最多十个仅将搜索词作为部分单词包含的单词',
					},
					{
						displayName: '子串起始结果',
						name: 'substringFromResults',
						type: 'number',
						default: 0,
						description: '指定从哪个条目开始返回部分单词匹配。仅在 substring = true 时有效。',
					},
					{
						displayName: '子串最大结果数',
						name: 'substringMaxResults',
						type: 'number',
						typeOptions: {
							maxValue: 250,
						},
						default: 10,
						description: '指定总共应返回多少个部分单词匹配。仅在 substring = true 时有效。',
					},
					{
						displayName: '子同义词集',
						name: 'subsynsets',
						type: 'boolean',
						default: false,
						description: '是否为每个同义词组提供其（可选的）下位词',
					},
					{
						displayName: '上位同义词集',
						name: 'supersynsets',
						type: 'boolean',
						default: false,
						description: '是否为每个同义词组提供其（可选的）上位词',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (operation === 'getSynonyms') {
					const text = this.getNodeParameter('text', i) as string;
					const options = this.getNodeParameter('options', i);

					qs.q = text;

					Object.assign(qs, options);

					responseData = await openThesaurusApiRequest.call(
						this,
						'GET',
						'/synonyme/search',
						{},
						qs,
					);
					responseData = responseData.synsets;
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
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
