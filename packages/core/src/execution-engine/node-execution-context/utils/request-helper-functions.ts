/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Logger } from '@n8n/backend-common';
import type {
	ClientOAuth2Options,
	ClientOAuth2RequestObject,
	ClientOAuth2TokenData,
	OAuth2CredentialData,
} from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import { Container } from '@n8n/di';
import type { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import crypto, { createHmac } from 'crypto';
import FormData from 'form-data';
import { IncomingMessage } from 'http';
import { type AgentOptions } from 'https';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import {
	NodeApiError,
	NodeOperationError,
	NodeSslError,
	isObjectEmpty,
	ExecutionBaseError,
	jsonParse,
	ApplicationError,
	sleep,
} from 'n8n-workflow';
import type {
	GenericValue,
	IAllExecuteFunctions,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeExecutionData,
	IOAuth2Options,
	IRequestOptions,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	PaginationOptions,
	RequestHelperFunctions,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import type { Token } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';
import { stringify } from 'qs';
import { Readable } from 'stream';

import { createHttpProxyAgent, createHttpsProxyAgent } from '@/http-proxy';
import type { IResponseError } from '@/interfaces';

import { binaryToString } from './binary-helper-functions';
import { parseIncomingMessage } from './parse-incoming-message';

axios.defaults.timeout = 300000;
// Prevent axios from adding x-form-www-urlencoded headers by default
axios.defaults.headers.post = {};
axios.defaults.headers.put = {};
axios.defaults.headers.patch = {};
axios.defaults.paramsSerializer = (params) => {
	if (params instanceof URLSearchParams) {
		return params.toString();
	}
	return stringify(params, { arrayFormat: 'indices' });
};
// Disable axios proxy, we handle it ourselves
// Axios proxy option has problems: https://github.com/axios/axios/issues/4531
axios.defaults.proxy = false;

function validateUrl(url?: string): boolean {
	if (!url) return false;
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

function getUrlFromProxyConfig(proxyConfig: IHttpRequestOptions['proxy'] | string): string | null {
	if (typeof proxyConfig === 'string') {
		return validateUrl(proxyConfig) ? proxyConfig : null;
	}

	if (!proxyConfig?.host) return null;

	const { protocol, host, port, auth } = proxyConfig;
	const safeProtocol = protocol?.endsWith(':') ? protocol.slice(0, -1) : (protocol ?? 'http');

	try {
		const url = new URL(`${safeProtocol}://${host}`);
		if (port !== undefined) url.port = String(port);
		if (auth?.username) {
			url.username = auth.username;
			url.password = auth.password ?? '';
		}
		return url.href;
	} catch {
		return null;
	}
}

function buildTargetUrl(url?: string, baseURL?: string): string | undefined {
	if (!url) return undefined;

	try {
		return baseURL ? new URL(url, baseURL).href : url;
	} catch {
		return undefined;
	}
}

function setAxiosAgents(
	config: AxiosRequestConfig,
	agentOptions?: AgentOptions,
	proxyConfig?: IHttpRequestOptions['proxy'] | string,
): void {
	if (config.httpAgent || config.httpsAgent) return;

	const customProxyUrl = getUrlFromProxyConfig(proxyConfig);

	const targetUrl = buildTargetUrl(config.url, config.baseURL);

	if (!targetUrl) return;

	config.httpAgent = createHttpProxyAgent(customProxyUrl, targetUrl, agentOptions);
	config.httpsAgent = createHttpsProxyAgent(customProxyUrl, targetUrl, agentOptions);
}

axios.interceptors.request.use((config) => {
	// If no content-type is set by us, prevent axios from force-setting the content-type to `application/x-www-form-urlencoded`
	if (config.data === undefined) {
		config.headers.setContentType(false, false);
	}

	setAxiosAgents(config);

	return config;
});

function searchForHeader(config: AxiosRequestConfig, headerName: string) {
	if (config.headers === undefined) {
		return undefined;
	}

	const headerNames = Object.keys(config.headers);
	headerName = headerName.toLowerCase();
	return headerNames.find((thisHeader) => thisHeader.toLowerCase() === headerName);
}

const getHostFromRequestObject = (
	requestObject: Partial<{
		url: string;
		uri: string;
		baseURL: string;
	}>,
): string | null => {
	try {
		const url = (requestObject.url ?? requestObject.uri) as string;
		return new URL(url, requestObject.baseURL).hostname;
	} catch (error) {
		return null;
	}
};

const getBeforeRedirectFn =
	(
		agentOptions: AgentOptions,
		axiosConfig: AxiosRequestConfig,
		proxyConfig: IHttpRequestOptions['proxy'] | string | undefined,
	) =>
	(redirectedRequest: Record<string, any>) => {
		const redirectAgentOptions = {
			...agentOptions,
			servername: redirectedRequest.hostname,
		};
		const customProxyUrl = getUrlFromProxyConfig(proxyConfig);

		// Create both agents and set them
		const targetUrl = redirectedRequest.href;
		const httpAgent = createHttpProxyAgent(customProxyUrl, targetUrl, redirectAgentOptions);
		const httpsAgent = createHttpsProxyAgent(customProxyUrl, targetUrl, redirectAgentOptions);

		redirectedRequest.agent = redirectedRequest.href.startsWith('https://')
			? httpsAgent
			: httpAgent;
		redirectedRequest.agents = { http: httpAgent, https: httpsAgent };

		// Copy auth headers
		if (axiosConfig.headers?.Authorization) {
			redirectedRequest.headers.Authorization = axiosConfig.headers.Authorization;
		}
		if (axiosConfig.auth) {
			redirectedRequest.auth = `${axiosConfig.auth.username}:${axiosConfig.auth.password}`;
		}
	};

function digestAuthAxiosConfig(
	axiosConfig: AxiosRequestConfig,
	response: AxiosResponse,
	auth: AxiosRequestConfig['auth'],
): AxiosRequestConfig {
	const authDetails = response.headers['www-authenticate']
		.split(',')
		.map((v: string) => v.split('='));
	if (authDetails) {
		const nonceCount = '000000001';
		const cnonce = crypto.randomBytes(24).toString('hex');
		const realm: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('realm') > -1)[1]
			.replace(/"/g, '');
		// If authDetails does not have opaque, we should not add it to authorization.
		const opaqueKV = authDetails.find((el: any) => el[0].toLowerCase().indexOf('opaque') > -1);
		const opaque: string = opaqueKV ? opaqueKV[1].replace(/"/g, '') : undefined;
		const nonce: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('nonce') > -1)[1]
			.replace(/"/g, '');
		const ha1 = crypto
			.createHash('md5')
			.update(`${auth?.username as string}:${realm}:${auth?.password as string}`)
			.digest('hex');
		const url = new URL(axios.getUri(axiosConfig));
		const path = url.pathname + url.search;
		const ha2 = crypto
			.createHash('md5')
			.update(`${axiosConfig.method ?? 'GET'}:${path}`)
			.digest('hex');
		const response = crypto
			.createHash('md5')
			.update(`${ha1}:${nonce}:${nonceCount}:${cnonce}:auth:${ha2}`)
			.digest('hex');
		let authorization =
			`Digest username="${auth?.username as string}",realm="${realm}",` +
			`nonce="${nonce}",uri="${path}",qop="auth",algorithm="MD5",` +
			`response="${response}",nc="${nonceCount}",cnonce="${cnonce}"`;
		// Only when opaque exists, add it to authorization.
		if (opaque) {
			authorization += `,opaque="${opaque}"`;
		}
		if (axiosConfig.headers) {
			axiosConfig.headers.authorization = authorization;
		} else {
			axiosConfig.headers = { authorization };
		}
	}
	return axiosConfig;
}

export async function invokeAxios(
	axiosConfig: AxiosRequestConfig,
	authOptions: IRequestOptions['auth'] = {},
) {
	try {
		return await axios(axiosConfig);
	} catch (error) {
		if (authOptions.sendImmediately !== false || !(error instanceof axios.AxiosError)) throw error;
		// for digest-auth
		const { response } = error;
		if (response?.status !== 401 || !response.headers['www-authenticate']?.includes('nonce')) {
			throw error;
		}
		const { auth } = axiosConfig;
		delete axiosConfig.auth;
		axiosConfig = digestAuthAxiosConfig(axiosConfig, response, auth);
		return await axios(axiosConfig);
	}
}

const pushFormDataValue = (form: FormData, key: string, value: any) => {
	if (value?.hasOwnProperty('value') && value.hasOwnProperty('options')) {
		form.append(key, value.value, value.options);
	} else {
		form.append(key, value);
	}
};

export const createFormDataObject = (data: Record<string, unknown>) => {
	const formData = new FormData();
	const keys = Object.keys(data);
	keys.forEach((key) => {
		const formField = data[key];

		if (formField instanceof Array) {
			formField.forEach((item) => {
				pushFormDataValue(formData, key, item);
			});
		} else {
			pushFormDataValue(formData, key, formField);
		}
	});
	return formData;
};

async function generateContentLengthHeader(config: AxiosRequestConfig) {
	if (!(config.data instanceof FormData)) {
		return;
	}
	try {
		const length = await new Promise<number>((res, rej) => {
			config.data.getLength((error: Error | null, dataLength: number) => {
				if (error) rej(error);
				else res(dataLength);
			});
		});
		config.headers = {
			...config.headers,
			'content-length': length,
		};
	} catch (error) {
		Container.get(Logger).error('Unable to calculate form data length', { error });
	}
}

/**
 * This function is a temporary implementation that translates all http requests
 * done via the request library to axios directly.
 * We are not using n8n's interface as it would an unnecessary step,
 * considering the `request` helper has been be deprecated and should be removed.
 * @deprecated This is only used by legacy request helpers, that are also deprecated
 */
// eslint-disable-next-line complexity
export async function parseRequestObject(requestObject: IRequestOptions) {
	const axiosConfig: AxiosRequestConfig = {};

	if (requestObject.headers !== undefined) {
		axiosConfig.headers = requestObject.headers as AxiosHeaders;
	}

	// Let's start parsing the hardest part, which is the request body.
	// The process here is as following?
	// - Check if we have a `content-type` header. If this was set,
	//   we will follow
	// - Check if the `form` property was set. If yes, then it's x-www-form-urlencoded
	// - Check if the `formData` property exists. If yes, then it's multipart/form-data
	// - Lastly, we should have a regular `body` that is probably a JSON.

	const contentTypeHeaderKeyName =
		axiosConfig.headers &&
		Object.keys(axiosConfig.headers).find(
			(headerName) => headerName.toLowerCase() === 'content-type',
		);
	const contentType =
		contentTypeHeaderKeyName &&
		(axiosConfig.headers?.[contentTypeHeaderKeyName] as string | undefined);
	if (contentType === 'application/x-www-form-urlencoded' && requestObject.formData === undefined) {
		// there are nodes incorrectly created, informing the content type header
		// and also using formData. Request lib takes precedence for the formData.
		// We will do the same.
		// Merge body and form properties.
		if (typeof requestObject.body === 'string') {
			axiosConfig.data = requestObject.body;
		} else {
			const allData = Object.assign(requestObject.body || {}, requestObject.form || {}) as Record<
				string,
				string
			>;
			if (requestObject.useQuerystring === true) {
				axiosConfig.data = stringify(allData, { arrayFormat: 'repeat' });
			} else {
				axiosConfig.data = stringify(allData);
			}
		}
	} else if (contentType?.includes('multipart/form-data')) {
		if (requestObject.formData !== undefined && requestObject.formData instanceof FormData) {
			axiosConfig.data = requestObject.formData;
		} else {
			const allData: Partial<FormData> = {
				...(requestObject.body as object | undefined),
				...(requestObject.formData as object | undefined),
			};

			axiosConfig.data = createFormDataObject(allData);
		}
		// replace the existing header with a new one that
		// contains the boundary property.
		delete axiosConfig.headers?.[contentTypeHeaderKeyName!];

		const headers = axiosConfig.data.getHeaders();

		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, headers);
		await generateContentLengthHeader(axiosConfig);
	} else {
		// When using the `form` property it means the content should be x-www-form-urlencoded.
		if (requestObject.form !== undefined && requestObject.body === undefined) {
			// If we have only form
			axiosConfig.data =
				typeof requestObject.form === 'string'
					? stringify(requestObject.form, { format: 'RFC3986' })
					: stringify(requestObject.form).toString();
			if (axiosConfig.headers !== undefined) {
				const headerName = searchForHeader(axiosConfig, 'content-type');
				if (headerName) {
					delete axiosConfig.headers[headerName];
				}
				axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			} else {
				axiosConfig.headers = {
					'Content-Type': 'application/x-www-form-urlencoded',
				};
			}
		} else if (requestObject.formData !== undefined) {
			// remove any "content-type" that might exist.
			if (axiosConfig.headers !== undefined) {
				const headers = Object.keys(axiosConfig.headers);
				headers.forEach((header) => {
					if (header.toLowerCase() === 'content-type') {
						delete axiosConfig.headers?.[header];
					}
				});
			}

			if (requestObject.formData instanceof FormData) {
				axiosConfig.data = requestObject.formData;
			} else {
				axiosConfig.data = createFormDataObject(requestObject.formData as Record<string, unknown>);
			}
			// Mix in headers as FormData creates the boundary.

			const headers = axiosConfig.data.getHeaders();

			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, headers);
			await generateContentLengthHeader(axiosConfig);
		} else if (requestObject.body !== undefined) {
			// If we have body and possibly form
			if (requestObject.form !== undefined && requestObject.body) {
				// merge both objects when exist.

				requestObject.body = Object.assign(requestObject.body, requestObject.form);
			}
			axiosConfig.data = requestObject.body as FormData | GenericValue | GenericValue[];
		}
	}

	if (requestObject.uri !== undefined) {
		axiosConfig.url = requestObject.uri?.toString();
	}

	if (requestObject.url !== undefined) {
		axiosConfig.url = requestObject.url?.toString();
	}

	if (requestObject.baseURL !== undefined) {
		axiosConfig.baseURL = requestObject.baseURL?.toString();
	}

	if (requestObject.method !== undefined) {
		axiosConfig.method = requestObject.method;
	}

	if (requestObject.qs !== undefined && Object.keys(requestObject.qs as object).length > 0) {
		axiosConfig.params = requestObject.qs;
	}

	function hasArrayFormatOptions(
		arg: IRequestOptions,
	): arg is Required<Pick<IRequestOptions, 'qsStringifyOptions'>> {
		if (
			typeof arg.qsStringifyOptions === 'object' &&
			arg.qsStringifyOptions !== null &&
			!Array.isArray(arg.qsStringifyOptions) &&
			'arrayFormat' in arg.qsStringifyOptions
		) {
			return true;
		}

		return false;
	}

	if (
		requestObject.useQuerystring === true ||
		(hasArrayFormatOptions(requestObject) &&
			requestObject.qsStringifyOptions.arrayFormat === 'repeat')
	) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'repeat' });
		};
	} else if (requestObject.useQuerystring === false) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'indices' });
		};
	}

	if (
		hasArrayFormatOptions(requestObject) &&
		requestObject.qsStringifyOptions.arrayFormat === 'brackets'
	) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'brackets' });
		};
	}

	if (requestObject.auth !== undefined) {
		// Check support for sendImmediately
		if (requestObject.auth.bearer !== undefined) {
			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
				Authorization: `Bearer ${requestObject.auth.bearer}`,
			});
		} else {
			const authObj = requestObject.auth;
			// Request accepts both user/username and pass/password
			axiosConfig.auth = {
				username: (authObj.user || authObj.username) as string,

				password: (authObj.password || authObj.pass) as string,
			};
		}
	}

	// Only set header if we have a body, otherwise it may fail
	if (requestObject.json === true) {
		// Add application/json headers - do not set charset as it breaks a lot of stuff
		// only add if no other accept headers was sent.
		const acceptHeaderExists =
			axiosConfig.headers === undefined
				? false
				: Object.keys(axiosConfig.headers)
						.map((headerKey) => headerKey.toLowerCase())
						.includes('accept');
		if (!acceptHeaderExists) {
			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
				Accept: 'application/json',
			});
		}
	}
	if (requestObject.json === false || requestObject.json === undefined) {
		// Prevent json parsing

		axiosConfig.transformResponse = (res) => res;
	}

	// Axios will follow redirects by default, so we simply tell it otherwise if needed.
	const { method } = requestObject;
	if (
		(requestObject.followRedirect !== false &&
			(!method || method === 'GET' || method === 'HEAD')) ||
		requestObject.followAllRedirects
	) {
		axiosConfig.maxRedirects = requestObject.maxRedirects;
	} else {
		axiosConfig.maxRedirects = 0;
	}

	const host = getHostFromRequestObject(requestObject);
	const agentOptions: AgentOptions = { ...requestObject.agentOptions };
	if (host) {
		agentOptions.servername = host;
	}
	if (requestObject.rejectUnauthorized === false) {
		agentOptions.rejectUnauthorized = false;
		agentOptions.secureOptions = crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT;
	}

	if (requestObject.timeout !== undefined) {
		axiosConfig.timeout = requestObject.timeout;
	}

	setAxiosAgents(axiosConfig, agentOptions, requestObject.proxy);

	axiosConfig.beforeRedirect = getBeforeRedirectFn(agentOptions, axiosConfig, requestObject.proxy);

	if (requestObject.useStream) {
		axiosConfig.responseType = 'stream';
	} else if (requestObject.encoding === null) {
		// When downloading files, return an arrayBuffer.
		axiosConfig.responseType = 'arraybuffer';
	}

	// If we don't set an accept header
	// Axios forces "application/json, text/plan, */*"
	// Which causes some nodes like NextCloud to break
	// as the service returns XML unless requested otherwise.
	const allHeaders = axiosConfig.headers ? Object.keys(axiosConfig.headers) : [];
	if (!allHeaders.some((headerKey) => headerKey.toLowerCase() === 'accept')) {
		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, { accept: '*/*' });
	}
	if (
		requestObject.json !== false &&
		axiosConfig.data !== undefined &&
		axiosConfig.data !== '' &&
		!(axiosConfig.data instanceof Buffer) &&
		!allHeaders.some((headerKey) => headerKey.toLowerCase() === 'content-type')
	) {
		// Use default header for application/json
		// If we don't specify this here, axios will add
		// application/json; charset=utf-8
		// and this breaks a lot of stuff

		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
			'content-type': 'application/json',
		});
	}

	if (requestObject.simple === false) {
		axiosConfig.validateStatus = () => true;
	}

	/**
	 * Missing properties:
	 * encoding (need testing)
	 * gzip (ignored - default already works)
	 * resolveWithFullResponse (implemented elsewhere)
	 */
	return axiosConfig;
}

