import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { removeDuplicateInputItems } from '../utils';

const versionDescription: INodeTypeDescription = {
	displayName: '去除重复项',
	name: 'removeDuplicates',
	icon: 'file:removeDuplicates.svg',
	group: ['transform'],
	subtitle: '',
	version: [1, 1.1],
	description: '删除具有相同字段值的项',
	defaults: {
		name: '去除重复项',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: '比较方式',
			name: 'compare',
			type: 'options',
			options: [
				{
					name: '所有字段',
					value: 'allFields',
				},
				{
					name: '排除指定字段',
					value: 'allFieldsExcept',
				},
				{
					name: '选定字段',
					value: 'selectedFields',
				},
			],
			default: 'allFields',
			description: '用于比较输入项的字段，以确定它们是否相同',
		},
		{
			displayName: '要排除的字段',
			name: 'fieldsToExclude',
			type: 'string',
			placeholder: '例如：email, name',
			requiresDataPath: 'multiple',
			description: '从比较中排除的输入字段',
			default: '',
			displayOptions: {
				show: {
					compare: ['allFieldsExcept'],
				},
			},
		},
		{
			displayName: '要比较的字段',
			name: 'fieldsToCompare',
			type: 'string',
			placeholder: '例如：email, name',
			requiresDataPath: 'multiple',
			description: '添加到比较中的输入字段',
			default: '',
			displayOptions: {
				show: {
					compare: ['selectedFields'],
				},
			},
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加字段',
			default: {},
			displayOptions: {
				show: {
					compare: ['allFieldsExcept', 'selectedFields'],
				},
			},
			options: [
				{
					displayName: '禁用点符号',
					name: 'disableDotNotation',
					type: 'boolean',
					default: false,
					description: '是否禁止使用 `parent.child` 格式引用子字段',
				},
				{
					displayName: '删除其他字段',
					name: 'removeOtherFields',
					type: 'boolean',
					default: false,
					description: '是否删除未参与比较的字段。如果禁用，将保留重复项中第一项的字段值',
				},
			],
		},
	],
};
export class RemoveDuplicatesV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return removeDuplicateInputItems(this, items);
	}
}
