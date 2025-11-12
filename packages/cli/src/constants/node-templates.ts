/**
 * 节点模板库
 *
 * 提供常见节点类型的模板，降低用户开发门槛
 */

export interface NodeTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
	nodeDefinition: Record<string, unknown>;
	nodeCode: string;
}

/**
 * HTTP 请求节点模板
 */
export const HTTP_REQUEST_TEMPLATE: NodeTemplate = {
	id: 'http-request',
	name: 'HTTP 请求节点',
	description: '发送 HTTP GET/POST 请求并返回响应数据',
	category: '数据源',
	nodeDefinition: {
		name: 'HttpRequest',
		displayName: 'HTTP 请求',
		description: '发送 HTTP 请求',
		version: 1,
		defaults: {
			name: 'HTTP 请求',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: '请求的 URL 地址',
			},
			{
				displayName: '请求方法',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
				description: 'HTTP 请求方法',
			},
		],
	},
	nodeCode: `class HttpRequestNode {
	description = {
		name: 'HttpRequest',
		displayName: 'HTTP 请求',
		description: '发送 HTTP 请求',
		version: 1,
		defaults: { name: 'HTTP 请求' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: '请求方法',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
			},
		],
	};

	async execute() {
		const url = this.getNodeParameter('url', 0);
		const method = this.getNodeParameter('method', 0);

		console.log(\`发送 \${method} 请求到: \${url}\`);

		// 简化示例：实际项目中需要使用 axios 或 fetch
		const response = {
			statusCode: 200,
			body: { message: '请求成功', url, method },
		};

		return [this.helpers.returnJsonArray(response)];
	}
}

// 导出节点类
module.exports = HttpRequestNode;`,
};

/**
 * 数据转换节点模板
 */
export const DATA_TRANSFORM_TEMPLATE: NodeTemplate = {
	id: 'data-transform',
	name: '数据转换节点',
	description: '对输入数据进行过滤、映射和转换',
	category: '数据处理',
	nodeDefinition: {
		name: 'DataTransform',
		displayName: '数据转换',
		description: '转换和处理数据',
		version: 1,
		defaults: {
			name: '数据转换',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: '转换类型',
				name: 'transformType',
				type: 'options',
				options: [
					{ name: '过滤', value: 'filter' },
					{ name: '映射', value: 'map' },
					{ name: '求和', value: 'sum' },
				],
				default: 'map',
				description: '选择数据转换类型',
			},
			{
				displayName: '字段名称',
				name: 'fieldName',
				type: 'string',
				default: '',
				description: '要处理的字段名称',
			},
		],
	},
	nodeCode: `class DataTransformNode {
	description = {
		name: 'DataTransform',
		displayName: '数据转换',
		description: '转换和处理数据',
		version: 1,
		defaults: { name: '数据转换' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: '转换类型',
				name: 'transformType',
				type: 'options',
				options: [
					{ name: '过滤', value: 'filter' },
					{ name: '映射', value: 'map' },
					{ name: '求和', value: 'sum' },
				],
				default: 'map',
			},
			{
				displayName: '字段名称',
				name: 'fieldName',
				type: 'string',
				default: '',
			},
		],
	};

	async execute() {
		const transformType = this.getNodeParameter('transformType', 0);
		const fieldName = this.getNodeParameter('fieldName', 0);

		console.log(\`执行数据转换: \${transformType}, 字段: \${fieldName}\`);

		// 示例：简单的数据转换
		const result = {
			transformType,
			fieldName,
			output: '数据转换完成',
		};

		return [this.helpers.returnJsonArray(result)];
	}
}

module.exports = DataTransformNode;`,
};

/**
 * 条件判断节点模板
 */
