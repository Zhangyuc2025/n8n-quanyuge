import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeListSearchResult,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type ResourceMapperFields,
} from 'n8n-workflow';

import { remoteOptions, resourceMapperFields, returnData, searchOptions } from './mock';

export class E2eTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E 测试',
		name: 'e2eTest',
		icon: 'fa:play',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: '用于端到端测试的虚拟节点',
		defaults: {
			name: 'E2E 测试',
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
						name: '远程选项',
						value: 'remoteOptions',
					},
					{
						name: '资源定位器',
						value: 'resourceLocator',
					},
					{
						name: '资源映射组件',
						value: 'resourceMapper',
					},
				],
				default: 'remoteOptions',
			},
			{
				displayName: '字段 ID',
				name: 'fieldId',
				type: 'string',
				default: '',
			},
			{
				displayName: '远程选项名称或 ID',
				name: 'remoteOptions',
				description:
					'要加载的远程选项。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID。',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['fieldId'],
					loadOptionsMethod: 'getOptions',
				},
				required: true,
				default: [],
				displayOptions: {
					show: {
						operation: ['remoteOptions'],
					},
				},
			},
			{
				displayName: '资源定位器',
				name: 'rlc',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						operation: ['resourceLocator'],
					},
				},
				modes: [
					{
						displayName: '从列表中选择',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'optionsSearch',
							searchable: true,
						},
					},
					{
						displayName: '通过 URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://example.com/user/a4071e98-7d40-41fb-8911-ce3e7bf94fb2',
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'https://example.com/user/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
									errorMessage: '不是有效的示例 URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex:
								'https://example.com/user/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
									errorMessage: '不是有效的 UUID',
								},
							},
						],
						placeholder: 'a4071e98-7d40-41fb-8911-ce3e7bf94fb2',
					},
				],
			},
			{
				displayName: '资源映射组件',
				name: 'resourceMapper',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['fieldId'],
					resourceMapper: {
						resourceMapperMethod: 'getMappingColumns',
						mode: 'upsert',
						fieldWords: {
							singular: '列',
							plural: '列',
						},
						addAllFields: true,
						multiKeyMatch: false,
					},
				},
				displayOptions: {
					show: {
						operation: ['resourceMapper'],
					},
				},
			},
			{
				displayName: '其他非重要字段',
				name: 'otherField',
				type: 'string',
				default: '',
			},
		],
	};

	methods = {
		loadOptions: {
			async getOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return remoteOptions;
			},
		},
		listSearch: {
			async optionsSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const pageSize = 5;
				let results = searchOptions;
				if (filter) {
					results = results.filter((option) => option.name.includes(filter));
				}

				const offset = paginationToken ? parseInt(paginationToken, 10) : 0;
				results = results.slice(offset, offset + pageSize);

				return {
					results,
					paginationToken: offset + pageSize,
				};
			},
		},
		resourceMapping: {
			async getMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				return resourceMapperFields;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);
		// For resource mapper testing, return actual node values
		if (operation === 'resourceMapper') {
			const rmValue = this.getNodeParameter('resourceMapper.value', 0);
			if (rmValue) {
				return [[{ json: rmValue as INodeExecutionData }]];
			}
		}
		return [returnData];
	}
}
