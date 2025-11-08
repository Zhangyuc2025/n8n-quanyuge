import { Service } from '@n8n/di';
import * as ts from 'typescript';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * PluginValidator Service
 *
 * 插件代码验证器，用于验证用户上传的自定义插件代码的安全性和正确性
 *
 * 验证步骤：
 * 1. TypeScript 语法检查
 * 2. 安全检查（禁止危险操作）
 * 3. 结构检查（必须定义 metadata 和 execute 方法）
 * 4. 依赖检查（仅允许白名单中的依赖）
 *
 * 安全限制：
 * - 禁止使用 child_process（执行系统命令）
 * - 禁止使用 fs（文件系统操作）
 * - 禁止使用 eval、Function（动态代码执行）
 * - 禁止使用 process.exit（退出进程）
 * - 禁止使用 __dirname、__filename（访问文件系统路径）
 * - 仅允许使用白名单中的 npm 包
 *
 * 白名单依赖：
 * - axios: HTTP 请求库
 * - lodash: 实用函数库
 * - date-fns: 日期处理
 * - crypto-js: 加密库
 * - uuid: UUID 生成
 * - validator: 数据验证
 * - qs: Query string 解析
 */
@Service()
export class PluginValidatorService {
	/**
	 * 允许的 npm 包白名单
	 * Allowed npm packages whitelist
	 */
	private readonly ALLOWED_PACKAGES = [
		'axios',
		'lodash',
		'date-fns',
		'crypto-js',
		'uuid',
		'validator',
		'qs',
	];

