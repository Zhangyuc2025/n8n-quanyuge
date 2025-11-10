import type { INodeProperties } from 'n8n-workflow';

export const disableDotNotationBoolean: INodeProperties = {
	displayName: 'Disable Dot Notation',
	name: 'disableDotNotation',
	type: 'boolean',
	default: false,
	description: '是否禁止在字段名称中使用 `parent.child` 引用子字段',
};