/**
 * @deprecated This is only used by legacy request helpers, that are also deprecated
 */
export async function proxyRequestToAxios(
	workflow: Workflow | undefined,
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	node: INode | undefined,
	uriOrObject: string | IRequestOptions,
	options?: IRequestOptions,
): Promise<any> {
	let axiosConfig: AxiosRequestConfig = {
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	};
	let configObject: IRequestOptions;
	if (typeof uriOrObject === 'string') {
		configObject = { uri: uriOrObject, ...options };
	} else {
		configObject = uriOrObject ?? {};
	}

	axiosConfig = Object.assign(axiosConfig, await parseRequestObject(configObject));

	try {
		const response = await invokeAxios(axiosConfig, configObject.auth);
		let body = response.data;
		if (body instanceof IncomingMessage && axiosConfig.responseType === 'stream') {
			parseIncomingMessage(body);
		} else if (body === '') {
			body = axiosConfig.responseType === 'arraybuffer' ? Buffer.alloc(0) : undefined;
		}
		await additionalData?.hooks?.runHook('nodeFetchedData', [workflow?.id, node]);
		return configObject.resolveWithFullResponse
			? {
					body,
					headers: { ...response.headers },
					statusCode: response.status,
					statusMessage: response.statusText,
					request: response.request,
				}
			: body;
	} catch (error) {
		const { config, response } = error;

		// Axios hydrates the original error with more data. We extract them.
		// https://github.com/axios/axios/blob/master/lib/core/enhanceError.js
		// Note: `code` is ignored as it's an expected part of the errorData.
		if (error.isAxiosError) {
			error.config = error.request = undefined;
			error.options = pick(config ?? {}, ['url', 'method', 'data', 'headers']);
			if (response) {
				Container.get(Logger).debug('Request proxied to Axios failed', { status: response.status });
				let responseData = response.data;

				if (Buffer.isBuffer(responseData) || responseData instanceof Readable) {
					responseData = await binaryToString(responseData);
				}

				if (configObject.simple === false) {
					if (configObject.resolveWithFullResponse) {
						return {
							body: responseData,
							headers: response.headers,
							statusCode: response.status,
							statusMessage: response.statusText,
						};
					} else {
						return responseData;
					}
				}

				error.message = `${response.status as number} - ${JSON.stringify(responseData)}`;
				throw Object.assign(error, {
					statusCode: response.status,
					/**
					 * Axios adds `status` when serializing, causing `status` to be available only to the client.
					 * Hence we add it explicitly to allow the backend to use it when resolving expressions.
					 */
					status: response.status,
					error: responseData,
					response: pick(response, ['headers', 'status', 'statusText']),
				});
			} else if ('rejectUnauthorized' in configObject && error.code?.includes('CERT')) {
				throw new NodeSslError(error);
			}
		}

		throw error;
	}
}

