import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy } from 'n8n-workflow';

const versionDescription: INodeTypeDescription = {
	displayName: '设置',
	name: 'set',
	icon: 'fa:pen',
	group: ['input'],
	version: [1, 2],
	description: '在项目上设置值并可选择删除其他值',
	defaults: {
		name: '设置',
		color: '#0000FF',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: '仅保留设置的值',
			name: 'keepOnlySet',
			type: 'boolean',
			default: false,
			description: '是否仅保留在此节点设置的值并删除所有其他值',
		},
		{
			displayName: '要设置的值',
			name: 'values',
			placeholder: '添加值',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			description: '要设置的值',
			default: {},
			options: [
				{
					name: 'boolean',
					displayName: '布尔值',
					values: [
						{
							displayName: '名称',
							name: 'name',
							type: 'string',
							requiresDataPath: 'single',
							default: 'propertyName',
							description: '要写入数据的属性名称。支持点表示法。示例："data.person[0].name"',
						},
						{
							displayName: '值',
							name: 'value',
							type: 'boolean',
							default: false,
							// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
							description: '要写入属性的布尔值',
						},
					],
				},
				{
					name: 'number',
					displayName: '数字',
					values: [
						{
							displayName: '名称',
							name: 'name',
							type: 'string',
							default: 'propertyName',
							requiresDataPath: 'single',
							description: '要写入数据的属性名称。支持点表示法。示例："data.person[0].name"',
						},
						{
							displayName: '值',
							name: 'value',
							type: 'number',
							default: 0,
							description: '要写入属性的数字值',
						},
					],
				},
				{
					name: 'string',
					displayName: '字符串',
					values: [
						{
							displayName: '名称',
							name: 'name',
							type: 'string',
							default: 'propertyName',
							requiresDataPath: 'single',
							description: '要写入数据的属性名称。支持点表示法。示例："data.person[0].name"',
						},
						{
							displayName: '值',
							name: 'value',
							type: 'string',
							default: '',
							description: '要写入属性的字符串值',
						},
					],
				},
			],
		},

		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{
					displayName: '点表示法',
					name: 'dotNotation',
					type: 'boolean',
					default: true,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
					description:
						'<p>默认情况下，属性名称使用点表示法。这意味着"a.b"将在"a"下设置属性"b"，即 { "a": { "b": value} }。<p></p>如果不希望这样，可以停用此选项，它将设置 { "a.b": value }。</p>',
				},
			],
		},
	],
};

export class SetV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const nodeVersion = this.getNode().typeVersion;

		if (items.length === 0) {
			items.push({ json: {}, pairedItem: { item: 0 } });
		}

		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let keepOnlySet: boolean;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
			item = items[itemIndex];
			const options = this.getNodeParameter('options', itemIndex, {});

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: { item: itemIndex },
			};

			if (!keepOnlySet) {
				if (item.binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					newItem.binary = {};
					Object.assign(newItem.binary, item.binary);
				}

				newItem.json = deepCopy(item.json);
			}

			// Add boolean values
			(this.getNodeParameter('values.boolean', itemIndex, []) as INodeParameters[]).forEach(
				(setItem) => {
					if (options.dotNotation === false) {
						newItem.json[setItem.name as string] = !!setItem.value;
					} else {
						set(newItem.json, setItem.name as string, !!setItem.value);
					}
				},
			);

			// Add number values
			(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach(
				(setItem) => {
					if (
						nodeVersion >= 2 &&
						typeof setItem.value === 'string' &&
						!Number.isNaN(Number(setItem.value))
					) {
						setItem.value = Number(setItem.value);
					}
					if (options.dotNotation === false) {
						newItem.json[setItem.name as string] = setItem.value;
					} else {
						set(newItem.json, setItem.name as string, setItem.value);
					}
				},
			);

			// Add string values
			(this.getNodeParameter('values.string', itemIndex, []) as INodeParameters[]).forEach(
				(setItem) => {
					if (options.dotNotation === false) {
						newItem.json[setItem.name as string] = setItem.value;
					} else {
						set(newItem.json, setItem.name as string, setItem.value);
					}
				},
			);

			returnData.push(newItem);
		}

		return [returnData];
	}
}
