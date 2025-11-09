/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { attributeFields, attributeOperations } from './AttributeDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { emailFields, emailOperations } from './EmailDescription';
import { senderFields, senderOperations } from './SenderDescrition';

export class Brevo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brevo',
		// keep sendinblue name for backward compatibility
		name: 'sendInBlue',
		icon: 'file:brevo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '调用 Brevo API',
		defaults: {
			name: 'Brevo',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'sendInBlueApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.brevo.com',
		},
		properties: [
			{
				displayName: '资源',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '联系人',
						value: 'contact',
					},
					{
						name: '联系人属性',
						value: 'attribute',
					},
					{
						name: '电子邮件',
						value: 'email',
					},
					{
						name: '发件人',
						value: 'sender',
					},
				],
				default: 'email',
			},

			...attributeOperations,
			...attributeFields,
			...senderOperations,
			...senderFields,
			...contactOperations,
			...contactFields,
			...emailOperations,
			...emailFields,
		],
	};
}