export function convertN8nRequestToAxios(n8nRequest: IHttpRequestOptions): AxiosRequestConfig {
	// Destructure properties with the same name first.
	const { headers, method, timeout, auth, proxy, url } = n8nRequest;

	const axiosRequest: AxiosRequestConfig = {
		headers: headers ?? {},
		method,
		timeout,
		auth,
		url,
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	} as AxiosRequestConfig;

	axiosRequest.params = n8nRequest.qs;

	if (n8nRequest.abortSignal) {
		axiosRequest.signal = n8nRequest.abortSignal;
	}

	if (n8nRequest.baseURL !== undefined) {
		axiosRequest.baseURL = n8nRequest.baseURL;
	}

	if (n8nRequest.disableFollowRedirect === true) {
		axiosRequest.maxRedirects = 0;
	}

	if (n8nRequest.encoding !== undefined) {
		axiosRequest.responseType = n8nRequest.encoding;
	}

	const host = getHostFromRequestObject(n8nRequest);
	const agentOptions: AgentOptions = {};
	if (host) {
		agentOptions.servername = host;
	}
	if (n8nRequest.skipSslCertificateValidation === true) {
		agentOptions.rejectUnauthorized = false;
	}
	setAxiosAgents(axiosRequest, agentOptions, proxy);

	axiosRequest.beforeRedirect = getBeforeRedirectFn(agentOptions, axiosRequest, n8nRequest.proxy);

	if (n8nRequest.arrayFormat !== undefined) {
		axiosRequest.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: n8nRequest.arrayFormat });
		};
	}

	const { body } = n8nRequest;
	if (body) {
		// Let's add some useful header standards here.
		const existingContentTypeHeaderKey = searchForHeader(axiosRequest, 'content-type');
		if (existingContentTypeHeaderKey === undefined) {
			axiosRequest.headers = axiosRequest.headers || {};
			// We are only setting content type headers if the user did
			// not set it already manually. We're not overriding, even if it's wrong.
			if (body instanceof FormData) {
				axiosRequest.headers = {
					...axiosRequest.headers,
					...body.getHeaders(),
				};
			} else if (body instanceof URLSearchParams) {
				axiosRequest.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			}
		} else if (
			axiosRequest.headers?.[existingContentTypeHeaderKey] === 'application/x-www-form-urlencoded'
		) {
			axiosRequest.data = new URLSearchParams(n8nRequest.body as Record<string, string>);
		}
		// if there is a body and it's empty (does not have properties),
		// make sure not to send anything in it as some services fail when
		// sending GET request with empty body.
		if (typeof body === 'string' || (typeof body === 'object' && !isObjectEmpty(body))) {
			axiosRequest.data = body;
		}
	}

	if (n8nRequest.json) {
		const key = searchForHeader(axiosRequest, 'accept');
		// If key exists, then the user has set both accept
		// header and the json flag. Header should take precedence.
		if (!key) {
			axiosRequest.headers = {
				...axiosRequest.headers,
				Accept: 'application/json',
			};
		}
	}

	const userAgentHeader = searchForHeader(axiosRequest, 'user-agent');
	// If key exists, then the user has set both accept
	// header and the json flag. Header should take precedence.
	if (!userAgentHeader) {
		axiosRequest.headers = {
			...axiosRequest.headers,
			'User-Agent': 'n8n',
		};
	}

	if (n8nRequest.ignoreHttpStatusErrors) {
		axiosRequest.validateStatus = () => true;
	}

	return axiosRequest;
}