	/**
	 * 危险操作的正则表达式列表
	 * Dangerous operations regex patterns
	 */
	private readonly DANGEROUS_PATTERNS = [
		{ pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, description: '禁止执行系统命令' },
		{ pattern: /require\s*\(\s*['"]fs['"]\s*\)/, description: '禁止文件系统操作' },
		{ pattern: /require\s*\(\s*['"]path['"]\s*\)/, description: '禁止访问文件系统路径' },
		{ pattern: /eval\s*\(/, description: '禁止使用 eval' },
		{ pattern: /Function\s*\(/, description: '禁止动态创建函数' },
		{ pattern: /process\.exit/, description: '禁止退出进程' },
		{ pattern: /__dirname/, description: '禁止访问 __dirname' },
		{ pattern: /__filename/, description: '禁止访问 __filename' },
		{ pattern: /require\.resolve/, description: '禁止使用 require.resolve' },
		{ pattern: /process\.env/, description: '禁止访问环境变量' },
		{ pattern: /global\[/, description: '禁止访问 global 对象' },
	];

	/**
	 * 必须包含的结构标识
	 * Required structure identifiers
	 */
	private readonly REQUIRED_STRUCTURES = [
		{ pattern: /static\s+metadata/, description: '必须定义 static metadata' },
		{ pattern: /async\s+execute/, description: '必须定义 async execute 方法' },
	];

	/**
	 * 验证插件代码
	 *
	 * @param pluginCode 插件 TypeScript 代码
	 * @throws BadRequestError 如果验证失败
	 */
	async validate(pluginCode: string): Promise<void> {
		// 1. TypeScript 语法检查
		this.validateSyntax(pluginCode);

		// 2. 安全检查
		this.validateSecurity(pluginCode);

		// 3. 结构检查
		this.validateStructure(pluginCode);

		// 4. 依赖检查
		this.validateDependencies(pluginCode);
	}

	/**
	 * TypeScript 语法检查
	 * Validate TypeScript syntax
	 *
	 * @param pluginCode 插件代码
	 * @throws BadRequestError 如果有语法错误
	 */
	private validateSyntax(pluginCode: string): void {
		const result = ts.transpileModule(pluginCode, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2020,
				strict: false, // 不强制 strict 模式，降低难度
			},
		});

		if (result.diagnostics && result.diagnostics.length > 0) {
			const errors = result.diagnostics
				.map((diagnostic) => {
					const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
					if (diagnostic.file && diagnostic.start !== undefined) {
						const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
							diagnostic.start,
						);
						return `Line ${line + 1}, Column ${character + 1}: ${message}`;
					}
					return message;
				})
				.join('\n');

			throw new BadRequestError(`插件代码有语法错误:\n${errors}`);
		}
	}

	/**
	 * 安全检查
	 * Validate security (check for dangerous operations)
	 *
	 * @param pluginCode 插件代码
	 * @throws BadRequestError 如果包含危险操作
	 */
	private validateSecurity(pluginCode: string): void {
		for (const { pattern, description } of this.DANGEROUS_PATTERNS) {
			if (pattern.test(pluginCode)) {
				throw new BadRequestError(`安全检查失败: ${description} (${pattern.source})`);
			}
		}
	}

	/**
	 * 结构检查
	 * Validate required plugin structure
	 *
	 * @param pluginCode 插件代码
	 * @throws BadRequestError 如果缺少必需的结构
	 */
	private validateStructure(pluginCode: string): void {
		for (const { pattern, description } of this.REQUIRED_STRUCTURES) {
			if (!pattern.test(pluginCode)) {
				throw new BadRequestError(`结构检查失败: ${description}`);
			}
		}

		// 额外检查：必须导出一个类
		if (!pluginCode.includes('export default class') && !pluginCode.includes('export class')) {
			throw new BadRequestError('插件必须导出一个类 (export default class 或 export class)');
		}
	}

	/**
	 * 依赖检查（白名单）
	 * Validate dependencies (whitelist check)
	 *
	 * @param pluginCode 插件代码
	 * @throws BadRequestError 如果使用了非白名单的依赖
	 */
	private validateDependencies(pluginCode: string): void {
		// 匹配 import 和 require 语句
		// 例如: import axios from 'axios'
		// 例如: const axios = require('axios')
		const importPattern = /(?:import|require)\s*(?:.*\s+from\s+)?['"]([\w-/]+)['"]/g;
		let match;

		const usedPackages = new Set<string>();

		while ((match = importPattern.exec(pluginCode)) !== null) {
			const fullPackageName = match[1];

			// 提取顶级包名（例如: '@n8n/workflow' -> '@n8n/workflow', 'lodash/debounce' -> 'lodash'）
			const topLevelPackage = fullPackageName.startsWith('@')
				? fullPackageName
						.split('/')
						.slice(0, 2)
						.join('/') // @scope/package
				: fullPackageName.split('/')[0]; // package

			// 忽略相对路径导入（例如: './utils', '../helpers'）
			if (topLevelPackage.startsWith('.') || topLevelPackage.startsWith('/')) {
				continue;
			}

			usedPackages.add(topLevelPackage);
		}

		// 检查每个使用的包是否在白名单中
		for (const packageName of usedPackages) {
			if (!this.ALLOWED_PACKAGES.includes(packageName)) {
				throw new BadRequestError(
					`依赖检查失败: 包 '${packageName}' 不在允许的白名单中。\n` +
						`允许的包: ${this.ALLOWED_PACKAGES.join(', ')}`,
				);
			}
		}
	}

	/**
	 * 验证插件代码的大小限制
	 * Validate plugin code size limit
	 *
	 * @param pluginCode 插件代码
	 * @param maxSizeKB 最大大小（KB），默认 100KB
	 * @throws BadRequestError 如果超过大小限制
	 */
	validateSize(pluginCode: string, maxSizeKB: number = 100): void {
		const sizeInKB = Buffer.byteLength(pluginCode, 'utf8') / 1024;

		if (sizeInKB > maxSizeKB) {
			throw new BadRequestError(`插件代码大小超过限制: ${sizeInKB.toFixed(2)}KB > ${maxSizeKB}KB`);
		}
	}

	/**
	 * 完整验证（包括大小检查）
	 * Full validation (including size check)
	 *
	 * @param pluginCode 插件代码
	 * @param maxSizeKB 最大大小（KB），默认 100KB
	 * @throws BadRequestError 如果验证失败
	 */
	async validateFull(pluginCode: string, maxSizeKB: number = 100): Promise<void> {
		// 1. 大小检查
		this.validateSize(pluginCode, maxSizeKB);

		// 2. 完整验证
		await this.validate(pluginCode);
	}
}
