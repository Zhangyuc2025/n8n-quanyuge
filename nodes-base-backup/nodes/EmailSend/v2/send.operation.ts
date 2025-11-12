import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createUtmCampaignLink, updateDisplayOptions } from '@utils/utilities';

import { fromEmailProperty, toEmailProperty } from './descriptions';
import { configureTransport, type EmailSendOptions } from './utils';
import { appendAttributionOption } from '../../../utils/descriptions';

const properties: INodeProperties[] = [
	// TODO: Add choice for text as text or html  (maybe also from name)
	fromEmailProperty,
	toEmailProperty,

	{
		displayName: '主题',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: '我的主题行',
		description: '电子邮件的主题行',
	},
	{
		displayName: '邮件格式',
		name: 'emailFormat',
		type: 'options',
		options: [
			{
				name: '纯文本',
				value: 'text',
				description: '以纯文本格式发送邮件',
			},
			{
				name: 'HTML',
				value: 'html',
				description: '以 HTML 格式发送邮件',
			},
			{
				name: '两者都发',
				value: 'both',
				description: '发送两种格式，收件人的客户端选择要显示的版本',
			},
		],
		default: 'html',
		displayOptions: {
			hide: {
				'@version': [2],
			},
		},
	},
	{
		displayName: '邮件格式',
		name: 'emailFormat',
		type: 'options',
		options: [
			{
				name: '纯文本',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: '两者都发',
				value: 'both',
			},
		],
		default: 'text',
		displayOptions: {
			show: {
				'@version': [2],
			},
		},
	},
	{
		displayName: '文本内容',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: '邮件的纯文本内容',
		displayOptions: {
			show: {
				emailFormat: ['text', 'both'],
			},
		},
	},
	{
		displayName: 'HTML 内容',
		name: 'html',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: '邮件的 HTML 内容',
		displayOptions: {
			show: {
				emailFormat: ['html', 'both'],
			},
		},
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				...appendAttributionOption,
				description: '是否在邮件末尾包含"此邮件由 n8n 自动发送"的说明',
			},
			{
				displayName: '附件',
				name: 'attachments',
				type: 'string',
				default: '',
				description:
					'包含要作为附件添加到邮件的数据的二进制属性名称。多个属性可以用逗号分隔。引用邮件正文中嵌入的图像或其他内容，例如：&lt;img src="cid:image_1"&gt;',
			},
			{
				displayName: '抄送邮箱',
				name: 'ccEmail',
				type: 'string',
				default: '',
				placeholder: 'cc@example.com',
				description: '抄送收件人的电子邮件地址',
			},
			{
				displayName: '密送邮箱',
				name: 'bccEmail',
				type: 'string',
				default: '',
				placeholder: 'bcc@example.com',
				description: '密送收件人的电子邮件地址',
			},
			{
				displayName: '忽略 SSL 问题（不安全）',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: '即使 SSL 证书验证失败也进行连接',
			},
			{
				displayName: '回复地址',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'info@example.com',
				description: '用于接收回复的电子邮件地址',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['email'],
		operation: ['send'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	const instanceId = this.getInstanceId();
	const credentials = await this.getCredentials('smtp');

	const returnData: INodeExecutionData[] = [];
	let item: INodeExecutionData;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			item = items[itemIndex];

			const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
			const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
			const subject = this.getNodeParameter('subject', itemIndex) as string;
			const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as EmailSendOptions;

			const transporter = configureTransport(credentials, options);

			const mailOptions: IDataObject = {
				from: fromEmail,
				to: toEmail,
				cc: options.ccEmail,
				bcc: options.bccEmail,
				subject,
				replyTo: options.replyTo,
			};

			if (emailFormat === 'text' || emailFormat === 'both') {
				mailOptions.text = this.getNodeParameter('text', itemIndex, '');
			}

			if (emailFormat === 'html' || emailFormat === 'both') {
				mailOptions.html = this.getNodeParameter('html', itemIndex, '');
			}

			let appendAttribution = options.appendAttribution;
			if (appendAttribution === undefined) {
				appendAttribution = nodeVersion >= 2.1;
			}

			if (appendAttribution) {
				const attributionText = 'This email was sent automatically with ';
				const link = createUtmCampaignLink('n8n-nodes-base.emailSend', instanceId);
				if (emailFormat === 'html' || (emailFormat === 'both' && mailOptions.html)) {
					mailOptions.html = `
					${mailOptions.html}
					<br>
					<br>
					---
					<br>
					<em>${attributionText}<a href="${link}" target="_blank">n8n</a></em>
					`;
				} else {
					mailOptions.text = `${mailOptions.text}\n\n---\n${attributionText}n8n\n${'https://n8n.io'}`;
				}
			}

			if (options.attachments && item.binary) {
				const attachments = [];
				const attachmentProperties: string[] = options.attachments
					.split(',')
					.map((propertyName) => {
						return propertyName.trim();
					});

				for (const propertyName of attachmentProperties) {
					const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
					attachments.push({
						filename: binaryData.fileName || 'unknown',
						content: await this.helpers.getBinaryDataBuffer(itemIndex, propertyName),
						cid: propertyName,
					});
				}

				if (attachments.length) {
					mailOptions.attachments = attachments;
				}
			}

			const info = await transporter.sendMail(mailOptions);

			returnData.push({
				json: info as unknown as IDataObject,
				pairedItem: {
					item: itemIndex,
				},
			});
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			delete error.cert;
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	return [returnData];
}
