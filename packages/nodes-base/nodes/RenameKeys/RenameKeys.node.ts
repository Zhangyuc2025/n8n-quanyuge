import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import { NodeConnectionTypes, deepCopy } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
interface IRenameKey {
	currentKey: string;
	newKey: string;
}

export class RenameKeys implements INodeType {
	description: INodeTypeDescription = {
		displayName: '重命名键',
		name: 'renameKeys',
		icon: 'fa:edit',
		iconColor: 'crimson',
		group: ['transform'],
		version: 1,
		description: '更新数据项的字段名称',
		defaults: {
			name: '重命名键',
			color: '#772244',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['Core Nodes'],
			resources: {
				tutorialLinks: {
					regexTester: 'https://regex101.com/',
				},
			},
		},
		properties: [
			{
				displayName: '键',
				name: 'keys',
				placeholder: '添加新键',
				description: '添加需要重命名的键',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				options: [
					{
						displayName: '键',
						name: 'key',
						values: [
							{
								displayName: '当前键名',
								name: 'currentKey',
								type: 'string',
								default: '',
								placeholder: 'currentKey',
								requiresDataPath: 'single',
								description:
									'键的当前名称。也可以使用点符号定义深层键，例如："level1.level2.currentKey"。',
							},
							{
								displayName: '新键名',
								name: 'newKey',
								type: 'string',
								default: '',
								placeholder: 'newKey',
								description:
									'键应重命名为的新名称。也可以使用点符号定义深层键，例如："level1.level2.newKey"。',
							},
						],
					},
				],
			},
			{
				displayName: '附加选项',
				name: 'additionalOptions',
				type: 'collection',
				default: {},
				placeholder: '添加选项',
				options: [
					{
						displayName: '正则表达式',
						name: 'regexReplacement',
						placeholder: '添加新正则表达式',
						description: '添加正则表达式规则',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						default: {},
						options: [
							{
								displayName: '替换规则',
								name: 'replacements',
								values: [
									{
										displayName: '注意：使用正则表达式可能会影响之前已重命名的键',
										name: 'regExNotice',
										type: 'notice',
										default: '',
									},
									{
										displayName: '正则表达式',
										name: 'searchRegex',
										type: 'string',
										default: '',
										placeholder: '例如：[N-n]ame',
										description: '用于匹配键名的正则表达式',
										hint: '在<a href="{{regexTester}}">这里</a>学习和测试正则表达式',
									},
									{
										displayName: '替换为',
										name: 'replaceRegex',
										type: 'string',
										default: '',
										placeholder: 'replacedName',
										description: '键应重命名为的新名称。可以使用正则捕获组，例如 $1、$2 等。',
									},
									{
										displayName: '选项',
										name: 'options',
										type: 'collection',
										default: {},
										placeholder: '添加正则选项',
										options: [
											{
												displayName: '忽略大小写',
												name: 'caseInsensitive',
												type: 'boolean',
												description: '是否使用不区分大小写的匹配',
												default: false,
											},
											{
												displayName: '最大深度',
												name: 'depth',
												type: 'number',
												default: -1,
												description: '替换键的最大深度',
												hint: '指定深度级别数字（-1 为无限制，0 仅顶层）',
											},
										],
									},
								],
							},
						],
					},
				],
			},
		],
		hints: [
			{
				type: 'warning',
				message:
					'复杂的正则表达式模式（如嵌套量词 .*+、()*+ 或多个通配符）可能导致性能问题。建议使用更简单的模式，如 [a-z]+ 或 \\w+ 以获得更好的性能。',
				displayCondition:
					'={{ $parameter.additionalOptions.regexReplacement.replacements && $parameter.additionalOptions.regexReplacement.replacements.some(r => r.searchRegex && /(\\.\\*\\+|\\)\\*\\+|\\+\\*|\\*.*\\*|\\+.*\\+|\\?.*\\?|\\{[0-9]+,\\}|\\*{2,}|\\+{2,}|\\?{2,}|[a-zA-Z0-9]{4,}[\\*\\+]|\\([^)]*\\|[^)]*\\)[\\*\\+])/.test(r.searchRegex)) }}',
				whenToDisplay: 'always',
				location: 'outputPane',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let newItem: INodeExecutionData;
		let renameKeys: IRenameKey[];
		let value: any;

		const renameKey = (key: IRenameKey) => {
			if (key.currentKey === '' || key.newKey === '' || key.currentKey === key.newKey) {
				// Ignore all which do not have all the values set or if the new key is equal to the current key
				return;
			}
			value = get(item.json, key.currentKey);
			if (value === undefined) {
				return;
			}
			set(newItem.json, key.newKey, value);

			unset(newItem.json, key.currentKey);
		};

		const regexReplaceKey = (replacement: IDataObject) => {
			const { searchRegex, replaceRegex, options } = replacement;
			const { depth, caseInsensitive } = options as IDataObject;

			const flags = (caseInsensitive as boolean) ? 'i' : undefined;

			const regex = new RegExp(searchRegex as string, flags);

			const renameObjectKeys = (obj: IDataObject, objDepth: number) => {
				for (const key in obj) {
					if (Array.isArray(obj)) {
						// Don't rename array object references
						if (objDepth !== 0) {
							renameObjectKeys(obj[key] as IDataObject, objDepth - 1);
						}
					} else if (obj.hasOwnProperty(key)) {
						if (typeof obj[key] === 'object' && objDepth !== 0) {
							renameObjectKeys(obj[key] as IDataObject, objDepth - 1);
						}
						if (key.match(regex)) {
							const newKey = key.replace(regex, replaceRegex as string);
							if (newKey !== key) {
								obj[newKey] = obj[key];
								delete obj[key];
							}
						}
					}
				}
				return obj;
			};
			newItem.json = renameObjectKeys(newItem.json, depth as number);
		};
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				renameKeys = this.getNodeParameter('keys.key', itemIndex, []) as IRenameKey[];
				const regexReplacements = this.getNodeParameter(
					'additionalOptions.regexReplacement.replacements',
					itemIndex,
					[],
				) as IDataObject[];

				item = items[itemIndex];

				// Copy the whole JSON data as data on any level can be renamed
				newItem = {
					json: deepCopy(item.json),
					pairedItem: {
						item: itemIndex,
					},
				};

				if (item.binary !== undefined) {
					// Reference binary data if any exists. We can reference it
					// as this nodes does not change it
					newItem.binary = item.binary;
				}

				renameKeys.forEach(renameKey);

				regexReplacements.forEach(regexReplaceKey);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: itemIndex } },
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