const NoBodyHttpMethods = ['GET', 'HEAD', 'OPTIONS'];

/** Remove empty request body on GET, HEAD, and OPTIONS requests */
export const removeEmptyBody = (requestOptions: IHttpRequestOptions | IRequestOptions) => {
	const method = requestOptions.method || 'GET';
	if (NoBodyHttpMethods.includes(method) && isEmpty(requestOptions.body)) {
		delete requestOptions.body;
	}
};

export async function httpRequest(
	requestOptions: IHttpRequestOptions,
): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
	removeEmptyBody(requestOptions);

	const axiosRequest = convertN8nRequestToAxios(requestOptions);
	if (
		axiosRequest.data === undefined ||
		(axiosRequest.method !== undefined && axiosRequest.method.toUpperCase() === 'GET')
	) {
		delete axiosRequest.data;
	}

	const result = await invokeAxios(axiosRequest, requestOptions.auth);

	if (requestOptions.returnFullResponse) {
		return {
			body: result.data,
			headers: result.headers,
			statusCode: result.status,
			statusMessage: result.statusText,
		};
	}

	return result.data;
}

export function applyPaginationRequestData(
	requestData: IRequestOptions,
	paginationRequestData: PaginationOptions['request'],
): IRequestOptions {
	const preparedPaginationData: Partial<IRequestOptions> = {
		...paginationRequestData,
		uri: paginationRequestData.url,
	};

	if ('formData' in requestData) {
		preparedPaginationData.formData = paginationRequestData.body;
		delete preparedPaginationData.body;
	} else if ('form' in requestData) {
		preparedPaginationData.form = paginationRequestData.body;
		delete preparedPaginationData.body;
	}

	return merge({}, requestData, preparedPaginationData);
}

