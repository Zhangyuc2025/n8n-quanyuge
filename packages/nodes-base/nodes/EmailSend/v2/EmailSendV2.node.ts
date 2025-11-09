import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import * as send from './send.operation';
import * as sendAndWait from './sendAndWait.operation';
import { smtpConnectionTest } from './utils';
import { sendAndWaitWebhooksDescription } from '../../../utils/sendAndWait/descriptions';
import {
	SEND_AND_WAIT_WAITING_TOOLTIP,
	sendAndWaitWebhook,
} from '../../../utils/sendAndWait/utils';

export const versionDescription: INodeTypeDescription = {
	displayName: '发送邮件',
	name: 'emailSend',
	icon: 'fa:envelope',
	group: ['output'],
	version: [2, 2.1],
	description: '使用 SMTP 协议发送电子邮件',
	defaults: {
		name: '发送邮件',
		color: '#00bb88',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'smtp',
			required: true,
			testedBy: 'smtpConnectionTest',
		},
	],
	waitingNodeTooltip: SEND_AND_WAIT_WAITING_TOOLTIP,
	webhooks: sendAndWaitWebhooksDescription,
	properties: [
		{
			displayName: '资源',
			name: 'resource',
			type: 'hidden',
			noDataExpression: true,
			default: 'email',
			options: [
				{
					name: '电子邮件',
					value: 'email',
				},
			],
		},
		{
			displayName: '操作',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			default: 'send',
			options: [
				{
					name: '发送',
					value: 'send',
					action: '发送邮件',
				},
				{
					name: '发送并等待响应',
					value: SEND_AND_WAIT_OPERATION,
					action: '发送邮件并等待响应',
				},
			],
		},
		...send.description,
		...sendAndWait.description,
	],
};

export class EmailSendV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		credentialTest: { smtpConnectionTest },
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];
		const operation = this.getNodeParameter('operation', 0);

		if (operation === SEND_AND_WAIT_OPERATION) {
			returnData = await sendAndWait.execute.call(this);
		}

		if (operation === 'send') {
			returnData = await send.execute.call(this);
		}

		return returnData;
	}
}
