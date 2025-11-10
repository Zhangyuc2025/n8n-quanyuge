import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeProperties,
	IDisplayOptions,
	IWebhookFunctions,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	WAIT_INDEFINITELY,
	FORM_TRIGGER_NODE_TYPE,
	tryToParseDateTime,
	NodeOperationError,
} from 'n8n-workflow';

import { validateWaitAmount, validateWaitUnit } from './validation';
import { updateDisplayOptions } from '../../utils/utilities';
import {
	formDescription,
	formFields,
	respondWithOptions,
	formRespondMode,
	formTitle,
	appendAttributionToForm,
} from '../Form/common.descriptions';
import { formWebhook } from '../Form/utils/utils';
import {
	authenticationProperty,
	credentialsProperty,
	defaultWebhookDescription,
	httpMethodsProperty,
	optionsProperty,
	responseBinaryPropertyNameProperty,
	responseCodeProperty,
	responseDataProperty,
	responseModeProperty,
} from '../Webhook/description';
import { Webhook } from '../Webhook/Webhook.node';

const toWaitAmount: INodeProperties = {
	displayName: '等待时长',
	name: 'amount',
	type: 'number',
	typeOptions: {
		minValue: 0,
		numberPrecision: 2,
	},
	default: 1,
	description: '要等待的时间',
	validateType: 'number',
};

const unitSelector: INodeProperties = {
	displayName: '时间单位',
	name: 'unit',
	type: 'options',
	options: [
		{
			name: '秒',
			value: 'seconds',
		},
		{
			name: '分钟',
			value: 'minutes',
		},
		{
			name: '小时',
			value: 'hours',
		},
		{
			name: '天',
			value: 'days',
		},
	],
	default: 'hours',
	description: '等待时长值的时间单位',
};

const waitTimeProperties: INodeProperties[] = [
	{
		displayName: '限制等待时间',
		name: 'limitWaitTime',
		type: 'boolean',
		default: false,
		description: '是否限制此节点在恢复执行之前等待用户响应的时间',
		displayOptions: {
			show: {
				resume: ['webhook', 'form'],
			},
		},
	},
	{
		displayName: '限制类型',
		name: 'limitType',
		type: 'options',
		default: 'afterTimeInterval',
		description: '设置恢复执行的条件。可以是指定的日期或一段时间后',
		displayOptions: {
			show: {
				limitWaitTime: [true],
				resume: ['webhook', 'form'],
			},
		},
		options: [
			{
				name: '等待时间间隔后',
				description: '等待一定的时间',
				value: 'afterTimeInterval',
			},
			{
				name: '在指定时间',
				description: '等待到设定的日期和时间后继续',
				value: 'atSpecifiedTime',
			},
		],
	},
	{
		displayName: '时长',
		name: 'resumeAmount',
		type: 'number',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
				limitWaitTime: [true],
				resume: ['webhook', 'form'],
			},
		},
		typeOptions: {
			minValue: 0,
			numberPrecision: 2,
		},
		default: 1,
		description: '要等待的时间',
	},
	{
		displayName: '单位',
		name: 'resumeUnit',
		type: 'options',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
				limitWaitTime: [true],
				resume: ['webhook', 'form'],
			},
		},
		options: [
			{
				name: '秒',
				value: 'seconds',
			},
			{
				name: '分钟',
				value: 'minutes',
			},
			{
				name: '小时',
				value: 'hours',
			},
			{
				name: '天',
				value: 'days',
			},
		],
		default: 'hours',
		description: '间隔值的单位',
	},
	{
		displayName: '最大日期和时间',
		name: 'maxDateAndTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				limitType: ['atSpecifiedTime'],
				limitWaitTime: [true],
				resume: ['webhook', 'form'],
			},
		},
		default: '',
		description: '在指定的日期和时间后继续执行',
	},
];

const webhookSuffix: INodeProperties = {
	displayName: 'Webhook 后缀',
	name: 'webhookSuffix',
	type: 'string',
	default: '',
	placeholder: 'webhook',
	noDataExpression: true,
	description: '此后缀路径将附加到重启 URL。在使用多个等待节点时很有用',
};

const displayOnWebhook: IDisplayOptions = {
	show: {
		resume: ['webhook'],
	},
};

const displayOnFormSubmission = {
	show: {
		resume: ['form'],
	},
};

const onFormSubmitProperties = updateDisplayOptions(displayOnFormSubmission, [
	formTitle,
	formDescription,
	formFields,
	formRespondMode,
]);

const onWebhookCallProperties = updateDisplayOptions(displayOnWebhook, [
	{
		...httpMethodsProperty,
		description: 'The HTTP method of the Webhook call',
	},
	responseCodeProperty,
	responseModeProperty,
	responseDataProperty,
	responseBinaryPropertyNameProperty,
]);

