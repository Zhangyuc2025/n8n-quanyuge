import type { INodeProperties } from 'n8n-workflow';

export const includeInputFields: INodeProperties = {
	displayName: '包含输入字段',
	name: 'includeInputFields',
	type: 'boolean',
	default: false,
	description: '是否在输出项中包含输入项的所有字段',
};
