import type { INodeProperties } from 'n8n-workflow';

import { optimizeResponseProperties } from '../shared/optimizeResponse';

const preBuiltAgentsCallout: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
	displayName: '试用我们的预置 HTTP 请求工具',
	name: 'preBuiltAgentsCalloutHttpRequest',
	type: 'callout',
	typeOptions: {
		calloutAction: {
			label: '笑话代理',
			icon: 'bot',
			type: 'openSampleWorkflowTemplate',
			templateId: 'joke_agent_with_http_tool',
		},
	},
	default: '',
};

export const mainProperties: INodeProperties[] = [
	preBuiltAgentsCallout,
	{
		displayName: '',
		name: 'curlImport',
		type: 'curlImport',
		default: '',
	},
	{
		displayName: '请求方法',
		name: 'method',
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
		displayName: '认证方式',
		name: 'authentication',
		noDataExpression: true,
		type: 'options',
		options: [
			{
				name: '无',
				value: 'none',
			},
			{
				name: '预定义凭证类型',
				value: 'predefinedCredentialType',
				description: '我们已经为许多服务实现了认证，无需您手动设置',
			},
			{
				name: '通用凭证类型',
				value: 'genericCredentialType',
				description: '完全可自定义。可选择基本认证、请求头认证、OAuth2 等。',
			},
		],
		default: 'none',
	},
	{
		displayName: '凭证类型',
		name: 'nodeCredentialType',
		type: 'credentialsSelect',
		noDataExpression: true,
		required: true,
		default: '',
		credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
		displayOptions: {
			show: {
				authentication: ['predefinedCredentialType'],
			},
		},
	},
	{
		displayName: '请确保您已在凭证中为服务账户指定了作用域',
		name: 'googleApiWarning',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				nodeCredentialType: ['googleApi'],
			},
		},
	},
	{
		displayName: '通用认证类型',
		name: 'genericAuthType',
		type: 'credentialsSelect',
		required: true,
		default: '',
		credentialTypes: ['has:genericAuth'],
		displayOptions: {
			show: {
				authentication: ['genericCredentialType'],
			},
		},
	},
	{
		displayName: 'SSL 证书',
		name: 'provideSslCertificates',
		type: 'boolean',
		default: false,
		isNodeSetting: true,
	},
	{
		displayName: '在节点的「SSL 证书凭证」参数中提供证书',
		name: 'provideSslCertificatesNotice',
		type: 'notice',
		default: '',
		isNodeSetting: true,
		displayOptions: {
			show: {
				provideSslCertificates: [true],
			},
		},
	},
	{
		displayName: 'SSL 证书',
		name: 'sslCertificate',
		type: 'credentials',
		default: '',
		displayOptions: {
			show: {
				provideSslCertificates: [true],
			},
		},
	},
	{
		displayName: '发送查询参数',
		name: 'sendQuery',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: '请求是否包含查询参数',
	},
	{
		displayName: '指定查询参数方式',
		name: 'specifyQuery',
		type: 'options',
		displayOptions: {
			show: {
				sendQuery: [true],
			},
		},
		options: [
			{
				name: '使用下方字段',
				value: 'keypair',
			},
			{
				name: '使用 JSON',
				value: 'json',
			},
		],
		default: 'keypair',
	},
	{
		displayName: '查询参数',
		name: 'queryParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendQuery: [true],
				specifyQuery: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: '添加参数',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: '参数',
				values: [
					{
						displayName: '名称',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: '值',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON',
		name: 'jsonQuery',
		type: 'json',
		displayOptions: {
			show: {
				sendQuery: [true],
				specifyQuery: ['json'],
			},
		},
		default: '',
	},
	{
		displayName: '发送请求头',
		name: 'sendHeaders',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: '请求是否包含请求头',
	},
	{
		displayName: '指定请求头方式',
		name: 'specifyHeaders',
		type: 'options',
		displayOptions: {
			show: {
				sendHeaders: [true],
			},
		},
		options: [
			{
				name: '使用下方字段',
				value: 'keypair',
			},
			{
				name: '使用 JSON',
				value: 'json',
			},
		],
		default: 'keypair',
	},
	{
		displayName: '请求头参数',
		name: 'headerParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendHeaders: [true],
				specifyHeaders: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: '添加参数',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: '参数',
				values: [
					{
						displayName: '名称',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: '值',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON',
		name: 'jsonHeaders',
		type: 'json',
		displayOptions: {
			show: {
				sendHeaders: [true],
				specifyHeaders: ['json'],
			},
		},
		default: '',
	},
	{
		displayName: '发送请求体',
		name: 'sendBody',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: '请求是否包含请求体',
	},
	{
		displayName: '请求体内容类型',
		name: 'contentType',
		type: 'options',
		displayOptions: {
			show: {
				sendBody: [true],
			},
		},
		options: [
			{
				name: '表单编码',
				value: 'form-urlencoded',
			},
			{
				name: '表单数据',
				value: 'multipart-form-data',
			},
			{
				name: 'JSON',
				value: 'json',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'n8n 二进制文件',
				value: 'binaryData',
			},
			{
				name: '原始',
				value: 'raw',
			},
		],
		default: 'json',
		description: '用于发送请求体参数的内容类型',
	},
	{
		displayName: '指定请求体方式',
		name: 'specifyBody',
		type: 'options',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['json'],
			},
		},
		options: [
			{
				name: '使用下方字段',
				value: 'keypair',
			},
			{
				name: '使用 JSON',
				value: 'json',
			},
		],
		default: 'keypair',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
		description:
			'可以使用显式字段（<code>keypair</code>）或 JavaScript 对象（<code>json</code>）指定请求体',
	},
	{
		displayName: '请求体参数',
		name: 'bodyParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['json'],
				specifyBody: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: '添加参数',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: '参数',
				values: [
					{
						displayName: '名称',
						name: 'name',
						type: 'string',
						default: '',
						description:
							'要设置的字段 ID。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID。',
					},
					{
						displayName: '值',
						name: 'value',
						type: 'string',
						default: '',
						description: '要设置的字段值',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON',
		name: 'jsonBody',
		type: 'json',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['json'],
				specifyBody: ['json'],
			},
		},
		default: '',
	},
	{
		displayName: '请求体参数',
		name: 'bodyParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['multipart-form-data'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: '参数类型',
						name: 'parameterType',
						type: 'options',
						options: [
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'n8n Binary File',
								value: 'formBinaryData',
							},
							{
								name: 'Form Data',
								value: 'formData',
							},
						],
						default: 'formData',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description:
							'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						displayOptions: {
							show: {
								parameterType: ['formData'],
							},
						},
						default: '',
						description: 'Value of the field to set',
					},
					{
						displayName: '输入数据字段名',
						name: 'inputDataFieldName',
						type: 'string',
						displayOptions: {
							show: {
								parameterType: ['formBinaryData'],
							},
						},
						default: '',
						description:
							'The name of the incoming field containing the binary file data to be processed',
					},
				],
			},
		],
	},
	{
		displayName: 'Specify Body',
		name: 'specifyBody',
		type: 'options',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['form-urlencoded'],
			},
		},
		options: [
			{
				name: 'Using Fields Below',
				value: 'keypair',
			},
			{
				name: 'Using Single Field',
				value: 'string',
			},
		],
		default: 'keypair',
	},
	{
		displayName: '请求体参数',
		name: 'bodyParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['form-urlencoded'],
				specifyBody: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description:
							'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the field to set',
					},
				],
			},
		],
	},
	{
		displayName: '请求体',
		name: 'body',
		type: 'string',
		displayOptions: {
			show: {
				sendBody: [true],
				specifyBody: ['string'],
			},
		},
		default: '',
		placeholder: 'field1=value1&field2=value2',
	},
	{
		displayName: '输入数据字段名',
		name: 'inputDataFieldName',
		type: 'string',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['binaryData'],
			},
		},
		default: '',
		description: 'The name of the incoming field containing the binary file data to be processed',
	},
	{
		displayName: '内容类型',
		name: 'rawContentType',
		type: 'string',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['raw'],
			},
		},
		default: '',
		placeholder: 'text/html',
	},
	{
		displayName: '请求体',
		name: 'body',
		type: 'string',
		displayOptions: {
			show: {
				sendBody: [true],
				contentType: ['raw'],
			},
		},
		default: '',
		placeholder: '',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		options: [
			{
				displayName: '批次处理',
				name: 'batching',
				placeholder: '添加批次处理',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					batch: {},
				},
				options: [
					{
						displayName: '批次处理',
						name: 'batch',
						values: [
							{
								displayName: '每批项目数',
								name: 'batchSize',
								type: 'number',
								typeOptions: {
									minValue: -1,
								},
								default: 50,
								description:
									'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								displayName: 'Batch Interval (ms)',
								name: 'batchInterval',
								type: 'number',
								typeOptions: {
									minValue: 0,
								},
								default: 1000,
								description:
									'Time (in milliseconds) between each batch of requests. 0 for disabled.',
							},
						],
					},
				],
			},
			{
				displayName: '忽略 SSL 证书问题（不安全）',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				noDataExpression: true,
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
				description:
					'Whether to download the response even if SSL certificate validation is not possible',
			},
			{
				displayName: '查询参数中的数组格式',
				name: 'queryParameterArrays',
				type: 'options',
				displayOptions: {
					show: {
						'/sendQuery': [true],
					},
				},
				options: [
					{
						name: 'No Brackets',
						value: 'repeat',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
						description: 'e.g. foo=bar&foo=qux',
					},
					{
						name: 'Brackets Only',
						value: 'brackets',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
						description: 'e.g. foo[]=bar&foo[]=qux',
					},
					{
						name: 'Brackets with Indices',
						value: 'indices',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
						description: 'e.g. foo[0]=bar&foo[1]=qux',
					},
				],
				default: 'brackets',
			},
			{
				displayName: '小写请求头',
				name: 'lowercaseHeaders',
				type: 'boolean',
				default: true,
				description: 'Whether to lowercase header names',
			},
			{
				displayName: '重定向',
				name: 'redirect',
				placeholder: 'Add Redirect',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: { redirect: {} },
				options: [
					{
						displayName: 'Redirect',
						name: 'redirect',
						values: [
							{
								displayName: '跟随重定向',
								name: 'followRedirects',
								type: 'boolean',
								default: false,
								noDataExpression: true,
								description: 'Whether to follow all redirects',
							},
							{
								displayName: '最大重定向次数',
								name: 'maxRedirects',
								type: 'number',
								displayOptions: {
									show: {
										followRedirects: [true],
									},
								},
								default: 21,
								description: 'Max number of redirects to follow',
							},
						],
					},
				],
				displayOptions: {
					show: {
						'@version': [1, 2, 3],
					},
				},
			},
			{
				displayName: '重定向',
				name: 'redirect',
				placeholder: 'Add Redirect',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					redirect: {},
				},
				options: [
					{
						displayName: 'Redirect',
						name: 'redirect',
						values: [
							{
								displayName: '跟随重定向',
								name: 'followRedirects',
								type: 'boolean',
								default: true,
								noDataExpression: true,
								description: 'Whether to follow all redirects',
							},
							{
								displayName: '最大重定向次数',
								name: 'maxRedirects',
								type: 'number',
								displayOptions: {
									show: {
										followRedirects: [true],
									},
								},
								default: 21,
								description: 'Max number of redirects to follow',
							},
						],
					},
				],
				displayOptions: {
					hide: {
						'@version': [1, 2, 3],
					},
				},
			},
			{
				displayName: '响应',
				name: 'response',
				placeholder: 'Add response',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					response: {},
				},
				options: [
					{
						displayName: '响应',
						name: 'response',
						values: [
							{
								displayName: '包含响应头和状态',
								name: 'fullResponse',
								type: 'boolean',
								default: false,
								description:
									'Whether to return the full response (headers and response status code) data instead of only the body',
							},
							{
								displayName: '永不报错',
								name: 'neverError',
								type: 'boolean',
								default: false,
								description: 'Whether to succeeds also when status code is not 2xx',
							},
							{
								displayName: '响应格式',
								name: 'responseFormat',
								type: 'options',
								noDataExpression: true,
								options: [
									{
										name: 'Autodetect',
										value: 'autodetect',
									},
									{
										name: 'File',
										value: 'file',
									},
									{
										name: 'JSON',
										value: 'json',
									},
									{
										name: 'Text',
										value: 'text',
									},
								],
								default: 'autodetect',
								description: 'The format in which the data gets returned from the URL',
							},
							{
								displayName: '输出到字段',
								name: 'outputPropertyName',
								type: 'string',
								default: 'data',
								required: true,
								displayOptions: {
									show: {
										responseFormat: ['file', 'text'],
									},
								},
								description:
									'Name of the binary property to which to write the data of the read file',
							},
						],
					},
				],
			},
			{
				displayName: '分页',
				name: 'pagination',
				placeholder: 'Add pagination',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					pagination: {},
				},
				options: [
					{
						displayName: '分页',
						name: 'pagination',
						values: [
							{
								displayName: '分页模式',
								name: 'paginationMode',
								type: 'options',
								typeOptions: {
									noDataExpression: true,
								},
								options: [
									{
										name: 'Off',
										value: 'off',
									},
									{
										name: 'Update a Parameter in Each Request',
										value: 'updateAParameterInEachRequest',
									},
									{
										name: 'Response Contains Next URL',
										value: 'responseContainsNextURL',
									},
								],
								default: 'updateAParameterInEachRequest',
								description: 'If pagination should be used',
							},
							{
								displayName:
									'Use the $response variables to access the data of the previous response. Refer to the <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.httprequest" target="_blank">docs</a> for more info about pagination/',
								name: 'webhookNotice',
								displayOptions: {
									hide: {
										paginationMode: ['off'],
									},
								},
								type: 'notice',
								default: '',
							},
							{
								displayName: '下一页 URL',
								name: 'nextURL',
								type: 'string',
								displayOptions: {
									show: {
										paginationMode: ['responseContainsNextURL'],
									},
								},
								default: '',
								description:
									'Should evaluate to the URL of the next page. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination" target="_blank">More info</a>.',
							},
							{
								displayName: '参数',
								name: 'parameters',
								type: 'fixedCollection',
								displayOptions: {
									show: {
										paginationMode: ['updateAParameterInEachRequest'],
									},
								},
								typeOptions: {
									multipleValues: true,
									noExpression: true,
								},
								placeholder: 'Add Parameter',
								default: {
									parameters: [
										{
											type: 'qs',
											name: '',
											value: '',
										},
									],
								},
								options: [
									{
										name: 'parameters',
										displayName: 'Parameter',
										values: [
											{
												displayName: '类型',
												name: 'type',
												type: 'options',
												options: [
													{
														name: 'Body',
														value: 'body',
													},
													{
														name: 'Header',
														value: 'headers',
													},
													{
														name: 'Query',
														value: 'qs',
													},
												],
												default: 'qs',
												description: 'Where the parameter should be set',
											},
											{
												displayName: 'Name',
												name: 'name',
												type: 'string',
												default: '',
												placeholder: 'e.g page',
											},
											{
												displayName: 'Value',
												name: 'value',
												type: 'string',
												default: '',
												hint: 'Use expression mode and $response to access response data',
											},
										],
									},
								],
							},
							{
								displayName: '分页完成条件',
								name: 'paginationCompleteWhen',
								type: 'options',
								typeOptions: {
									noDataExpression: true,
								},
								displayOptions: {
									hide: {
										paginationMode: ['off'],
									},
								},
								options: [
									{
										name: 'Response Is Empty',
										value: 'responseIsEmpty',
									},
									{
										name: 'Receive Specific Status Code(s)',
										value: 'receiveSpecificStatusCodes',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: 'responseIsEmpty',
								description: 'When should no further requests be made?',
							},
							{
								displayName: 'Status Code(s) when Complete',
								name: 'statusCodesWhenComplete',
								type: 'string',
								typeOptions: {
									noDataExpression: true,
								},
								displayOptions: {
									show: {
										paginationCompleteWhen: ['receiveSpecificStatusCodes'],
									},
								},
								default: '',
								description: 'Accepts comma-separated values',
							},
							{
								displayName: 'Complete Expression',
								name: 'completeExpression',
								type: 'string',
								displayOptions: {
									show: {
										paginationCompleteWhen: ['other'],
									},
								},
								default: '',
								description:
									'Should evaluate to true when pagination is complete. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination" target="_blank">More info</a>.',
							},
							{
								displayName: '限制获取页数',
								name: 'limitPagesFetched',
								type: 'boolean',
								typeOptions: {
									noDataExpression: true,
								},
								displayOptions: {
									hide: {
										paginationMode: ['off'],
									},
								},
								default: false,
								noDataExpression: true,
								description: 'Whether the number of requests should be limited',
							},
							{
								displayName: '最大页数',
								name: 'maxRequests',
								type: 'number',
								typeOptions: {
									noDataExpression: true,
								},
								displayOptions: {
									show: {
										limitPagesFetched: [true],
									},
								},
								default: 100,
								description: 'Maximum amount of request to be make',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								displayName: 'Interval Between Requests (ms)',
								name: 'requestInterval',
								type: 'number',
								displayOptions: {
									hide: {
										paginationMode: ['off'],
									},
								},
								default: 0,
								description: 'Time in milliseconds to wait between requests',
								hint: 'At 0 no delay will be added',
								typeOptions: {
									minValue: 0,
								},
							},
						],
					},
				],
			},
			{
				displayName: '代理服务器',
				name: 'proxy',
				type: 'string',
				default: '',
				placeholder: 'e.g. http://myproxy:3128',
				description: 'HTTP proxy to use',
			},
			{
				displayName: '超时时间',
				name: 'timeout',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 10000,
				description:
					'Time in ms to wait for the server to send response headers (and start the response body) before aborting the request',
			},
		],
	},
	...optimizeResponseProperties.map((prop) => ({
		...prop,
		displayOptions: {
			...prop.displayOptions,
			show: { ...prop.displayOptions?.show, '@tool': [true] },
		},
	})),
	{
		displayName:
			"You can view the raw requests this node makes in your browser's developer console",
		name: 'infoMessage',
		type: 'notice',
		default: '',
	},
];
