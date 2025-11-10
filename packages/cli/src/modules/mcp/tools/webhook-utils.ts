import type { INode } from 'n8n-workflow';

export type WebhookEndpoints = {
	webhook: string;
	webhookTest: string;
};

type WebhookCredentialRequirement =
	| { type: 'none' }
	| { type: 'basic' }
	| { type: 'header' }
	| { type: 'jwt' };

type WebhookNodeDetails = {
	nodeName: string;
	baseUrl: string;
	productionPath: string;
	testPath: string;
	httpMethod: string;
	responseModeDescription: string;
	credentials: WebhookCredentialRequirement;
};

// Normalizes endpoint segment (strips leading/trailing slashes) and joins with the node path.
export const buildWebhookPath = (segment: string, pathParam: string) => {
	let normalizedSegment = segment;
	while (normalizedSegment.startsWith('/')) normalizedSegment = normalizedSegment.slice(1);
	while (normalizedSegment.endsWith('/')) normalizedSegment = normalizedSegment.slice(0, -1);
	const basePath = normalizedSegment ? `/${normalizedSegment}/` : '/';
	return `${basePath}${pathParam}`;
};

/**
 * Creates a detailed textual description of the webhook triggers in a workflow, including URLs, methods, authentication, and response modes.
 * This helps MCP clients understand how craft a request to trigger the workflow.
 * @returns A detailed string description of the webhook triggers in the workflow.
 */
export const getWebhookDetails = async (
	webhookNodes: INode[],
	baseUrl: string,
	endpoints: WebhookEndpoints,
): Promise<string> => {
	if (webhookNodes.length === 0) {
		return 'This workflow does not have a trigger node that can be executed via MCP.';
	}

	const nodeDetails = await Promise.all(
		webhookNodes.map(async (node) => await collectWebhookNodeDetails(node, baseUrl, endpoints)),
	);

	return formatWebhookDetails(nodeDetails);
};

const collectWebhookNodeDetails = async (
	node: INode,
	baseUrl: string,
	endpoints: WebhookEndpoints,
): Promise<WebhookNodeDetails> => {
	const pathParam = typeof node.parameters.path === 'string' ? node.parameters.path : '';
	const httpMethod =
		typeof node.parameters.httpMethod === 'string' ? node.parameters.httpMethod : 'GET';

	return {
		nodeName: node.name,
		baseUrl,
		productionPath: buildWebhookPath(endpoints.webhook, pathParam),
		testPath: buildWebhookPath(endpoints.webhookTest, pathParam),
		httpMethod,
		responseModeDescription: getResponseModeDescription(node),
		credentials: resolveCredentialRequirement(node),
	};
};

const formatWebhookDetails = (details: WebhookNodeDetails[]): string => {
	const header = 'This workflow is triggered by the following webhook(s):\n\n';
	const triggers = details
		.map((detail, index) => formatTriggerDescription(detail, index))
		.join('\n\n');
	return header + triggers;
};

const formatTriggerDescription = (detail: WebhookNodeDetails, index: number): string => `
				<trigger ${index + 1}>
				\t - Node name: ${detail.nodeName}
				\t - Base URL: ${detail.baseUrl}
				\t - Production path: ${detail.productionPath}
				\t - Test path: ${detail.testPath}
				\t - HTTP Method: ${detail.httpMethod}
				\t - Response Mode: ${detail.responseModeDescription}
				${formatCredentialRequirement(detail.credentials)}
				</trigger ${index + 1}>`;

const formatCredentialRequirement = (requirement: WebhookCredentialRequirement): string => {
	switch (requirement.type) {
		case 'basic':
			return '\t - Credentials: \n\t - This webhook requires basic authentication with a username and password that should be provided by the user.';
		case 'header':
			return '\t - Credentials: \n\t - This webhook requires a custom header for authentication that should be provided by the user.';
		case 'jwt':
			return '\t - Credentials: \n\t - This webhook requires JWT authentication that should be provided by the user.';
		default:
			return '\t - No credentials required for this webhook.';
	}
};

const resolveCredentialRequirement = (node: INode): WebhookCredentialRequirement => {
	const authType =
		typeof node.parameters.authentication === 'string' ? node.parameters.authentication : undefined;

	switch (authType) {
		case 'basicAuth':
			return { type: 'basic' };
		case 'headerAuth':
			return { type: 'header' };
		case 'jwtAuth':
			return { type: 'jwt' };
		default:
			return { type: 'none' };
	}
};

const getResponseModeDescription = (node: INode): string => {
	const responseMode =
		typeof node.parameters.responseMode === 'string' ? node.parameters.responseMode : undefined;

	if (responseMode === 'responseNode') {
		return 'Webhook is configured to respond using "Respond to Webhook" node.';
	}

	if (responseMode === 'lastNode') {
		const responseData =
			typeof node.parameters.responseData === 'string' ? node.parameters.responseData : undefined;
		const base = 'Webhook is configured to respond when the last node is executed. ';
		switch (responseData) {
			case 'allEntries':
				return base + 'Returns all the entries of the last node. Always returns an array.';
			case 'firstEntryBinary':
				return (
					base +
					'Returns the binary data of the first entry of the last node. Always returns a binary file.'
				);
			case 'noData':
				return base + 'Returns without a body.';
			default:
				return (
					base +
					'Returns the JSON data of the first entry of the last node. Always returns a JSON object.'
				);
		}
	}

	return 'Webhook is configured to respond immediately with the message "Workflow got started."';
};
