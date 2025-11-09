import type { INodeProperties } from 'n8n-workflow';

export const iconSelector: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
	displayName: '在画布上显示的图标',
	name: 'icon',
	type: 'options',
	// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
	description: '选择节点类型以显示相应的图标',
	default: 'n8n-nodes-base.noOp',
	typeOptions: {
		loadOptionsMethod: 'getNodeTypes',
	},
};

export const subtitleProperty: INodeProperties = {
	displayName: '副标题',
	name: 'subtitle',
	type: 'string',
	default: '',
	placeholder: '例如："record: read"',
};

export const jsonOutputProperty: INodeProperties = {
	displayName: 'JSON',
	name: 'jsonOutput',
	type: 'json',
	typeOptions: {
		rows: 5,
	},
	default: '[\n  {\n  "my_field_1": "value",\n  "my_field_2": 1\n  }\n]',
	validateType: 'array',
};

export const executionDurationProperty: INodeProperties = {
	displayName: '执行持续时间 (毫秒)',
	name: 'executionDuration',
	type: 'number',
	default: 150,
	description: '以毫秒为单位的执行持续时间',
	typeOptions: {
		minValue: 0,
	},
};
