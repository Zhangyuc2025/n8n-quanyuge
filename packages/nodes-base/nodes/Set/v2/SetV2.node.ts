import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { IncludeMods, SetField, SetNodeOptions } from './helpers/interfaces';
import { INCLUDE } from './helpers/interfaces';
import * as manual from './manual.mode';
import * as raw from './raw.mode';

type Mode = 'manual' | 'raw';

const versionDescription: INodeTypeDescription = {
	displayName: '编辑字段 (Set)',
	name: 'set',
	iconColor: 'blue',
	group: ['input'],
	version: [3, 3.1, 3.2, 3.3, 3.4],
	description: '修改、添加或删除项目字段',
	subtitle: '={{$parameter["mode"]}}',
	defaults: {
		name: '编辑字段',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: '模式',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: '手动映射',
					value: 'manual',
					description: '逐个编辑项目字段',
					action: '逐个编辑项目字段',
				},
				{
					name: 'JSON',
					value: 'raw',
					description: '使用 JSON 自定义项目输出',
					action: '使用 JSON 自定义项目输出',
				},
			],
			default: 'manual',
		},
		{
			displayName: '重复项目',
			name: 'duplicateItem',
			type: 'boolean',
			default: false,
			isNodeSetting: true,
			description: '是否将此项目重复指定次数',
		},
		{
			displayName: '重复项目次数',
			name: 'duplicateCount',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
			},
			description: '项目应重复的次数，主要用于测试和调试',
			isNodeSetting: true,
			displayOptions: {
				show: {
					duplicateItem: [true],
				},
			},
		},
		{
			displayName: '项目重复设置在节点设置中。当工作流自动运行时，此选项将被忽略。',
			name: 'duplicateWarning',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					duplicateItem: [true],
				},
			},
		},
		...raw.description,
		...manual.description,
		{
			displayName: '包含在输出中',
			name: 'include',
			type: 'options',
			description: '如何选择要包含在输出项目中的字段',
			default: 'all',
			displayOptions: {
				show: {
					'@version': [3, 3.1, 3.2],
				},
			},
			options: [
				{
					name: '所有输入字段',
					value: INCLUDE.ALL,
					description: '同时包含输入中所有未更改的字段',
				},
				{
					name: '不包含输入字段',
					value: INCLUDE.NONE,
					description: '仅包含上面指定的字段',
				},
				{
					name: '选定的输入字段',
					value: INCLUDE.SELECTED,
					description: '同时包含"要包含的字段"参数中列出的字段',
				},
				{
					name: '除外的输入字段',
					value: INCLUDE.EXCEPT,
					description: '排除"要排除的字段"参数中列出的字段',
				},
			],
		},
		{
			displayName: '包含其他输入字段',
			name: 'includeOtherFields',
			type: 'boolean',
			default: false,
			description: '是否将所有输入字段（连同"要设置的字段"中设置的字段）传递到输出',
			displayOptions: {
				hide: {
					'@version': [3, 3.1, 3.2],
				},
			},
		},
		{
			displayName: '要包含的输入字段',
			name: 'include',
			type: 'options',
			description: '如何选择要包含在输出项目中的字段',
			default: 'all',
			displayOptions: {
				hide: {
					'@version': [3, 3.1, 3.2],
					'/includeOtherFields': [false],
				},
			},
			options: [
				{
					name: '全部',
					value: INCLUDE.ALL,
					description: '同时包含输入中所有未更改的字段',
				},
				{
					name: '选定',
					value: INCLUDE.SELECTED,
					description: '同时包含"要包含的字段"参数中列出的字段',
				},
				{
					name: '除外',
					value: INCLUDE.EXCEPT,
					description: '排除"要排除的字段"参数中列出的字段',
				},
			],
		},
		{
			displayName: '要包含的字段',
			name: 'includeFields',
			type: 'string',
			default: '',
			placeholder: '例如：fieldToInclude1,fieldToInclude2',
			description: '要包含在输出中的字段名称的逗号分隔列表。您可以从输入面板拖动选定的字段。',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					include: ['selected'],
					'@version': [3, 3.1, 3.2],
				},
			},
		},
		{
			displayName: '要排除的字段',
			name: 'excludeFields',
			type: 'string',
			default: '',
			placeholder: '例如：fieldToExclude1,fieldToExclude2',
			description: '要从输出中排除的字段名称的逗号分隔列表。您可以从输入面板拖动选定的字段。',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					include: ['except'],
					'@version': [3, 3.1, 3.2],
				},
			},
		},
		{
			displayName: '要包含的字段',
			name: 'includeFields',
			type: 'string',
			default: '',
			placeholder: '例如：fieldToInclude1,fieldToInclude2',
			description: '要包含在输出中的字段名称的逗号分隔列表。您可以从输入面板拖动选定的字段。',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					include: ['selected'],
					'/includeOtherFields': [true],
				},
				hide: {
					'@version': [3, 3.1, 3.2],
				},
			},
		},
		{
			displayName: '要排除的字段',
			name: 'excludeFields',
			type: 'string',
			default: '',
			placeholder: '例如：fieldToExclude1,fieldToExclude2',
			description: '要从输出中排除的字段名称的逗号分隔列表。您可以从输入面板拖动选定的字段。',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					include: ['except'],
					'/includeOtherFields': [true],
				},
				hide: {
					'@version': [3, 3.1, 3.2],
				},
			},
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{
					displayName: '包含二进制文件',
					name: 'includeBinary',
					type: 'boolean',
					default: true,
					displayOptions: {
						hide: {
							'@version': [{ _cnd: { gte: 3.4 } }],
						},
					},
					description: '如果输入项目中存在二进制数据，是否应包含',
				},
				{
					displayName: '移除二进制数据',
					name: 'stripBinary',
					type: 'boolean',
					default: true,
					description: '是否应从输入项目中移除二进制数据。仅在启用"包含其他输入字段"时适用。',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 3.4 } }],
							'/includeOtherFields': [true],
						},
					},
				},
				{
					displayName: '忽略类型转换错误',
					name: 'ignoreConversionErrors',
					type: 'boolean',
					default: false,
					description: '是否忽略字段类型错误并应用较宽松的类型转换',
					displayOptions: {
						show: {
							'/mode': ['manual'],
						},
					},
				},
				{
					displayName: '支持点表示法',
					name: 'dotNotation',
					type: 'boolean',
					default: true,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
					description:
						'默认情况下，属性名称使用点表示法。这意味着"a.b"将在"a"下设置属性"b"，即 { "a": { "b": value} }。如果不希望这样，可以停用此选项，它将设置 { "a.b": value }。',
				},
			],
		},
	],
};

