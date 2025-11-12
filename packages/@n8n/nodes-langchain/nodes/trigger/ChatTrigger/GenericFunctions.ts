import type { IWebhookFunctions } from 'n8n-workflow';

import { ChatTriggerAuthorizationError } from './error';
import type { AuthenticationChatOption } from './types';

export async function validateAuth(context: IWebhookFunctions) {
	const authentication = context.getNodeParameter('authentication') as AuthenticationChatOption;
	const headers = context.getHeaderData();

	if (authentication === 'none') {
		return;
	} else if (authentication === 'basicAuth') {
		// Note: Basic auth credentials system has been removed
		throw new ChatTriggerAuthorizationError(500, 'Basic authentication is no longer supported');
	} else if (authentication === 'n8nUserAuth') {
		const webhookName = context.getWebhookName();

		function getCookie(name: string) {
			const value = `; ${headers.cookie}`;
			const parts = value.split(`; ${name}=`);

			if (parts.length === 2) {
				return parts.pop()?.split(';').shift();
			}
			return '';
		}

		const authCookie = getCookie('n8n-auth');
		if (!authCookie && webhookName !== 'setup') {
			// Data is not defined on node so can not authenticate
			throw new ChatTriggerAuthorizationError(500, 'User not authenticated!');
		}
	}

	return;
}
