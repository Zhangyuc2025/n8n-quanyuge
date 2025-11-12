import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/**
 * 节点元数据验证结果
 */
export interface NodeMetadataValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	normalized?: INodeTypeDescription;
}

/**
 * 节点代码验证结果
 */
export interface NodeCodeValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	compiledNode?: INodeType;
}

/**
 * 节点测试执行结果
 */
export interface NodeTestResult {
	success: boolean;
	output?: any[];
	logs: Array<{ type: 'log' | 'warn' | 'error'; message: string; timestamp: string }>;
	error?: string;
	executionTime: number;
}

/**
 * 节点代码编译服务
 *
 * 负责安全地编译和验证节点代码
 */
@Service()
export class NodeCompilerService {
	constructor(private readonly logger: Logger) {}

	/**
	 * 编译节点代码（安全沙箱）
	 *
	 * @param code - 节点代码字符串
	 * @returns 编译后的节点类
	 * @throws {UserError} 当编译失败时
	 */
	compileNodeCode(code: string): any {
		try {
			// 使用 vm2 提供安全的代码执行环境
			const { VM } = require('vm2');

			const vm = new VM({
				timeout: 5000, // 5秒超时
				sandbox: {
					require: this.createSandboxRequire(),
					console: {
						log: (...args: unknown[]) =>
							this.logger.debug('Node console.log:', { args: args.join(' ') }),
						error: (...args: unknown[]) =>
							this.logger.error('Node console.error:', { args: args.join(' ') }),
						warn: (...args: unknown[]) =>
							this.logger.warn('Node console.warn:', { args: args.join(' ') }),
					},
				},
			});

			// 执行代码
			const compiledCode = vm.run(code);

			// 验证导出的是一个类（构造函数）
			if (typeof compiledCode !== 'function') {
				throw new UserError('Node code must export a class (constructor function)');
			}

			return compiledCode;
		} catch (error) {
			this.logger.error('Node compilation failed:', error);
			throw new UserError(`Node compilation failed: ${error.message}`);
		}
	}

	/**
	 * 验证节点元数据完整性
	 *
	 * @param description - 节点描述对象
	 * @returns 验证结果
	 */
	validateNodeMetadata(description: INodeTypeDescription): NodeMetadataValidationResult {
		const result: NodeMetadataValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
		};

		// 必需字段检查
		const requiredFields: Array<keyof INodeTypeDescription> = [
			'name',
			'displayName',
			'group',
			'description',
			'version',
			'defaults',
			'inputs',
			'outputs',
			'properties',
		];

		for (const field of requiredFields) {
			if (description[field] === undefined || description[field] === null) {
				result.errors.push(`Missing required field: ${String(field)}`);
				result.isValid = false;
			}
		}

		// group 必须是非空数组
		if (description.group !== undefined) {
			if (!Array.isArray(description.group)) {
				result.errors.push('group must be an array');
				result.isValid = false;
			} else if (description.group.length === 0) {
				result.errors.push('group must be a non-empty array');
				result.isValid = false;
			}
		}

		// version 必须是数字或数字数组
		if (description.version !== undefined) {
			const isValidVersion =
				typeof description.version === 'number' ||
				(Array.isArray(description.version) &&
					description.version.every((v: unknown) => typeof v === 'number'));

			if (!isValidVersion) {
				result.errors.push('version must be a number or array of numbers');
				result.isValid = false;
			}
		}

		// inputs 和 outputs 验证
		if (description.inputs !== undefined && !Array.isArray(description.inputs)) {
			result.errors.push('inputs must be an array');
			result.isValid = false;
		}

		if (description.outputs !== undefined && !Array.isArray(description.outputs)) {
			result.errors.push('outputs must be an array');
			result.isValid = false;
		}

		// properties 验证
		if (description.properties !== undefined && !Array.isArray(description.properties)) {
			result.errors.push('properties must be an array');
			result.isValid = false;
		}

		// 警告：推荐字段
		if (!description.icon && !description.iconUrl) {
			result.warnings.push('No icon or iconUrl specified - node will use default icon');
		}

		if (!description.subtitle) {
			result.warnings.push('No subtitle specified - consider adding for better UX');
		}

