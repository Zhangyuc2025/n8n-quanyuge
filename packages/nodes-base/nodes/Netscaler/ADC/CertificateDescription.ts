import type { INodeProperties } from 'n8n-workflow';

export const certificateDescription: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: '创建',
				value: 'create',
				action: '创建证书',
			},
			{
				name: '安装',
				value: 'install',
				action: '安装证书',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                certificate:create                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: '证书文件名',
		name: 'certificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: '',
		description: '生成的证书文件的名称和可选路径。默认路径为 /nsconfig/ssl/。',
	},
	{
		displayName: '证书格式',
		name: 'certificateFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: 'PEM',
		description: '证书在设备上存储的格式',
	},
	{
		displayName: '证书类型',
		name: 'certificateType',
		type: 'options',
		options: [
			{
				name: '根证书颁发机构',
				value: 'ROOT_CERT',
				description:
					'您必须指定密钥文件名。生成的根 CA 证书可用于签署最终用户客户端或服务器证书，或创建中间 CA 证书。',
			},
			{
				name: '中间证书颁发机构',
				value: 'INTM_CERT',
				description: '中间 CA 证书',
			},
			{
				name: '服务器证书',
				value: 'SRVR_CERT',
				description: '在 SSL 服务器上用于端到端加密的 SSL 服务器证书',
			},
			{
				name: '客户端证书',
				value: 'CLNT_CERT',
				description: '用于客户端身份验证的最终用户客户端证书',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: 'ROOT_CERT',
	},
	{
		displayName: '证书请求文件名',
		name: 'certificateRequestFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
			},
		},
		description: '证书签名请求 (CSR) 的名称和可选路径。默认路径为 /nsconfig/ssl/。',
	},
	{
		displayName: 'CA 证书文件名',
		name: 'caCertificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description: '签发和签署中间 CA 证书或最终用户客户端和服务器证书的 CA 证书文件名称',
	},
	{
		displayName: 'CA 证书文件格式',
		name: 'caCertificateFileFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: 'PEM',
		description: 'CA 证书的格式',
	},
	{
		displayName: 'CA 私钥文件名',
		name: 'caPrivateKeyFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description:
			'与用于签署中间 CA 证书或最终用户客户端和服务器证书的 CA 证书关联的私钥。如果 CA 密钥文件受密码保护，将提示用户输入用于加密密钥的密码。',
	},
	{
		displayName: 'CA 私钥文件格式',
		name: 'caPrivateKeyFileFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: 'PEM',
		description: 'CA 证书的格式',
	},
	{
		displayName: '私钥文件名',
		name: 'privateKeyFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
				certificateType: ['ROOT_CERT'],
			},
		},
		description:
			'私钥的名称和可选路径。您可以使用您拥有的现有 RSA 或 DSA 密钥，也可以在 Netscaler ADC 上创建新的私钥。仅在创建自签名根 CA 证书时才需要此文件。密钥文件默认存储在 /nsconfig/ssl 目录中。',
	},
	{
		displayName: 'CA 序列号文件',
		name: 'caSerialFileNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description: '为 CA 证书维护的序列号文件。此文件包含 CA 要签发或签署的下一个证书的序列号。',
	},
	{
		displayName: '私钥格式',
		name: 'privateKeyFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['ROOT_CERT'],
			},
		},
		default: 'PEM',
		description: '密钥在设备上存储的格式',
	},
	{
		displayName: '附加字段',
		name: 'additionalFields',
		type: 'collection',
		placeholder: '添加字段',
		default: {},
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'PEM 密码（用于加密密钥）',
				name: 'pempassphrase',
				type: 'string',
				displayOptions: {
					show: {
						'/certificateType': ['ROOT_CERT'],
					},
				},
				default: '',
				description:
					'私钥的名称和可选路径。您可以使用您拥有的现有 RSA 或 DSA 密钥，也可以在 Netscaler ADC 上创建新的私钥。仅在创建自签名根 CA 证书时才需要此文件。密钥文件默认存储在 /nsconfig/ssl 目录中。',
			},
			{
				displayName: 'PEM 密码（用于加密 CA 密钥）',
				name: 'pempassphrase',
				type: 'string',
				displayOptions: {
					hide: {
						'/certificateType': ['ROOT_CERT'],
					},
				},
				default: '',
				description:
					'私钥的名称和可选路径。您可以使用您拥有的现有 RSA 或 DSA 密钥，也可以在 Netscaler ADC 上创建新的私钥。仅在创建自签名根 CA 证书时才需要此文件。密钥文件默认存储在 /nsconfig/ssl 目录中。',
			},
			{
				displayName: '主体备用名称',
				name: 'subjectaltname',
				type: 'string',
				default: '',
				description:
					'主体备用名称 (SAN) 是 X.509 的扩展，允许使用 subjectAltName 字段将各种值与安全证书关联',
			},
			{
				displayName: '有效期（天数）',
				name: 'days',
				type: 'string',
				default: '',
				description: '证书有效的天数，从创建时间和日期（系统时间）开始计算',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                certificate:install                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: '证书密钥对名称',
		name: 'certificateKeyPairName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: '',
		description: '证书和私钥对的名称',
	},
	{
		displayName: '证书文件名',
		name: 'certificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: '',
		description: '用于形成证书密钥对的 X509 证书文件的名称和可选路径。默认路径为 /nsconfig/ssl/。',
	},
	{
		displayName: '私钥文件名',
		name: 'privateKeyFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		description: '用于形成证书密钥对的 X509 证书文件的名称和可选路径。默认路径为 /nsconfig/ssl/。',
	},
	{
		displayName: '证书格式',
		name: 'certificateFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: 'PEM',
		description:
			'证书和私钥文件的输入格式。设备支持的三种格式为：PEM - 增强隐私邮件，DER - 可分辨编码规则，PFX - 个人信息交换。',
	},
	{
		displayName: '密码',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
				certificateFormat: ['PEM'],
			},
		},
		default: '',
		description:
			'证书和私钥文件的输入格式。设备支持的三种格式为：PEM - 增强隐私邮件，DER - 可分辨编码规则，PFX - 个人信息交换。',
	},
	{
		displayName: '到期时通知',
		name: 'notifyExpiration',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: false,
		description: '证书即将到期时是否发出警报',
	},
	{
		displayName: '通知期限（天数）',
		name: 'notificationPeriod',
		type: 'number',
		default: 10,
		required: true,
		typeOptions: {
			minValue: 10,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
				notifyExpiration: [true],
			},
		},
		description: '在证书到期前多少天生成证书即将到期的警报',
	},
	{
		displayName: '证书捆绑包',
		name: 'certificateBundle',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
				certificateFormat: ['PEM'],
			},
		},
		description: '是否在将服务器证书链接到文件中的颁发者证书后，将证书链解析为单个文件',
	},
];
