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
						displayName: '参数类型',
						name: 'parameterType',
						type: 'options',
						options: [
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'n8n 二进制文件',
								value: 'formBinaryData',
							},
							{
								name: '表单数据',
								value: 'formData',
							},
						],
						default: 'formData',
					},
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
						displayOptions: {
							show: {
								parameterType: ['formData'],
							},
						},
						default: '',
						description: '要设置的字段值',
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
						description: '包含待处理二进制文件数据的传入字段名称',
					},
				],
			},
		],
	},
	{
		displayName: '指定请求体方式',
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
				name: '使用下面的字段',
				value: 'keypair',
			},
			{
				name: '使用单个字段',
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
		description: '包含待处理二进制文件数据的传入字段名称',
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
								description: '输入将被分批处理以限制请求。-1 表示禁用。0 将被视为 1。',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								displayName: '批次间隔（毫秒）',
								name: 'batchInterval',
								type: 'number',
								typeOptions: {
									minValue: 0,
								},
								default: 1000,
								description: '每批请求之间的时间间隔（毫秒）。0 表示禁用。',
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
				description: '是否在 SSL 证书验证不可用时仍下载响应',
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
						name: '无括号',
						value: 'repeat',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
						description: '例如 foo=bar&foo=qux',
					},
					{
						name: '仅括号',
						value: 'brackets',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
						description: '例如 foo[]=bar&foo[]=qux',
					},
					{
						name: '带索引的括号',
						value: 'indices',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
						description: '例如 foo[0]=bar&foo[1]=qux',
					},
				],
				default: 'brackets',
			},
			{
				displayName: '小写请求头',
				name: 'lowercaseHeaders',
				type: 'boolean',
				default: true,
				description: '是否将请求头名称转换为小写',
			},
			{
				displayName: '重定向',
				name: 'redirect',
				placeholder: '添加重定向',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: { redirect: {} },
				options: [
					{
						displayName: '重定向',
						name: 'redirect',
						values: [
							{
								displayName: '跟随重定向',
								name: 'followRedirects',
								type: 'boolean',
								default: false,
								noDataExpression: true,
								description: '是否跟随所有重定向',
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
								description: '最大跟随重定向次数',
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
				placeholder: '添加重定向',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					redirect: {},
				},
				options: [
					{
						displayName: '重定向',
						name: 'redirect',
						values: [
							{
								displayName: '跟随重定向',
								name: 'followRedirects',
								type: 'boolean',
								default: true,
								noDataExpression: true,
								description: '是否跟随所有重定向',
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
								description: '最大跟随重定向次数',
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
				placeholder: '添加响应',
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
								description: '是否返回完整响应（请求头和响应状态码）数据，而不仅仅是响应体',
							},
							{
								displayName: '永不报错',
								name: 'neverError',
								type: 'boolean',
								default: false,
								description: '是否在状态码不是 2xx 时仍然成功',
							},
							{
								displayName: '响应格式',
								name: 'responseFormat',
								type: 'options',
								noDataExpression: true,
								options: [
									{
										name: '自动检测',
										value: 'autodetect',
									},
									{
										name: '文件',
										value: 'file',
									},
									{
										name: 'JSON',
										value: 'json',
									},
									{
										name: '文本',
										value: 'text',
									},
								],
								default: 'autodetect',
								description: '从 URL 返回数据的格式',
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
								description: '用于写入读取文件数据的二进制属性名称',
							},
						],
					},
				],
			},
			{
				displayName: '分页',
				name: 'pagination',
				placeholder: '添加分页',
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
										name: '关闭',
										value: 'off',
									},
									{
										name: '在每个请求中更新参数',
										value: 'updateAParameterInEachRequest',
									},
									{
										name: '响应包含下一页 URL',
										value: 'responseContainsNextURL',
									},
								],
								default: 'updateAParameterInEachRequest',
								description: '是否使用分页',
							},
							{
								displayName:
									'使用 $response 变量访问上一个响应的数据。有关分页的更多信息，请参阅<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.httprequest" target="_blank">文档</a>',
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
									'应该求值为下一页的 URL。<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination" target="_blank">更多信息</a>。',
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
								placeholder: '添加参数',
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
										displayName: '参数',
										values: [
											{
												displayName: '类型',
												name: 'type',
												type: 'options',
												options: [
													{
														name: '请求体',
														value: 'body',
													},
													{
														name: '请求头',
														value: 'headers',
													},
													{
														name: '查询参数',
														value: 'qs',
													},
												],
												default: 'qs',
												description: '参数应该设置在哪里',
											},
											{
												displayName: '名称',
												name: 'name',
												type: 'string',
												default: '',
												placeholder: '例如 page',
											},
											{
												displayName: '值',
												name: 'value',
												type: 'string',
												default: '',
												hint: '使用表达式模式和 $response 访问响应数据',
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
										name: '响应为空',
										value: 'responseIsEmpty',
									},
									{
										name: '接收特定状态码',
										value: 'receiveSpecificStatusCodes',
									},
									{
										name: '其他',
										value: 'other',
									},
								],
								default: 'responseIsEmpty',
								description: '何时不再发起请求？',
							},
							{
								displayName: '完成时的状态码',
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
								description: '接受逗号分隔的值',
							},
							{
								displayName: '完成表达式',
								name: 'completeExpression',
								type: 'string',
								displayOptions: {
									show: {
										paginationCompleteWhen: ['other'],
									},
								},
								default: '',
								description:
									'当分页完成时应该求值为 true。<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination" target="_blank">更多信息</a>。',
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
								description: '是否限制请求数量',
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
								description: '要发起的最大请求数量',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								displayName: '请求间隔（毫秒）',
								name: 'requestInterval',
								type: 'number',
								displayOptions: {
									hide: {
										paginationMode: ['off'],
									},
								},
								default: 0,
								description: '请求之间等待的时间（毫秒）',
								hint: '设为 0 时不会添加延迟',
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
				placeholder: '例如 http://myproxy:3128',
				description: '要使用的 HTTP 代理',
			},
			{
				displayName: '超时时间',
				name: 'timeout',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 10000,
				description: '在中止请求之前，等待服务器发送响应头（并开始响应体）的时间（毫秒）',
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
		displayName: '您可以在浏览器的开发者控制台中查看此节点发出的原始请求',
		name: 'infoMessage',
		type: 'notice',
		default: '',
	},
];