const webhookPath = '={{$parameter["options"]["webhookSuffix"] || ""}}';

const waitingTooltip = (
	parameters: { resume: string; options?: Record<string, string> },
	resumeUrl: string,
	formResumeUrl: string,
) => {
	const resume = parameters.resume;

	if (['webhook', 'form'].includes(resume as string)) {
		const { webhookSuffix } = (parameters.options ?? {}) as { webhookSuffix: string };
		const suffix = webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';

		let message = '';
		const url = `${resume === 'form' ? formResumeUrl : resumeUrl}${suffix}`;

		if (resume === 'form') {
			message = '当在以下地址提交表单时将继续执行：';
		}

		if (resume === 'webhook') {
			message = '当在以下地址收到 webhook 时将继续执行：';
		}

		return `${message}<a href="${url}" target="_blank">${url}</a>`;
	}

	return '等待时间结束后将继续执行';
};

export class Wait extends Webhook {
	authPropertyName = 'incomingAuthentication';

	description: INodeTypeDescription = {
		displayName: '等待',
		name: 'wait',
		icon: 'fa:pause-circle',
		iconColor: 'crimson',
		group: ['organization'],
		version: [1, 1.1],
		description: '等待一段时间后再继续执行',
		defaults: {
			name: '等待',
			color: '#804050',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: credentialsProperty(this.authPropertyName),
		waitingNodeTooltip: `={{ (${waitingTooltip})($parameter, $execution.resumeUrl, $execution.resumeFormUrl) }}`,
		webhooks: [
			{
				...defaultWebhookDescription,
				responseData: '={{$parameter["responseData"]}}',
				path: webhookPath,
				restartWebhook: true,
			},
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: webhookPath,
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
				path: webhookPath,
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
		],
		properties: [
			{
				displayName: '恢复方式',
				name: 'resume',
				type: 'options',
				options: [
					{
						name: '等待时间间隔后',
						value: 'timeInterval',
						description: '等待一段时间',
					},
					{
						name: '在指定时间',
						value: 'specificTime',
						description: '等待到特定的日期和时间后继续',
					},
					{
						name: '收到 Webhook 调用时',
						value: 'webhook',
						description: '等待 webhook 调用后继续',
					},
					{
						name: '提交表单时',
						value: 'form',
						description: '等待表单提交后继续',
					},
				],
				default: 'timeInterval',
				description: '确定工作流继续之前使用的等待模式',
			},
			{
				displayName: '身份验证',
				name: 'incomingAuthentication',
				type: 'options',
				options: [
					{
						name: '基本认证',
						value: 'basicAuth',
					},
					{
						name: '无',
						value: 'none',
					},
				],
				default: 'none',
				description:
					'是否以及如何对发送到 $execution.resumeFormUrl 的恢复 webhook 请求进行身份验证以提供额外的安全性',
				displayOptions: {
					show: {
						resume: ['form'],
					},
				},
			},
			{
				...authenticationProperty(this.authPropertyName),
				description:
					'是否以及如何对发送到 $execution.resumeUrl 的恢复 webhook 请求进行身份验证以提供额外的安全性',
				displayOptions: displayOnWebhook,
			},

			// ----------------------------------
			//         resume:specificTime
			// ----------------------------------
			{
				displayName: '日期和时间',
				name: 'dateTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resume: ['specificTime'],
					},
				},
				default: '',
				description: '继续之前要等待的日期和时间',
				required: true,
			},

			// ----------------------------------
			//         resume:timeInterval
			// ----------------------------------
			{
				...toWaitAmount,
				displayOptions: {
					show: {
						resume: ['timeInterval'],
						'@version': [1],
					},
				},
			},
			{
				...toWaitAmount,
				default: 5,
				displayOptions: {
					show: {
						resume: ['timeInterval'],
					},
					hide: {
						'@version': [1],
					},
				},
			},
			{
				...unitSelector,
				displayOptions: {
					show: {
						resume: ['timeInterval'],
						'@version': [1],
					},
				},
			},
			{
				...unitSelector,
				default: 'seconds',
				displayOptions: {
					show: {
						resume: ['timeInterval'],
					},
					hide: {
						'@version': [1],
					},
				},
			},

			// ----------------------------------
			//         resume:webhook & form
			// ----------------------------------
			{
				displayName:
					'Webhook URL 将在运行时生成。可以使用 <strong>$execution.resumeUrl</strong> 变量引用它。在到达此节点之前将其发送到某处。<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">更多信息</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: displayOnWebhook,
				default: '',
			},
			{
				displayName:
					'表单 URL 将在运行时生成。可以使用 <strong>$execution.resumeFormUrl</strong> 变量引用它。在到达此节点之前将其发送到某处。<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">更多信息</a>',
				name: 'formNotice',
				type: 'notice',
				displayOptions: displayOnFormSubmission,
				default: '',
			},
			...onFormSubmitProperties,
			...onWebhookCallProperties,
			...waitTimeProperties,
			{
				...optionsProperty,
				displayOptions: displayOnWebhook,
				options: [...(optionsProperty.options as INodeProperties[]), webhookSuffix],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						resume: ['form'],
					},
					hide: {
						responseMode: ['responseNode'],
					},
				},
				options: [appendAttributionToForm, respondWithOptions, webhookSuffix],
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						resume: ['form'],
					},
					hide: {
						responseMode: ['onReceived', 'lastNode'],
					},
				},
				options: [appendAttributionToForm, webhookSuffix],
			},
		],
	};

	async webhook(context: IWebhookFunctions) {
		const resume = context.getNodeParameter('resume', 0) as string;
		if (resume === 'form') return await formWebhook(context, this.authPropertyName);
		return await super.webhook(context);
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resume = context.getNodeParameter('resume', 0) as string;

		if (['webhook', 'form'].includes(resume)) {
			let hasFormTrigger = false;

			if (resume === 'form') {
				const parentNodes = context.getParentNodes(context.getNode().name);
				hasFormTrigger = parentNodes.some((node) => node.type === FORM_TRIGGER_NODE_TYPE);
			}

			const returnData = await this.configureAndPutToWait(context);

			if (resume === 'form' && hasFormTrigger) {
				context.sendResponse({
					headers: {
						location: context.evaluateExpression('{{ $execution.resumeFormUrl }}', 0),
					},
					statusCode: 307,
				});
			}

			return returnData;
		}

		let waitTill: Date;
		if (resume === 'timeInterval') {
			const unit = context.getNodeParameter('unit', 0);

			if (!validateWaitUnit(unit)) {
				throw new NodeOperationError(
					context.getNode(),
					"无效的等待单位。有效单位为 'seconds'、'minutes'、'hours' 或 'days'",
				);
			}

			let waitAmount = context.getNodeParameter('amount', 0);

			if (!validateWaitAmount(waitAmount)) {
				throw new NodeOperationError(
					context.getNode(),
					'无效的等待时长。请输入大于或等于 0 的数字',
				);
			}

			if (unit === 'minutes') {
				waitAmount *= 60;
			}
			if (unit === 'hours') {
				waitAmount *= 60 * 60;
			}
			if (unit === 'days') {
				waitAmount *= 60 * 60 * 24;
			}

			waitAmount *= 1000;

			// Timezone does not change relative dates, since they are just
			// a number of seconds added to the current timestamp
			waitTill = new Date(new Date().getTime() + waitAmount);
		} else {
			try {
				const dateTimeStrRaw = context.getNodeParameter('dateTime', 0);
				const parsedDateTime = tryToParseDateTime(dateTimeStrRaw, context.getTimezone());

				waitTill = parsedDateTime.toUTC().toJSDate();
			} catch (e) {
				throw new NodeOperationError(
					context.getNode(),
					'无法将执行置于等待状态，因为 `dateTime` 参数不是有效的日期。请选择一个具体的日期和时间以等待到',
				);
			}
		}

		const waitValue = Math.max(waitTill.getTime() - new Date().getTime(), 0);

		if (waitValue < 65000) {
			// If wait time is shorter than 65 seconds leave execution active because
			// we just check the database every 60 seconds.
			return await new Promise((resolve) => {
				const timer = setTimeout(() => resolve([context.getInputData()]), waitValue);
				context.onExecutionCancellation(() => clearTimeout(timer));
			});
		}

		// If longer than 65 seconds put execution to wait
		return await this.putToWait(context, waitTill);
	}

	private async configureAndPutToWait(context: IExecuteFunctions) {
		let waitTill = WAIT_INDEFINITELY;
		const limitWaitTime = context.getNodeParameter('limitWaitTime', 0);

		if (limitWaitTime === true) {
			const limitType = context.getNodeParameter('limitType', 0);

			if (limitType === 'afterTimeInterval') {
				let waitAmount = context.getNodeParameter('resumeAmount', 0) as number;
				const resumeUnit = context.getNodeParameter('resumeUnit', 0);

				if (resumeUnit === 'minutes') {
					waitAmount *= 60;
				}
				if (resumeUnit === 'hours') {
					waitAmount *= 60 * 60;
				}
				if (resumeUnit === 'days') {
					waitAmount *= 60 * 60 * 24;
				}

				waitAmount *= 1000;
				waitTill = new Date(new Date().getTime() + waitAmount);
			} else {
				waitTill = new Date(context.getNodeParameter('maxDateAndTime', 0) as string);
			}
		}

		return await this.putToWait(context, waitTill);
	}

	private async putToWait(context: IExecuteFunctions, waitTill: Date) {
		await context.putExecutionToWait(waitTill);
		return [context.getInputData()];
	}
}
