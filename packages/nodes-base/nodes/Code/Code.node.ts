/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
import { NodesConfig, TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import set from 'lodash/set';
import {
	NodeConnectionTypes,
	UserError,
	type CodeExecutionMode,
	type CodeNodeEditorLanguage,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

type CodeNodeLanguageOption = CodeNodeEditorLanguage | 'pythonNative';

import { javascriptCodeDescription } from './descriptions/JavascriptCodeDescription';
import { pythonCodeDescription } from './descriptions/PythonCodeDescription';
import { JavaScriptSandbox } from './JavaScriptSandbox';
import { JsTaskRunnerSandbox } from './JsTaskRunnerSandbox';
import { NativePythonWithoutRunnerError } from './native-python-without-runner.error';
import { PythonSandbox } from './PythonSandbox';
import { PythonTaskRunnerSandbox } from './PythonTaskRunnerSandbox';
import { getSandboxContext } from './Sandbox';
import { addPostExecutionWarning, standardizeOutput } from './utils';

const { CODE_ENABLE_STDOUT } = process.env;

class PythonDisabledError extends UserError {
	constructor() {
		super(
			'This instance disallows Python execution because it has the environment variable `N8N_PYTHON_ENABLED` set to `false`. To restore Python execution, remove this environment variable or set it to `true` and restart the instance.',
		);
	}
}

function iconForLanguage(lang: CodeNodeLanguageOption): string {
	switch (lang) {
		case 'python':
		case 'pythonNative':
			return 'file:python.svg';
		case 'javaScript':
			return 'file:js.svg';
		default:
			return 'file:code.svg';
	}
}

export class Code implements INodeType {
	description: INodeTypeDescription = {
		displayName: '代码',
		name: 'code',
		icon: `={{(${iconForLanguage})($parameter.language)}}`,
		group: ['transform'],
		version: [1, 2],
		defaultVersion: 2,
		description: '运行自定义 JavaScript 或 Python 代码',
		defaults: {
			name: '代码',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/',
					},
				],
				// 教学链接（将同步到数据库 documentationConfig）
				tutorialLinks: {
					javaScriptReference: 'https://docs.n8n.io/nodes/n8n-nodes-base.function',
					javaScriptMethods: 'https://docs.n8n.io/code-examples/methods-variables-reference/',
					pythonBuiltin: 'https://docs.n8n.io/code/builtin/',
				},
			},
		},
		properties: [
			{
				displayName: '模式',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '所有项目运行一次',
						value: 'runOnceForAllItems',
						description: '无论输入项目数量多少，此代码仅运行一次',
					},
					{
						name: '每个项目运行一次',
						value: 'runOnceForEachItem',
						description: '此代码将根据输入项目的数量运行相应次数',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: '语言',
				name: 'language',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				options: [
					{
						name: 'JavaScript',
						value: 'javaScript',
						action: '使用 JavaScript 编写代码',
					},
					{
						name: 'Python (测试版)',
						value: 'python',
						action: '使用 Python 编写代码（测试版）',
					},
					{
						name: 'Python 原生（测试版）',
						value: 'pythonNative',
						action: '使用 Python 原生编写代码（测试版）',
					},
				],
				default: 'javaScript',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'hidden',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				default: 'javaScript',
			},

			...javascriptCodeDescription,
			...pythonCodeDescription,
		],
	};

	async execute(this: IExecuteFunctions) {
		const node = this.getNode();
		const language: CodeNodeLanguageOption =
			node.typeVersion === 2
				? (this.getNodeParameter('language', 0) as CodeNodeLanguageOption)
				: 'javaScript';

		const isJsLang = language === 'javaScript';
		const isPyLang = language === 'python' || language === 'pythonNative';
		const runnersConfig = Container.get(TaskRunnersConfig);
		const isJsRunner = runnersConfig.enabled;
		const isPyRunner = runnersConfig.isNativePythonRunnerEnabled;

		if (isPyLang && !Container.get(NodesConfig).pythonEnabled) {
			throw new PythonDisabledError();
		}

		const nodeMode = this.getNodeParameter('mode', 0) as CodeExecutionMode;
		const workflowMode = this.getMode();
		const codeParameterName =
			language === 'python' || language === 'pythonNative' ? 'pythonCode' : 'jsCode';

		if (isJsLang && isJsRunner) {
			const code = this.getNodeParameter(codeParameterName, 0) as string;
			const sandbox = new JsTaskRunnerSandbox(code, nodeMode, workflowMode, this);
			const numInputItems = this.getInputData().length;

			return nodeMode === 'runOnceForAllItems'
				? [await sandbox.runCodeAllItems()]
				: [await sandbox.runCodeForEachItem(numInputItems)];
		}

		if (language === 'pythonNative' && !isPyRunner) {
			throw new NativePythonWithoutRunnerError();
		}

		if (isPyLang && isPyRunner) {
			// When the native Python runner is enabled, both `python` and `pythonNative` are
			// sent to the runner, to ensure there is no path to run Pyodide in this scenario.
			const code = this.getNodeParameter(codeParameterName, 0) as string;
			const sandbox = new PythonTaskRunnerSandbox(code, nodeMode, workflowMode, this);

			return [await sandbox.runUsingIncomingItems()];
		}

		const getSandbox = (index = 0) => {
			const code = this.getNodeParameter(codeParameterName, index) as string;

			const context = getSandboxContext.call(this, index);
			if (nodeMode === 'runOnceForAllItems') {
				context.items = context.$input.all();
			} else {
				context.item = context.$input.item;
			}

			const Sandbox = language === 'python' ? PythonSandbox : JavaScriptSandbox;
			const sandbox = new Sandbox(context, code, this.helpers);
			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI.bind(this)
					: CODE_ENABLE_STDOUT === 'true'
						? (...args) =>
								console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args)
						: () => {},
			);
			return sandbox;
		};

		const inputDataItems = this.getInputData();

		// ----------------------------------
		//        runOnceForAllItems
		// ----------------------------------

		if (nodeMode === 'runOnceForAllItems') {
			const sandbox = getSandbox();
			let items: INodeExecutionData[];
			try {
				items = (await sandbox.runCodeAllItems()) as INodeExecutionData[];
			} catch (error) {
				if (!this.continueOnFail()) {
					set(error, 'node', node);
					throw error;
				}
				items = [{ json: { error: error.message } }];
			}

			for (const item of items) {
				standardizeOutput(item.json);
			}

			addPostExecutionWarning(this, items, inputDataItems?.length);
			return [items];
		}

		// ----------------------------------
		//        runOnceForEachItem
		// ----------------------------------

		const returnData: INodeExecutionData[] = [];

		for (let index = 0; index < inputDataItems.length; index++) {
			const sandbox = getSandbox(index);
			let result: INodeExecutionData | undefined;
			try {
				result = await sandbox.runCodeEachItem(index);
			} catch (error) {
				if (!this.continueOnFail()) {
					set(error, 'node', node);
					throw error;
				}
				returnData.push({
					json: { error: error.message },
					pairedItem: {
						item: index,
					},
				});
			}

			if (result) {
				returnData.push({
					json: standardizeOutput(result.json),
					pairedItem: { item: index },
					...(result.binary && { binary: result.binary }),
				});
			}
		}

		addPostExecutionWarning(this, returnData, inputDataItems?.length);
		return [returnData];
	}
}