/**
 * @deprecated OAuth2 authentication removed - credentials system has been removed
 * This function now throws an error as OAuth2 is no longer supported
 */
export async function requestOAuth2(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | IRequestOptions,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	oAuth2Options?: IOAuth2Options,
	isN8nRequest = false,
): Promise<never> {
	throw new ApplicationError(
		'OAuth2 authentication is no longer supported - credentials system has been removed',
		{
			extra: { credentialsType, nodeName: node.name },
		},
	);
}
/**
 * @deprecated OAuth1 authentication removed - credentials system has been removed
 * This function now throws an error as OAuth1 is no longer supported
 */
export async function requestOAuth1(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | IRequestOptions,
	isN8nRequest = false,
): Promise<never> {
	throw new ApplicationError(
		'OAuth1 authentication is no longer supported - credentials system has been removed',
		{
			extra: { credentialsType },
		},
	);
}
/**
 * @deprecated OAuth2 token refresh removed - credentials system has been removed
 * This function now throws an error as OAuth2 is no longer supported
 */
export async function refreshOAuth2Token(
	this: IAllExecuteFunctions,
	credentialsType: string,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	oAuth2Options?: IOAuth2Options,
): Promise<never> {
	throw new ApplicationError(
		'OAuth2 token refresh is no longer supported - credentials system has been removed',
		{
			extra: { credentialsType, nodeName: node.name },
		},
	);
}

