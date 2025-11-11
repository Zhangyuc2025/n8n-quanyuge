/**
 * Node Validator Utility
 *
 * 用于验证平台节点定义（INodeTypeDescription）的结构和完整性
 * 参考：https://github.com/ifmelate/n8n-workflow-builder-mcp
 *
 * 验证内容：
 * 1. 必需字段（name, displayName, version, properties, inputs, outputs）
 * 2. properties 数组结构
 * 3. inputs/outputs 格式
 * 4. 字段类型正确性
 */

/**
 * 节点属性描述接口
 */
export interface INodePropertyDescription {
	name: string;
	displayName?: string;
	type?: string;
	default?: unknown;
	required?: boolean;
	description?: string;
	options?: Array<{ name: string; value: unknown }>;
}

/**
 * 验证错误
 */
export interface ValidationError {
	code: string;
	message: string;
	field?: string;
	details?: unknown;
}

/**
 * 验证结果
 */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

/**
 * 节点验证器类
 */
export class NodeValidator {
	/**
	 * 验证节点定义 JSON
	 *
	 * @param nodeDefinition - 节点定义对象
	 * @returns 验证结果
	 */
	static validateNodeDefinition(nodeDefinition: unknown): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationError[] = [];

		// 1. 基础类型检查
		if (!nodeDefinition || typeof nodeDefinition !== 'object') {
			return {
				valid: false,
				errors: [
					{
						code: 'INVALID_TYPE',
						message: 'nodeDefinition 必须是一个对象',
					},
				],
				warnings: [],
			};
		}

		const def = nodeDefinition as Record<string, unknown>;

		// 2. 必需字段检查
		const requiredFields = ['name', 'displayName', 'version', 'properties'];
		for (const field of requiredFields) {
			if (!(field in def) || def[field] === undefined || def[field] === null) {
				errors.push({
					code: 'MISSING_REQUIRED_FIELD',
					message: `缺少必需字段: ${field}`,
					field,
				});
			}
		}

		// 如果缺少必需字段，直接返回
		if (errors.length > 0) {
			return { valid: false, errors, warnings };
		}

		// 3. 字段类型检查
		if (typeof def.name !== 'string' || def.name.trim() === '') {
			errors.push({
				code: 'INVALID_FIELD_TYPE',
				message: 'name 必须是非空字符串',
				field: 'name',
			});
		}

		if (typeof def.displayName !== 'string' || def.displayName.trim() === '') {
			errors.push({
				code: 'INVALID_FIELD_TYPE',
				message: 'displayName 必须是非空字符串',
				field: 'displayName',
			});
		}

		// version 可以是数字或数字数组
		if (
			typeof def.version !== 'number' &&
			!(Array.isArray(def.version) && def.version.every((v) => typeof v === 'number'))
		) {
			errors.push({
				code: 'INVALID_FIELD_TYPE',
				message: 'version 必须是数字或数字数组',
				field: 'version',
			});
		}

		// 4. properties 数组验证
		if (!Array.isArray(def.properties)) {
			errors.push({
				code: 'INVALID_FIELD_TYPE',
				message: 'properties 必须是数组',
				field: 'properties',
			});
		} else {
			// 验证每个 property
			const properties = def.properties as unknown[];
			properties.forEach((prop, index) => {
				if (!prop || typeof prop !== 'object') {
					errors.push({
						code: 'INVALID_PROPERTY',
						message: `properties[${index}] 必须是对象`,
						field: `properties[${index}]`,
					});
					return;
				}

				const p = prop as Record<string, unknown>;

				// name 是必需的
				if (typeof p.name !== 'string' || p.name.trim() === '') {
					errors.push({
						code: 'INVALID_PROPERTY',
						message: `properties[${index}] 缺少 name 字段或 name 不是字符串`,
						field: `properties[${index}].name`,
					});
				}

				// displayName 建议提供
				if (!p.displayName) {
					warnings.push({
						code: 'MISSING_DISPLAY_NAME',
						message: `properties[${index}] (name: ${p.name}) 建议提供 displayName`,
						field: `properties[${index}].displayName`,
					});
				}

				// type 建议提供
				if (!p.type) {
					warnings.push({
						code: 'MISSING_TYPE',
						message: `properties[${index}] (name: ${p.name}) 建议提供 type`,
						field: `properties[${index}].type`,
					});
				}
			});
		}

		// 5. inputs/outputs 验证（可选字段）
		if ('inputs' in def) {
			if (!Array.isArray(def.inputs)) {
				errors.push({
					code: 'INVALID_FIELD_TYPE',
					message: 'inputs 必须是数组',
					field: 'inputs',
				});
			}
		} else {
			warnings.push({
				code: 'MISSING_OPTIONAL_FIELD',
				message: '建议提供 inputs 字段（默认值：["main"]）',
				field: 'inputs',
			});
		}

		if ('outputs' in def) {
			if (!Array.isArray(def.outputs)) {
				errors.push({
					code: 'INVALID_FIELD_TYPE',
					message: 'outputs 必须是数组',
					field: 'outputs',
				});
			}
		} else {
			warnings.push({
				code: 'MISSING_OPTIONAL_FIELD',
				message: '建议提供 outputs 字段（默认值：["main"]）',
				field: 'outputs',
			});
		}

		// 6. description 建议提供
		if (!def.description || typeof def.description !== 'string') {
			warnings.push({
				code: 'MISSING_DESCRIPTION',
				message: '建议提供 description 字段',
				field: 'description',
			});
		}

		// 7. defaults 建议提供
		if (!def.defaults) {
			warnings.push({
				code: 'MISSING_DEFAULTS',
				message: '建议提供 defaults 字段（例如：{ "name": "节点名称" }）',
				field: 'defaults',
			});
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * 快速验证：只检查必需字段，不返回详细错误
	 *
	 * @param nodeDefinition - 节点定义对象
	 * @returns 是否有效
	 */
	static isValid(nodeDefinition: unknown): boolean {
		if (!nodeDefinition || typeof nodeDefinition !== 'object') {
			return false;
		}

		const def = nodeDefinition as Record<string, unknown>;
		const requiredFields = ['name', 'displayName', 'version', 'properties'];

		for (const field of requiredFields) {
			if (!(field in def) || def[field] === undefined || def[field] === null) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 格式化验证错误为可读字符串
	 *
	 * @param result - 验证结果
	 * @returns 格式化的错误消息
	 */
	static formatErrors(result: ValidationResult): string {
		const messages: string[] = [];

		if (result.errors.length > 0) {
			messages.push('错误：');
			result.errors.forEach((err) => {
				messages.push(`  - ${err.message}`);
			});
		}

		if (result.warnings.length > 0) {
			messages.push('警告：');
			result.warnings.forEach((warn) => {
				messages.push(`  - ${warn.message}`);
			});
		}

		return messages.join('\n');
	}
}