export const CONDITION_TEMPLATE: NodeTemplate = {
	id: 'condition',
	name: '条件判断节点',
	description: '根据条件判断数据流向',
	category: '流程控制',
	nodeDefinition: {
		name: 'Condition',
		displayName: '条件判断',
		description: '根据条件分流数据',
		version: 1,
		defaults: {
			name: '条件判断',
		},
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [
			{
				displayName: '字段名称',
				name: 'fieldName',
				type: 'string',
				default: '',
				required: true,
				description: '要判断的字段',
			},
			{
				displayName: '操作符',
				name: 'operator',
				type: 'options',
				options: [
					{ name: '等于', value: 'equals' },
					{ name: '大于', value: 'gt' },
					{ name: '小于', value: 'lt' },
				],
				default: 'equals',
				description: '比较操作符',
			},
			{
				displayName: '比较值',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
				description: '用于比较的值',
			},
		],
	},
	nodeCode: `class ConditionNode {
	description = {
		name: 'Condition',
		displayName: '条件判断',
		description: '根据条件分流数据',
		version: 1,
		defaults: { name: '条件判断' },
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [
			{
				displayName: '字段名称',
				name: 'fieldName',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: '操作符',
				name: 'operator',
				type: 'options',
				options: [
					{ name: '等于', value: 'equals' },
					{ name: '大于', value: 'gt' },
					{ name: '小于', value: 'lt' },
				],
				default: 'equals',
			},
			{
				displayName: '比较值',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
			},
		],
	};

	async execute() {
		const fieldName = this.getNodeParameter('fieldName', 0);
		const operator = this.getNodeParameter('operator', 0);
		const value = this.getNodeParameter('value', 0);

		console.log(\`条件判断: \${fieldName} \${operator} \${value}\`);

		// 示例：简单的条件判断逻辑
		const condition = true; // 实际项目中需要实现真实的判断逻辑

		if (condition) {
			return [[{ json: { result: 'true', fieldName, operator, value } }], []];
		} else {
			return [[], [{ json: { result: 'false', fieldName, operator, value } }]];
		}
	}
}

module.exports = ConditionNode;`,
};

/**
 * 数据库查询节点模板
 */
export const DATABASE_QUERY_TEMPLATE: NodeTemplate = {
	id: 'database-query',
	name: '数据库查询节点',
	description: '执行 SQL 查询并返回结果',
	category: '数据库',
	nodeDefinition: {
		name: 'DatabaseQuery',
		displayName: '数据库查询',
		description: '执行 SQL 查询',
		version: 1,
		defaults: {
			name: '数据库查询',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'SQL 查询',
				name: 'query',
				type: 'string',
				default: 'SELECT * FROM table_name LIMIT 10',
				required: true,
				description: 'SQL 查询语句',
			},
		],
	},
	nodeCode: `class DatabaseQueryNode {
	description = {
		name: 'DatabaseQuery',
		displayName: '数据库查询',
		description: '执行 SQL 查询',
		version: 1,
		defaults: { name: '数据库查询' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'SQL 查询',
				name: 'query',
				type: 'string',
				default: 'SELECT * FROM table_name LIMIT 10',
				required: true,
			},
		],
	};

	async execute() {
		const query = this.getNodeParameter('query', 0);

		console.log(\`执行 SQL 查询: \${query}\`);

		// 示例：模拟数据库查询结果
		const mockResults = [
			{ id: 1, name: '数据1', status: 'active' },
			{ id: 2, name: '数据2', status: 'inactive' },
		];

		console.log(\`查询返回 \${mockResults.length} 条记录\`);

		return [this.helpers.returnJsonArray(mockResults)];
	}
}

module.exports = DatabaseQueryNode;`,
};

/**
 * 所有模板集合
 */
export const NODE_TEMPLATES: NodeTemplate[] = [
	HTTP_REQUEST_TEMPLATE,
	DATA_TRANSFORM_TEMPLATE,
	CONDITION_TEMPLATE,
	DATABASE_QUERY_TEMPLATE,
];

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): NodeTemplate | undefined {
	return NODE_TEMPLATES.find((template) => template.id === id);
}

/**
 * 根据分类获取模板
 */
export function getTemplatesByCategory(category: string): NodeTemplate[] {
	return NODE_TEMPLATES.filter((template) => template.category === category);
}

/**
 * 获取所有模板分类
 */
export function getTemplateCategories(): string[] {
	const categories = new Set(NODE_TEMPLATES.map((t) => t.category));
	return Array.from(categories);
}