/**
 * @deprecated Credential authentication removed - just use httpRequest directly
 */
export async function httpRequestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
) {
	removeEmptyBody(requestOptions);

	if ('getExecutionCancelSignal' in this) {
		requestOptions.abortSignal = this.getExecutionCancelSignal();
	}

	try {
		return await httpRequest(requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * @deprecated use httpRequestWithAuthentication or httpRequest directly
 */
export async function requestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	itemIndex?: number,
) {
	removeEmptyBody(requestOptions);

	try {
		return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
	} catch (error) {
		if (error instanceof ExecutionBaseError) throw error;
		throw new NodeApiError(this.getNode(), error);
	}
}

export const getRequestHelperFunctions = (
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	runExecutionData: IRunExecutionData | null = null,
	connectionInputData: INodeExecutionData[] = [],
): RequestHelperFunctions => {
	const getResolvedValue = (
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType => {
		const mode: WorkflowExecuteMode = 'internal';

		if (
			typeof parameterValue === 'object' ||
			(typeof parameterValue === 'string' && parameterValue.charAt(0) === '=')
		) {
			return workflow.expression.getParameterValue(
				parameterValue,
				runExecutionData,
				runIndex,
				itemIndex,
				node.name,
				connectionInputData,
				mode,
				additionalKeys ?? {},
				executeData,
				returnObjectAsString,
			);
		}

		return parameterValue;
	};

	// eslint-disable-next-line complexity
	async function requestWithAuthenticationPaginated(
		this: IExecuteFunctions,
		requestOptions: IRequestOptions,
		itemIndex: number,
		paginationOptions: PaginationOptions,
		credentialsType?: string,
	): Promise<any[]> {
		const responseData = [];
		if (!requestOptions.qs) {
			requestOptions.qs = {};
		}
		requestOptions.resolveWithFullResponse = true;
		requestOptions.simple = false;

		let tempResponseData: IN8nHttpFullResponse;
		let makeAdditionalRequest: boolean;
		let paginateRequestData: PaginationOptions['request'];

		const runIndex = 0;

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$request: requestOptions,
			$response: {} as IN8nHttpFullResponse,
			$version: node.typeVersion,
			$pageCount: 0,
		};

		const executeData: IExecuteData = {
			data: {},
			node,
			source: null,
		};

		const hashData = {
			identicalCount: 0,
			previousLength: 0,
			previousHash: '',
		};
		do {
			paginateRequestData = getResolvedValue(
				paginationOptions.request as unknown as NodeParameterValueType,
				itemIndex,
				runIndex,
				executeData,
				additionalKeys,
				false,
			) as object as PaginationOptions['request'];

			const tempRequestOptions = applyPaginationRequestData(requestOptions, paginateRequestData);

			if (!validateUrl(tempRequestOptions.uri as string)) {
				throw new NodeOperationError(node, `'${paginateRequestData.url}' is not a valid URL.`, {
					itemIndex,
					runIndex,
					type: 'invalid_url',
				});
			}

			tempResponseData = await this.helpers.request(tempRequestOptions);

			const newResponse: IN8nHttpFullResponse = Object.assign(
				{
					body: {},
					headers: {},
					statusCode: 0,
				},
				pick(tempResponseData, ['body', 'headers', 'statusCode']),
			);

			let contentBody: Exclude<IN8nHttpResponse, Buffer>;

			if (newResponse.body instanceof Readable && paginationOptions.binaryResult !== true) {
				// Keep the original string version that we can use it to hash if needed
				contentBody = await binaryToString(newResponse.body as Buffer | Readable);

				const responseContentType = newResponse.headers['content-type']?.toString() ?? '';
				if (responseContentType.includes('application/json')) {
					newResponse.body = jsonParse(contentBody, { fallbackValue: {} });
				} else {
					newResponse.body = contentBody;
				}
				tempResponseData.__bodyResolved = true;
				tempResponseData.body = newResponse.body;
			} else {
				contentBody = newResponse.body;
			}

			if (paginationOptions.binaryResult !== true || tempResponseData.headers.etag) {
				// If the data is not binary (and so not a stream), or an etag is present,
				// we check via etag or hash if identical data is received

				let contentLength = 0;
				if ('content-length' in tempResponseData.headers) {
					contentLength = parseInt(tempResponseData.headers['content-length'] as string) || 0;
				}

				if (hashData.previousLength === contentLength) {
					let hash: string;
					if (tempResponseData.headers.etag) {
						// If an etag is provided, we use it as "hash"
						hash = tempResponseData.headers.etag as string;
					} else {
						// If there is no etag, we calculate a hash from the data in the body
						if (typeof contentBody !== 'string') {
							contentBody = JSON.stringify(contentBody);
						}
						hash = crypto.createHash('md5').update(contentBody).digest('base64');
					}

					if (hashData.previousHash === hash) {
						hashData.identicalCount += 1;
						if (hashData.identicalCount > 2) {
							// Length was identical 5x and hash 3x
							throw new NodeOperationError(
								node,
								'The returned response was identical 5x, so requests got stopped',
								{
									itemIndex,
									description:
										'Check if "Pagination Completed When" has been configured correctly.',
								},
							);
						}
					} else {
						hashData.identicalCount = 0;
					}
					hashData.previousHash = hash;
				} else {
					hashData.identicalCount = 0;
				}
				hashData.previousLength = contentLength;
			}

			responseData.push(tempResponseData);

			additionalKeys.$response = newResponse;
			additionalKeys.$pageCount = (additionalKeys.$pageCount ?? 0) + 1;

			const maxRequests = getResolvedValue(
				paginationOptions.maxRequests,
				itemIndex,
				runIndex,
				executeData,
				additionalKeys,
				false,
			) as number;

			if (maxRequests && additionalKeys.$pageCount >= maxRequests) {
				break;
			}

			makeAdditionalRequest = getResolvedValue(
				paginationOptions.continue,
				itemIndex,
				runIndex,
				executeData,
				additionalKeys,
				false,
			) as boolean;

			if (makeAdditionalRequest) {
				if (paginationOptions.requestInterval) {
					const requestInterval = getResolvedValue(
						paginationOptions.requestInterval,
						itemIndex,
						runIndex,
						executeData,
						additionalKeys,
						false,
					) as number;

					await sleep(requestInterval);
				}
				if (tempResponseData.statusCode < 200 || tempResponseData.statusCode >= 300) {
					// We have it configured to let all requests pass no matter the response code
					// via "requestOptions.simple = false" to not by default fail if it is for example
					// configured to stop on 404 response codes. For that reason we have to throw here
					// now an error manually if the response code is not a success one.
					let data = tempResponseData.body;
					if (data instanceof Readable && paginationOptions.binaryResult !== true) {
						data = await binaryToString(data as Buffer | Readable);
					} else if (typeof data === 'object') {
						data = JSON.stringify(data);
					}

					throw Object.assign(new Error(`${tempResponseData.statusCode} - "${data?.toString()}"`), {
						statusCode: tempResponseData.statusCode,
						error: data,
						isAxiosError: true,
						response: {
							headers: tempResponseData.headers,
							status: tempResponseData.statusCode,
							statusText: tempResponseData.statusMessage,
						},
					});
				}
			}
		} while (makeAdditionalRequest);

		return responseData;
	}

	return {
		httpRequest,
		request: async (uriOrObject, options) =>
			await proxyRequestToAxios(workflow, additionalData, node, uriOrObject, options),
		requestOAuth1: async function (
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IRequestOptions,
		): Promise<any> {
			throw new Error('OAuth1 authentication has been removed from this system');
		},
		requestOAuth2: async function (
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IRequestOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any> {
			throw new Error('OAuth2 authentication has been removed from this system');
		},
		refreshOAuth2Token: async function (
			this: IAllExecuteFunctions,
			credentialsType: string,
			oAuth2Options?: IOAuth2Options,
		): Promise<any> {
			throw new Error('OAuth2 token refresh has been removed from this system');
		},
	};
};
