import set from 'lodash/set';
import {
	NodeOperationError,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
} from 'n8n-workflow';

import { JavaScriptSandbox } from '../Code/JavaScriptSandbox';
import { getSandboxContext } from '../Code/Sandbox';
import { standardizeOutput } from '../Code/utils';

const { CODE_ENABLE_STDOUT } = process.env;

export class AiTransform implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI 数据转换',
		name: 'aiTransform',
		icon: 'file:aitransform.svg',
		group: ['transform'],
		version: 1,
		description: '基于自然语言指令修改数据',
		defaults: {
			name: 'AI 数据转换',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		hints: [
			{
				message: '此节点无法访问二进制文件的内容。要在此使用这些内容，请先使用"从文件提取"节点。',
				displayCondition: '={{ $input.all().some(i => i.binary) }}',
				location: 'outputPane',
			},
		],
		properties: [
			{
				displayName: '指令',
				name: 'instructions',
				type: 'button',
				default: '',
				description:
					'提供如何转换数据的指令，然后点击"生成代码"。使用点表示法引用嵌套字段（例如 address.street）。',
				placeholder: '例如：将 firstname 和 lastname 合并到字段 details.name 并按 email 排序',
				typeOptions: {
					buttonConfig: {
						label: '生成代码',
						hasInputField: true,
						inputFieldMaxLength: 500,
						action: {
							type: 'askAiCodeGeneration',
							target: AI_TRANSFORM_JS_CODE,
						},
					},
				},
			},
			{
				displayName: '为提示生成的代码',
				name: AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
				type: 'hidden',
				default: '',
			},
			{
				displayName: '生成的 JavaScript',
				name: AI_TRANSFORM_JS_CODE,
				type: 'string',
				typeOptions: {
					editor: 'jsEditor',
					editorIsReadOnly: true,
				},
				default: '',
				hint: '只读。要编辑此代码，请调整指令或将其复制粘贴到代码节点中。',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const workflowMode = this.getMode();

		const node = this.getNode();

		const codeParameterName = 'jsCode';

		const getSandbox = (index = 0) => {
			let code = '';
			try {
				code = this.getNodeParameter(codeParameterName, index) as string;

				if (!code) {
					const instructions = this.getNodeParameter('instructions', index) as string;
					if (!instructions) {
						throw new NodeOperationError(node, '缺少生成代码的指令', {
							description: '在"指令"参数中输入提示词并点击"生成代码"',
						});
					}
					throw new NodeOperationError(node, '缺少数据转换代码', {
						description: '点击"生成代码"按钮创建代码',
					});
				}
			} catch (error) {
				if (error instanceof NodeOperationError) throw error;

				throw new NodeOperationError(node, error);
			}

			const context = getSandboxContext.call(this, index);

			context.items = context.$input.all();

			const Sandbox = JavaScriptSandbox;
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

		return [items];
	}
}
