import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { N8nItemListOutputParser } from '@utils/output_parsers/N8nItemListOutputParser';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class OutputParserItemList implements INodeType {
	description: INodeTypeDescription = {
		displayName: '项目列表输出解析器',
		name: 'outputParserItemList',
		icon: 'fa:bars',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: '将结果作为单独的项目返回',
		defaults: {
			name: '项目列表输出解析器',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparseritemlist/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiOutputParser],
		outputNames: ['输出解析器'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '项目数量',
						name: 'numberOfItems',
						type: 'number',
						default: -1,
						description: '定义应返回的最大项目数量。如果设置为 -1，则没有限制。',
					},
					// For that to be easily possible the metadata would have to be returned and be able to be read.
					// Would also be possible with a wrapper but that would be even more hacky and the output types
					// would not be correct anymore.
					// {
					// 	displayName: 'Parse Output',
					// 	name: 'parseOutput',
					// 	type: 'boolean',
					// 	default: true,
					// 	description: 'Whether the output should be automatically be parsed or left RAW',
					// },
					{
						displayName: '分隔符',
						name: 'separator',
						type: 'string',
						default: '\\n',
						description:
							'定义用于将结果拆分为单独项目的分隔符。默认为换行符，但可以根据应返回的数据进行更改。',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			numberOfItems?: number;
			separator?: string;
		};

		const parser = new N8nItemListOutputParser(options);

		return {
			response: parser,
		};
	}
}
