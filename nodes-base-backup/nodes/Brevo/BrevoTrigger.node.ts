/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	NodeConnectionTypes,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { BrevoWebhookApi } from './GenericFunctions';

export class BrevoTrigger implements INodeType {
	description: INodeTypeDescription = {
		credentials: [
			{
				name: 'sendInBlueApi',
				required: true,
				displayOptions: {
					show: {},
				},
			},
		],
		displayName: 'Brevo 触发器',
		defaults: {
			name: 'Brevo 触发器',
		},
		description: '当 Brevo 事件发生时启动工作流',
		group: ['trigger'],
		icon: 'file:brevo.svg',
		inputs: [],
		// keep sendinblue name for backward compatibility
		name: 'sendInBlueTrigger',
		outputs: [NodeConnectionTypes.Main],
		version: 1,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhooks',
			},
		],
		properties: [
			{
				displayName: '资源',
				default: 'transactional',
				name: 'type',
				options: [
					{ name: '入站邮件', value: 'inbound' },
					{ name: '营销邮件', value: 'marketing' },
					{ name: '事务性邮件', value: 'transactional' },
				],
				required: true,
				type: 'options',
			},
			{
				displayName: '触发条件',
				displayOptions: {
					show: {
						type: ['transactional'],
					},
				},
				name: 'events',
				placeholder: '添加事件',
				options: [
					{
						name: '邮件被阻止',
						value: 'blocked',
						description: '当事务性电子邮件被阻止时触发',
					},
					{
						name: '邮件被点击',
						value: 'click',
						description: '当事务性电子邮件被点击时触发',
					},
					{
						name: '邮件被延迟',
						value: 'deferred',
						description: '当事务性电子邮件被延迟时触发',
					},
					{
						name: '邮件已送达',
						value: 'delivered',
						description: '当事务性电子邮件已送达时触发',
					},
					{
						name: '邮件硬退回',
						value: 'hardBounce',
						description: '当事务性电子邮件硬退回时触发',
					},
					{
						name: '邮件无效',
						value: 'invalid',
						description: '当事务性电子邮件无效时触发',
					},
					{
						name: '邮件被标记为垃圾邮件',
						value: 'spam',
						description: '当事务性电子邮件被设置为垃圾邮件时触发',
					},
					{
						name: '邮件已打开',
						value: 'opened',
						description: '当事务性电子邮件被打开时触发',
					},
					{
						name: '邮件已发送',
						value: 'request',
						description: '当事务性电子邮件已发送时触发',
					},
					{
						name: '邮件软退回',
						value: 'softBounce',
						description: '当事务性电子邮件软退回时触发',
					},
					{
						name: '邮件唯一打开',
						value: 'uniqueOpened',
						description: '当事务性电子邮件首次被打开时触发',
					},
					{
						name: '邮件已取消订阅',
						value: 'unsubscribed',
						description: '当事务性电子邮件被取消订阅时触发',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
			{
				displayName: '触发条件',
				displayOptions: {
					show: {
						type: ['marketing'],
					},
				},
				name: 'events',
				placeholder: '添加事件',
				options: [
					{
						name: '营销邮件被点击',
						value: 'click',
						description: '当营销电子邮件被点击时触发',
					},
					{
						name: '营销邮件已送达',
						value: 'delivered',
						description: '当营销电子邮件已送达时触发',
					},
					{
						name: '营销邮件硬退回',
						value: 'hardBounce',
						description: '当营销电子邮件硬退回时触发',
					},
					{
						name: '营销邮件列表添加',
						value: 'listAddition',
						description: '当营销电子邮件被添加到列表时触发',
					},
					{
						name: '营销邮件已打开',
						value: 'opened',
						description: '当营销电子邮件被打开时触发',
					},
					{
						name: '营销邮件软退回',
						value: 'softBounce',
						description: '当营销电子邮件软退回时触发',
					},
					{
						name: '营销邮件标记为垃圾邮件',
						value: 'spam',
						description: '当营销电子邮件被标记为垃圾邮件时触发',
					},
					{
						name: '营销邮件已取消订阅',
						value: 'unsubscribed',
						description: '当营销电子邮件被取消订阅时触发',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
			{
				displayName: '触发条件',
				displayOptions: {
					show: {
						type: ['inbound'],
					},
				},
				name: 'events',
				placeholder: '添加事件',
				options: [
					{
						name: '入站邮件已处理',
						value: 'inboundEmailProcessed',
						description: '当入站电子邮件被处理时触发',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				try {
					const { webhooks } = await BrevoWebhookApi.fetchWebhooks(this, type);

					for (const webhook of webhooks) {
						if (
							webhook.type === type &&
							webhook.events.every((event) => events.includes(event)) &&
							webhookUrl === webhook.url
						) {
							webhookData.webhookId = webhook.id;
							return true;
						}
					}
					// If it did not error then the webhook exists
					return false;
				} catch (err) {
					return false;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				const responseData = await BrevoWebhookApi.createWebHook(this, type, events, webhookUrl);

				if (responseData?.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await BrevoWebhookApi.deleteWebhook(this, webhookData.webhookId as string);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.hookSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// The data to return and so start the workflow with
		const bodyData = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
