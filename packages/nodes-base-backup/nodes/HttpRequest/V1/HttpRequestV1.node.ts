import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import {
	NodeApiError,
	NodeOperationError,
	sleep,
	removeCircularRefs,
	NodeConnectionTypes,
	isDomainAllowed,
} from 'n8n-workflow';
import type { Readable } from 'stream';

import type { IAuthDataSanitizeKeys } from '../GenericFunctions';
import { replaceNullValues, sanitizeUiMessage } from '../GenericFunctions';
interface OptionData {
	name: string;
	displayName: string;
}

interface OptionDataParameters {
	[key: string]: OptionData;
}

type IRequestOptionsKeys = keyof IRequestOptions;

export class HttpRequestV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'HTTP Request',
				color: '#2200DD',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				// ----------------------------------
				//            v1 creds
				// ----------------------------------
				{
					name: 'httpBasicAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['basicAuth'],
						},
					},
				},
				{
					name: 'httpDigestAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['digestAuth'],
						},
					},
				},
				{
					name: 'httpHeaderAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['headerAuth'],
						},
					},
				},
				{
					name: 'httpQueryAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['queryAuth'],
						},
					},
				},
				{
					name: 'oAuth1Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth1'],
						},
					},
				},
				{
					name: 'oAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
						},
					},
				},
			],
			properties: [
				// ----------------------------------
				//           v1 params
				// ----------------------------------
				{
					displayName: '认证方式',
					name: 'authentication',
					type: 'options',
					options: [
						{
							name: '基本认证',
							value: 'basicAuth',
						},
						{
							name: '摘要认证',
							value: 'digestAuth',
						},
						{
							name: '请求头认证',
							value: 'headerAuth',
						},
						{
							name: '无',
							value: 'none',
						},
						{
							name: 'OAuth1',
							value: 'oAuth1',
						},
						{
							name: 'OAuth2',
							value: 'oAuth2',
						},
						{
							name: '查询参数认证',
							value: 'queryAuth',
						},
					],
					default: 'none',
					description: '认证方式',
				},

				// ----------------------------------
				//        versionless params
				// ----------------------------------
				{
					displayName: '请求方法',
					name: 'requestMethod',
					type: 'options',
					options: [
						{
							name: 'DELETE',
							value: 'DELETE',
						},
						{
							name: 'GET',
							value: 'GET',
						},
						{
							name: 'HEAD',
							value: 'HEAD',
						},
						{
							name: 'OPTIONS',
							value: 'OPTIONS',
						},
						{
							name: 'PATCH',
							value: 'PATCH',
						},
						{
							name: 'POST',
							value: 'POST',
						},
						{
							name: 'PUT',
							value: 'PUT',
						},
					],
					default: 'GET',
					description: '要使用的 HTTP 请求方法',
				},
				{
					displayName: 'URL 地址',
					name: 'url',
					type: 'string',
					default: '',
					placeholder: 'http://example.com/index.html',
					description: '要发送请求的 URL 地址',
					required: true,
				},
				{
					displayName: '忽略 SSL 证书问题（不安全）',
					name: 'allowUnauthorizedCerts',
					type: 'boolean',
					default: false,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
					description: '是否在 SSL 证书验证失败时仍下载响应内容',
				},
				{
					displayName: '响应格式',
					name: 'responseFormat',
					type: 'options',
					options: [
						{
							name: '文件',
							value: 'file',
						},
						{
							name: 'JSON',
							value: 'json',
						},
						{
							name: '字符串',
							value: 'string',
						},
					],
					default: 'json',
					description: '从 URL 返回的数据格式',
				},
				{
					displayName: '属性名称',
					name: 'dataPropertyName',
					type: 'string',
					default: 'data',
					required: true,
					displayOptions: {
						show: {
							responseFormat: ['string'],
						},
					},
					description: '用于写入响应数据的属性名称',
				},
				{
					displayName: '输出文件字段名',
					name: 'dataPropertyName',
					type: 'string',
					default: 'data',
					required: true,
					displayOptions: {
						show: {
							responseFormat: ['file'],
						},
					},
					hint: '用于存放文件的输出二进制字段名称',
				},

				{
					displayName: 'JSON/原始格式参数',
					name: 'jsonParameters',
					type: 'boolean',
					default: false,
					description: '是否通过键值对界面或 JSON/原始格式设置查询参数和/或请求体参数',
				},

				{
					displayName: '选项',
					name: 'options',
					type: 'collection',
					placeholder: '添加选项',
					default: {},
					options: [
						{
							displayName: '批次间隔',
							name: 'batchInterval',
							type: 'number',
							typeOptions: {
								minValue: 0,
							},
							default: 1000,
							description: '每批请求之间的时间间隔（毫秒）。设为 0 表示禁用。',
						},
						{
							displayName: '批次大小',
							name: 'batchSize',
							type: 'number',
							typeOptions: {
								minValue: -1,
							},
							default: 50,
							description: '输入将被分批处理以限制请求频率。-1 表示禁用，0 将被视为 1。',
						},
						{
							displayName: '请求体内容类型',
							name: 'bodyContentType',
							type: 'options',
							displayOptions: {
								show: {
									'/requestMethod': ['PATCH', 'POST', 'PUT'],
								},
							},
							options: [
								{
									name: 'JSON',
									value: 'json',
								},
								{
									name: '原始/自定义',
									value: 'raw',
								},
								{
									name: '表单数据（Multipart）',
									value: 'multipart-form-data',
								},
								{
									name: '表单编码',
									value: 'form-urlencoded',
								},
							],
							default: 'json',
							description: '用于发送请求体参数的内容类型',
						},
						{
							displayName: '完整响应',
							name: 'fullResponse',
							type: 'boolean',
							default: false,
							description: '是否返回完整的响应数据而不仅是响应体',
						},
						{
							displayName: '跟随所有重定向',
							name: 'followAllRedirects',
							type: 'boolean',
							default: false,
							description: '是否跟随所有 HTTP 3xx 重定向',
						},
						{
							displayName: '跟随 GET/HEAD 重定向',
							name: 'followRedirect',
							type: 'boolean',
							default: true,
							description: '是否跟随 GET 或 HEAD 的 HTTP 3xx 重定向',
						},
						{
							displayName: '忽略响应代码',
							name: 'ignoreResponseCode',
							type: 'boolean',
							default: false,
							description: '是否在状态码不是 2xx 时也视为成功',
						},
						{
							displayName: 'MIME 类型',
							name: 'bodyContentCustomMimeType',
							type: 'string',
							default: '',
							placeholder: 'text/xml',
							description: '为原始/自定义请求体类型指定 MIME 类型',
							displayOptions: {
								show: {
									'/requestMethod': ['PATCH', 'POST', 'PUT'],
								},
							},
						},
						{
							displayName: '代理服务器',
							name: 'proxy',
							type: 'string',
							default: '',
							placeholder: 'http://myproxy:3128',
							description: '要使用的 HTTP 代理服务器',
						},
						{
							displayName: '拆分为多个项目',
							name: 'splitIntoItems',
							type: 'boolean',
							default: false,
							description: '是否将数组的每个元素作为单独的项目输出',
							displayOptions: {
								show: {
									'/responseFormat': ['json'],
								},
							},
						},
						{
							displayName: '超时时间',
							name: 'timeout',
							type: 'number',
							typeOptions: {
								minValue: 1,
							},
							default: 10000,
							description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超时后将中止请求',
						},
						{
							displayName: '使用查询字符串',
							name: 'useQueryString',
							type: 'boolean',
							default: false,
							description:
								'是否需要将数组序列化为 foo=bar&foo=baz 而不是默认的 foo[0]=bar&foo[1]=baz',
						},
					],
				},

				// Body Parameter
				{
					displayName: '发送二进制文件',
					name: 'sendBinaryData',
					type: 'boolean',
					displayOptions: {
						show: {
							// TODO: Make it possible to use dot-notation
							// 'options.bodyContentType': [
							// 	'raw',
							// ],
							jsonParameters: [true],
							requestMethod: ['PATCH', 'POST', 'PUT'],
						},
					},
					default: false,
					description: '是否将二进制数据作为请求体发送',
				},
				{
					displayName: '输入二进制字段',
					name: 'binaryPropertyName',
					type: 'string',
					required: true,
					default: 'data',
					displayOptions: {
						hide: {
							sendBinaryData: [false],
						},
						show: {
							jsonParameters: [true],
							requestMethod: ['PATCH', 'POST', 'PUT'],
						},
					},
					hint: '包含要上传文件的输入二进制字段名称',
					description:
						'对于表单数据（Multipart），可以使用格式：<code>"sendKey1:binaryProperty1,sendKey2:binaryProperty2</code>',
				},
				{
					displayName: '请求体参数',
					name: 'bodyParametersJson',
					type: 'json',
					displayOptions: {
						hide: {
							sendBinaryData: [true],
						},
						show: {
							jsonParameters: [true],
							requestMethod: ['PATCH', 'POST', 'PUT', 'DELETE'],
						},
					},
					default: '',
					description: '以 JSON 或原始格式的请求体参数',
				},
				{
					displayName: '请求体参数',
					name: 'bodyParametersUi',
					placeholder: '添加参数',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							jsonParameters: [false],
							requestMethod: ['PATCH', 'POST', 'PUT', 'DELETE'],
						},
					},
					description: '要发送的请求体参数',
					default: {},
					options: [
						{
							name: 'parameter',
							displayName: '参数',
							values: [
								{
									displayName: '名称',
									name: 'name',
									type: 'string',
									default: '',
									description: '参数名称',
								},
								{
									displayName: '值',
									name: 'value',
									type: 'string',
									default: '',
									description: '参数值',
								},
							],
						},
					],
				},

				// Header Parameters
				{
					displayName: '请求头',
					name: 'headerParametersJson',
					type: 'json',
					displayOptions: {
						show: {
							jsonParameters: [true],
						},
					},
					default: '',
					description: '以 JSON 或原始格式的请求头参数',
				},
				{
					displayName: '请求头',
					name: 'headerParametersUi',
					placeholder: '添加请求头',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							jsonParameters: [false],
						},
					},
					description: '要发送的请求头',
					default: {},
					options: [
						{
							name: 'parameter',
							displayName: '请求头',
							values: [
								{
									displayName: '名称',
									name: 'name',
									type: 'string',
									default: '',
									description: '请求头名称',
								},
								{
									displayName: '值',
									name: 'value',
									type: 'string',
									default: '',
									description: '请求头的值',
								},
							],
						},
					],
				},

				// Query Parameter
				{
					displayName: '查询参数',
					name: 'queryParametersJson',
					type: 'json',
					displayOptions: {
						show: {
							jsonParameters: [true],
						},
					},
					default: '',
					description: '以 JSON 格式（扁平对象）的查询参数',
				},
				{
					displayName: '查询参数',
					name: 'queryParametersUi',
					placeholder: '添加参数',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					displayOptions: {
						show: {
							jsonParameters: [false],
						},
					},
					description: '要发送的查询参数',
					default: {},
					options: [
						{
							name: 'parameter',
							displayName: '参数',
							values: [
								{
									displayName: '名称',
									name: 'name',
									type: 'string',
									default: '',
									description: '参数名称',
								},
								{
									displayName: '值',
									name: 'value',
									type: 'string',
									default: '',
									description: '参数值',
								},
							],
						},
					],
				},
				{
					displayName: '您可以在浏览器的开发者控制台中查看此节点发出的原始请求',
					name: 'infoMessage',
					type: 'notice',
					default: '',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const fullResponseProperties = ['body', 'headers', 'statusCode', 'statusMessage'];

		const responseFormat = this.getNodeParameter('responseFormat', 0) as string;

		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let oAuth1Api;
		let oAuth2Api;

		try {
			httpBasicAuth = await this.getCredentials('httpBasicAuth');
		} catch {}
		try {
			httpDigestAuth = await this.getCredentials('httpDigestAuth');
		} catch {}
		try {
			httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
		} catch {}
		try {
			httpQueryAuth = await this.getCredentials('httpQueryAuth');
		} catch {}
		try {
			oAuth1Api = await this.getCredentials('oAuth1Api');
		} catch {}
		try {
			oAuth2Api = await this.getCredentials('oAuth2Api');
		} catch {}

		let requestOptions: IRequestOptions;
		let setUiParameter: IDataObject;

		const uiParameters: IDataObject = {
			bodyParametersUi: 'body',
			headerParametersUi: 'headers',
			queryParametersUi: 'qs',
		};

		const jsonParameters: OptionDataParameters = {
			bodyParametersJson: {
				name: 'body',
				displayName: 'Body Parameters',
			},
			headerParametersJson: {
				name: 'headers',
				displayName: 'Headers',
			},
			queryParametersJson: {
				name: 'qs',
				displayName: 'Query Parameters',
			},
		};
		let returnItems: INodeExecutionData[] = [];
		const requestPromises = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const requestMethod = this.getNodeParameter(
				'requestMethod',
				itemIndex,
			) as IHttpRequestMethods;
			const parametersAreJson = this.getNodeParameter('jsonParameters', itemIndex);

			const options = this.getNodeParameter('options', itemIndex, {});
			const url = this.getNodeParameter('url', itemIndex) as string;

			if (!url.startsWith('http://') && !url.startsWith('https://')) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid URL: ${url}. URL must start with "http" or "https".`,
				);
			}

			const checkDomainRestrictions = async (
				credentialData: ICredentialDataDecryptedObject,
				url: string,
				credentialType?: string,
			) => {
				if (credentialData.allowedHttpRequestDomains === 'domains') {
					const allowedDomains = credentialData.allowedDomains as string;

					if (!allowedDomains || allowedDomains.trim() === '') {
						throw new NodeOperationError(
							this.getNode(),
							'No allowed domains specified. Configure allowed domains or change restriction setting.',
						);
					}

					if (!isDomainAllowed(url, { allowedDomains })) {
						const credentialInfo = credentialType ? ` (${credentialType})` : '';
						throw new NodeOperationError(
							this.getNode(),
							`Domain not allowed: This credential${credentialInfo} is restricted from accessing ${url}. ` +
								`Only the following domains are allowed: ${allowedDomains}`,
						);
					}
				} else if (credentialData.allowedHttpRequestDomains === 'none') {
					throw new NodeOperationError(
						this.getNode(),
						'This credential is configured to prevent use within an HTTP Request node',
					);
				}
			};

			if (httpBasicAuth) await checkDomainRestrictions(httpBasicAuth, url);
			if (httpDigestAuth) await checkDomainRestrictions(httpDigestAuth, url);
			if (httpHeaderAuth) await checkDomainRestrictions(httpHeaderAuth, url);
			if (httpQueryAuth) await checkDomainRestrictions(httpQueryAuth, url);
			if (oAuth1Api) await checkDomainRestrictions(oAuth1Api, url);
			if (oAuth2Api) await checkDomainRestrictions(oAuth2Api, url);

			if (
				itemIndex > 0 &&
				(options.batchSize as number) >= 0 &&
				(options.batchInterval as number) > 0
			) {
				// defaults batch size to 1 of it's set to 0
				const batchSize: number =
					(options.batchSize as number) > 0 ? (options.batchSize as number) : 1;
				if (itemIndex % batchSize === 0) {
					await sleep(options.batchInterval as number);
				}
			}

			const fullResponse = !!options.fullResponse;

			requestOptions = {
				headers: {},
				method: requestMethod,
				uri: url,
				gzip: true,
				rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false),
			} satisfies IRequestOptions;

			if (fullResponse) {
				requestOptions.resolveWithFullResponse = true;
			}

			if (options.followRedirect !== undefined) {
				requestOptions.followRedirect = options.followRedirect as boolean;
			}

			if (options.followAllRedirects !== undefined) {
				requestOptions.followAllRedirects = options.followAllRedirects as boolean;
			}

			if (options.ignoreResponseCode === true) {
				requestOptions.simple = false;
			}
			if (options.proxy !== undefined) {
				requestOptions.proxy = options.proxy as string;
			}
			if (options.timeout !== undefined) {
				requestOptions.timeout = options.timeout as number;
			} else {
				requestOptions.timeout = 3600000; // 1 hour
			}

			if (options.useQueryString === true) {
				requestOptions.useQuerystring = true;
			}

			if (parametersAreJson) {
				// Parameters are defined as JSON
				let optionData: OptionData;
				for (const parameterName of Object.keys(jsonParameters)) {
					optionData = jsonParameters[parameterName];
					const tempValue = this.getNodeParameter(parameterName, itemIndex, '') as string | object;
					const sendBinaryData = this.getNodeParameter(
						'sendBinaryData',
						itemIndex,
						false,
					) as boolean;

					if (optionData.name === 'body' && parametersAreJson) {
						if (sendBinaryData) {
							const contentTypesAllowed = ['raw', 'multipart-form-data'];

							if (!contentTypesAllowed.includes(options.bodyContentType as string)) {
								// As n8n-workflow.NodeHelpers.getParameterResolveOrder can not be changed
								// easily to handle parameters in dot.notation simply error for now.
								throw new NodeOperationError(
									this.getNode(),
									'Sending binary data is only supported when option "Body Content Type" is set to "RAW/CUSTOM" or "FORM-DATA/MULTIPART"!',
									{ itemIndex },
								);
							}

							if (options.bodyContentType === 'raw') {
								const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);
								this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
								const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
									itemIndex,
									binaryPropertyName,
								);
								requestOptions.body = binaryDataBuffer;
							} else if (options.bodyContentType === 'multipart-form-data') {
								requestOptions.body = {};
								const binaryPropertyNameFull = this.getNodeParameter(
									'binaryPropertyName',
									itemIndex,
								);
								const binaryPropertyNames = binaryPropertyNameFull
									.split(',')
									.map((key) => key.trim());

								for (const propertyData of binaryPropertyNames) {
									let propertyName = 'file';
									let binaryPropertyName = propertyData;
									if (propertyData.includes(':')) {
										const propertyDataParts = propertyData.split(':');
										propertyName = propertyDataParts[0];
										binaryPropertyName = propertyDataParts[1];
									} else if (binaryPropertyNames.length > 1) {
										throw new NodeOperationError(
											this.getNode(),
											'If more than one property should be send it is needed to define the in the format:<code>"sendKey1:binaryProperty1,sendKey2:binaryProperty2"</code>',
											{ itemIndex },
										);
									}

									const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
									const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
										itemIndex,
										binaryPropertyName,
									);

									requestOptions.body[propertyName] = {
										value: binaryDataBuffer,
										options: {
											filename: binaryData.fileName,
											contentType: binaryData.mimeType,
										},
									};
								}
							}
							continue;
						}
					}

					if (tempValue === '') {
						// Parameter is empty so skip it
						continue;
					}

					// @ts-ignore
					requestOptions[optionData.name] = tempValue;

					if (
						// @ts-ignore
						typeof requestOptions[optionData.name] !== 'object' &&
						options.bodyContentType !== 'raw'
					) {
						// If it is not an object && bodyContentType is not 'raw' it must be JSON so parse it
						try {
							// @ts-ignore
							requestOptions[optionData.name] = JSON.parse(
								requestOptions[optionData.name as IRequestOptionsKeys] as string,
							);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`The data in "${optionData.displayName}" is no valid JSON. Set Body Content Type to "RAW/Custom" for XML or other types of payloads`,
								{ itemIndex },
							);
						}
					}
				}
			} else {
				// Parameters are defined in UI
				let optionName: string;
				for (const parameterName of Object.keys(uiParameters)) {
					setUiParameter = this.getNodeParameter(parameterName, itemIndex, {}) as IDataObject;
					optionName = uiParameters[parameterName] as string;
					if (setUiParameter.parameter !== undefined) {
						// @ts-ignore
						requestOptions[optionName] = {};
						for (const parameterData of setUiParameter!.parameter as IDataObject[]) {
							const parameterDataName = parameterData.name as string;
							const newValue = parameterData.value;
							if (optionName === 'qs') {
								const computeNewValue = (oldValue: unknown) => {
									if (typeof oldValue === 'string') {
										return [oldValue, newValue];
									} else if (Array.isArray(oldValue)) {
										return [...oldValue, newValue];
									} else {
										return newValue;
									}
								};
								requestOptions[optionName]![parameterDataName] = computeNewValue(
									requestOptions[optionName]![parameterDataName],
								);
							} else if (optionName === 'headers') {
								// @ts-ignore
								requestOptions[optionName][parameterDataName.toString().toLowerCase()] = newValue;
							} else {
								// @ts-ignore
								requestOptions[optionName][parameterDataName] = newValue;
							}
						}
					}
				}
			}

			// Change the way data get send in case a different content-type than JSON got selected
			if (['PATCH', 'POST', 'PUT'].includes(requestMethod)) {
				if (options.bodyContentType === 'multipart-form-data') {
					requestOptions.formData = requestOptions.body;
					delete requestOptions.body;
				} else if (options.bodyContentType === 'form-urlencoded') {
					requestOptions.form = requestOptions.body;
					delete requestOptions.body;
				}
			}

			if (responseFormat === 'file') {
				requestOptions.encoding = null;
				requestOptions.useStream = true;

				if (options.bodyContentType !== 'raw') {
					requestOptions.body = JSON.stringify(requestOptions.body);
					if (requestOptions.headers === undefined) {
						requestOptions.headers = {};
					}
					if (['POST', 'PUT', 'PATCH'].includes(requestMethod)) {
						requestOptions.headers['Content-Type'] = 'application/json';
					}
				}
			} else if (options.bodyContentType === 'raw') {
				requestOptions.json = false;
				requestOptions.useStream = true;
			} else {
				requestOptions.json = true;
			}

			// Add Content Type if any are set
			if (options.bodyContentCustomMimeType) {
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}
				requestOptions.headers['Content-Type'] = options.bodyContentCustomMimeType;
			}

			const authDataKeys: IAuthDataSanitizeKeys = {};

			// Add credentials if any are set
			if (httpBasicAuth !== undefined) {
				requestOptions.auth = {
					user: httpBasicAuth.user as string,
					pass: httpBasicAuth.password as string,
				};
				authDataKeys.auth = ['pass'];
			}
			if (httpHeaderAuth !== undefined) {
				requestOptions.headers![httpHeaderAuth.name as string] = httpHeaderAuth.value;
				authDataKeys.headers = [httpHeaderAuth.name as string];
			}
			if (httpQueryAuth !== undefined) {
				if (!requestOptions.qs) {
					requestOptions.qs = {};
				}
				requestOptions.qs[httpQueryAuth.name as string] = httpQueryAuth.value;
				authDataKeys.qs = [httpQueryAuth.name as string];
			}
			if (httpDigestAuth !== undefined) {
				requestOptions.auth = {
					user: httpDigestAuth.user as string,
					pass: httpDigestAuth.password as string,
					sendImmediately: false,
				};
				authDataKeys.auth = ['pass'];
			}

			if (requestOptions.headers!.accept === undefined) {
				if (responseFormat === 'json') {
					requestOptions.headers!.accept = 'application/json,text/*;q=0.99';
				} else if (responseFormat === 'string') {
					requestOptions.headers!.accept =
						'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, */*;q=0.1';
				} else {
					requestOptions.headers!.accept =
						'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, image/*;q=0.8, */*;q=0.7';
				}
			}

			try {
				this.sendMessageToUI(sanitizeUiMessage(requestOptions, authDataKeys));
			} catch (e) {}

			if (oAuth1Api) {
				const requestOAuth1 = this.helpers.requestOAuth1.call(this, 'oAuth1Api', requestOptions);
				requestOAuth1.catch(() => {});
				requestPromises.push(requestOAuth1);
			} else if (oAuth2Api) {
				const requestOAuth2 = this.helpers.requestOAuth2.call(this, 'oAuth2Api', requestOptions, {
					tokenType: 'Bearer',
				});
				requestOAuth2.catch(() => {});
				requestPromises.push(requestOAuth2);
			} else {
				// bearerAuth, queryAuth, headerAuth, digestAuth, none
				const request = this.helpers.request(requestOptions);
				request.catch(() => {});
				requestPromises.push(request);
			}
		}

		const promisesResponses = await Promise.allSettled(requestPromises);

		let response: any;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			response = promisesResponses.shift();

			if (response!.status !== 'fulfilled') {
				if (!this.continueOnFail()) {
					// throw error;
					throw new NodeApiError(this.getNode(), response as JsonObject, { itemIndex });
				} else {
					removeCircularRefs(response.reason as JsonObject);
					// Return the actual reason as error
					returnItems.push({
						json: {
							error: response.reason,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
			}

			response = response.value;
			if (response?.request?.constructor.name === 'ClientRequest') delete response.request;

			const options = this.getNodeParameter('options', itemIndex, {});

			const fullResponse = !!options.fullResponse;

			if (responseFormat === 'file') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);

				const newItem: INodeExecutionData = {
					json: {},
					binary: {},
					pairedItem: {
						item: itemIndex,
					},
				};

				if (items[itemIndex].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					// @ts-ignore
					Object.assign(newItem.binary, items[itemIndex].binary);
				}

				let binaryData: Buffer | Readable;
				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullResponseProperties) {
						if (property === 'body') {
							continue;
						}
						returnItem[property] = response![property];
					}

					newItem.json = returnItem;
					binaryData = response!.body;
				} else {
					newItem.json = items[itemIndex].json;
					binaryData = response;
				}

				newItem.binary![dataPropertyName] = await this.helpers.prepareBinaryData(binaryData);
				returnItems.push(newItem);
			} else if (responseFormat === 'string') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);

				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullResponseProperties) {
						if (property === 'body') {
							returnItem[dataPropertyName] = response![property];
							continue;
						}

						returnItem[property] = response![property];
					}
					returnItems.push({
						json: returnItem,
						pairedItem: {
							item: itemIndex,
						},
					});
				} else {
					returnItems.push({
						json: {
							[dataPropertyName]: response,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				}
			} else {
				// responseFormat: 'json'
				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullResponseProperties) {
						returnItem[property] = response![property];
					}

					if (responseFormat === 'json' && typeof returnItem.body === 'string') {
						try {
							returnItem.body = JSON.parse(returnItem.body);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								'Response body is not valid JSON. Change "Response Format" to "String"',
								{ itemIndex },
							);
						}
					}

					returnItems.push({
						json: returnItem,
						pairedItem: {
							item: itemIndex,
						},
					});
				} else {
					if (responseFormat === 'json' && typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								'Response body is not valid JSON. Change "Response Format" to "String"',
								{ itemIndex },
							);
						}
					}

					if (options.splitIntoItems === true && Array.isArray(response)) {
						response.forEach((item) =>
							returnItems.push({
								json: item,
								pairedItem: {
									item: itemIndex,
								},
							}),
						);
					} else {
						returnItems.push({
							json: response,
							pairedItem: {
								item: itemIndex,
							},
						});
					}
				}
			}
		}

		returnItems = returnItems.map(replaceNullValues);

		return [returnItems];
	}
}