export class SetV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as Mode;
		const duplicateItem = this.getNodeParameter('duplicateItem', 0, false) as boolean;

		const setNode = { raw, manual };

		const returnData: INodeExecutionData[] = [];

		const rawData: IDataObject = {};

		if (mode === 'raw') {
			const jsonOutput = this.getNodeParameter('jsonOutput', 0, '', {
				rawExpressions: true,
			}) as string | undefined;

			if (jsonOutput?.startsWith('=')) {
				rawData.jsonOutput = jsonOutput.replace(/^=+/, '');
			}
		} else {
			const workflowFieldsJson = this.getNodeParameter('fields.values', 0, [], {
				rawExpressions: true,
			}) as SetField[];

			for (const entry of workflowFieldsJson) {
				if (entry.type === 'objectValue' && (entry.objectValue as string).startsWith('=')) {
					rawData[entry.name] = (entry.objectValue as string).replace(/^=+/, '');
				}
			}
		}

		for (let i = 0; i < items.length; i++) {
			const includeOtherFields = this.getNodeParameter('includeOtherFields', i, false) as boolean;
			const include = this.getNodeParameter('include', i, 'all') as IncludeMods;
			const options = this.getNodeParameter('options', i, {});
			const node = this.getNode();

			if (node.typeVersion >= 3.3) {
				options.include = includeOtherFields ? include : 'none';
			} else {
				options.include = include;
			}

			const newItem = await setNode[mode].execute.call(
				this,
				items[i],
				i,
				options as SetNodeOptions,
				rawData,
				node,
			);

			if (duplicateItem && this.getMode() === 'manual') {
				const duplicateCount = this.getNodeParameter('duplicateCount', 0, 0) as number;
				for (let j = 0; j <= duplicateCount; j++) {
					returnData.push(newItem);
				}
			} else {
				returnData.push(newItem);
			}
		}

		return [returnData];
	}
}
