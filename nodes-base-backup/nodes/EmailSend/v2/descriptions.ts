import type { INodeProperties } from 'n8n-workflow';

export const fromEmailProperty: INodeProperties = {
	displayName: '发件人邮箱',
	name: 'fromEmail',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'admin@example.com',
	description: '发件人的电子邮件地址。您也可以指定名称：张三 &lt;nate@n8n.io&gt;',
};

export const toEmailProperty: INodeProperties = {
	displayName: '收件人邮箱',
	name: 'toEmail',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'info@example.com',
	description: '收件人的电子邮件地址。您也可以指定名称：张三 &lt;nate@n8n.io&gt;',
};