		return result;
	}

	/**
	 * 验证并实例化节点
	 *
	 * @param code - 节点代码
	 * @returns 验证结果和节点实例
	 */
	async validateAndInstantiateNode(code: string): Promise<NodeCodeValidationResult> {
		const result: NodeCodeValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
		};

		try {
			// 步骤 1: 编译代码
			const NodeClass = this.compileNodeCode(code);

			// 步骤 2: 实例化节点
			let nodeInstance: INodeType;
			try {
				nodeInstance = new NodeClass();
			} catch (error) {
				result.errors.push(`Failed to instantiate node: ${error.message}`);
				result.isValid = false;
				return result;
			}

			// 步骤 3: 验证节点必需方法
			if (typeof nodeInstance.execute !== 'function') {
				result.errors.push('Node must have an execute() method');
				result.isValid = false;
			}

			// 步骤 4: 验证节点描述
			if (!nodeInstance.description) {
				result.errors.push('Node must have a description property');
				result.isValid = false;
				return result;
			}

			const metadataResult = this.validateNodeMetadata(nodeInstance.description);
			result.errors.push(...metadataResult.errors);
			result.warnings.push(...metadataResult.warnings);
			result.isValid = result.isValid && metadataResult.isValid;

			// 如果验证通过，返回节点实例
			if (result.isValid) {
				result.compiledNode = nodeInstance;
			}
		} catch (error) {
			result.errors.push(error.message);
			result.isValid = false;
		}

		return result;
	}

	/**
	 * 创建安全的 require 函数
	 * 仅允许节点使用特定的模块
	 *
	 * @returns 受限的 require 函数
	 */
	private createSandboxRequire() {
		// 允许的模块白名单
		const allowedModules = [
			'n8n-workflow',
			'n8n-core',
			// 未来可以扩展允许的模块
		];

		return (moduleName: string) => {
			if (!allowedModules.includes(moduleName)) {
				throw new UserError(
					`Module '${moduleName}' is not allowed. Allowed modules: ${allowedModules.join(', ')}`,
				);
			}
			return require(moduleName);
		};
	}

	/**
	 * 批量验证节点代码
	 *
	 * @param codes - 节点代码数组
	 * @returns 批量验证结果
	 */
	async validateMultipleNodes(codes: Array<{ nodeKey: string; code: string }>): Promise<
		Array<{
			nodeKey: string;
			result: NodeCodeValidationResult;
		}>
	> {
		const results: Array<{
			nodeKey: string;
			result: NodeCodeValidationResult;
		}> = [];

		for (const { nodeKey, code } of codes) {
			const result = await this.validateAndInstantiateNode(code);
			results.push({ nodeKey, result });
		}

		return results;
	}

	/**
	 * 编译并测试执行节点代码
	 *
	 * @param code - 节点代码字符串
	 * @param nodeDefinition - 节点定义
	 * @param testInput - 测试输入数据
	 * @returns 测试执行结果
	 */
	async compileAndExecute(
		code: string,
		nodeDefinition: INodeTypeDescription,
		testInput: any[],
	): Promise<NodeTestResult> {
		const startTime = Date.now();
		const logs: Array<{ type: 'log' | 'warn' | 'error'; message: string; timestamp: string }> = [];

		try {
			// 使用 vm2 提供安全的代码执行环境
			const { VM } = require('vm2');

			// 创建日志收集函数
			const createLogHandler = (type: 'log' | 'warn' | 'error') => {
				return (...args: unknown[]) => {
					const message = args
						.map((arg) => {
							if (typeof arg === 'object') {
								try {
									return JSON.stringify(arg, null, 2);
								} catch {
									return String(arg);
								}
							}
							return String(arg);
						})
						.join(' ');

					logs.push({
						type,
						message,
						timestamp: new Date().toISOString(),
					});

					// 同时输出到后端日志
					if (type === 'error') {
						this.logger.error('Node test console.error:', { message });
					} else if (type === 'warn') {
						this.logger.warn('Node test console.warn:', { message });
					} else {
						this.logger.debug('Node test console.log:', { message });
					}
				};
			};

			const vm = new VM({
				timeout: 5000, // 5秒超时
				sandbox: {
					require: this.createSandboxRequire(),
					console: {
						log: createLogHandler('log'),
						error: createLogHandler('error'),
						warn: createLogHandler('warn'),
					},
				},
			});

			// 执行代码编译
			const NodeClass = vm.run(code);

			// 验证导出的是一个类
			if (typeof NodeClass !== 'function') {
				throw new UserError('Node code must export a class (constructor function)');
			}

			// 实例化节点
			const nodeInstance: INodeType = new NodeClass();

			// 验证 execute 方法存在
			if (typeof nodeInstance.execute !== 'function') {
				throw new UserError('Node must have an execute() method');
			}

			// 构造 execute 方法所需的 this 上下文（模拟 n8n 环境）
			const mockThis = {
				getNodeParameter: (parameterName: string, itemIndex: number) => {
					// 简单模拟：从 nodeDefinition 的 defaults 或 properties 获取默认值
					const property = nodeDefinition.properties?.find((p: any) => p.name === parameterName);
					return property?.default ?? null;
				},
				helpers: {
					returnJsonArray: (data: any) => {
						return Array.isArray(data) ? data : [data];
					},
				},
			};

			// 执行节点
			const output = await nodeInstance.execute.call(mockThis);

			const executionTime = Date.now() - startTime;

			return {
				success: true,
				output: output || [],
				logs,
				executionTime,
			};
		} catch (error) {
			const executionTime = Date.now() - startTime;

			this.logger.error('Node test execution failed:', error);

			return {
				success: false,
				logs,
				error: error.message || String(error),
				executionTime,
			};
		}
	}
}
