import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const versionDescription: INodeTypeDescription = {
	displayName: '发送邮件',
	name: 'emailSend',
	icon: 'fa:envelope',
	group: ['output'],
	version: 1,
	description: '发送电子邮件',
	defaults: {
		name: '发送邮件',
		color: '#00bb88',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'smtp',
			required: true,
		},
	],
	properties: [
		// TODO: Add choice for text as text or html  (maybe also from name)
		{
			displayName: '发件人邮箱',
			name: 'fromEmail',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'admin@example.com',
			description: '发件人的电子邮件地址，可选包含名称',
		},
		{
			displayName: '收件人邮箱',
			name: 'toEmail',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'info@example.com',
			description: '收件人的电子邮件地址',
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
			displayName: '主题',
			name: 'subject',
			type: 'string',
			default: '',
			placeholder: '我的主题行',
			description: '电子邮件的主题行',
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
		},
		{
			displayName: '附件',
			name: 'attachments',
			type: 'string',
			default: '',
			description: '包含要作为附件添加到邮件的数据的二进制属性名称。多个属性可以用逗号分隔',
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
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
	],
};

export class EmailSendV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				item = items[itemIndex];

				const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
				const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
				const ccEmail = this.getNodeParameter('ccEmail', itemIndex) as string;
				const bccEmail = this.getNodeParameter('bccEmail', itemIndex) as string;
				const subject = this.getNodeParameter('subject', itemIndex) as string;
				const text = this.getNodeParameter('text', itemIndex) as string;
				const html = this.getNodeParameter('html', itemIndex) as string;
				const attachmentPropertyString = this.getNodeParameter('attachments', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {});

				const credentials = await this.getCredentials('smtp');

				const connectionOptions: SMTPTransport.Options = {
					host: credentials.host as string,
					port: credentials.port as number,
					secure: credentials.secure as boolean,
				};

				if (credentials.user || credentials.password) {
					connectionOptions.auth = {
						user: credentials.user as string,
						pass: credentials.password as string,
					};
				}

				if (options.allowUnauthorizedCerts === true) {
					connectionOptions.tls = {
						rejectUnauthorized: false,
					};
				}

				const transporter = createTransport(connectionOptions);

				// setup email data with unicode symbols
				const mailOptions: IDataObject = {
					from: fromEmail,
					to: toEmail,
					cc: ccEmail,
					bcc: bccEmail,
					subject,
					text,
					html,
					replyTo: options.replyTo as string | undefined,
				};

				if (attachmentPropertyString && item.binary) {
					const attachments = [];
					const attachmentProperties: string[] = attachmentPropertyString
						.split(',')
						.map((propertyName) => {
							return propertyName.trim();
						});

					for (const propertyName of attachmentProperties) {
						const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
						attachments.push({
							filename: binaryData.fileName || 'unknown',
							content: await this.helpers.getBinaryDataBuffer(itemIndex, propertyName),
						});
					}

					if (attachments.length) {
						mailOptions.attachments = attachments;
					}
				}

				// Send the email
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
				throw error;
			}
		}

		return [returnData];
	}
}
