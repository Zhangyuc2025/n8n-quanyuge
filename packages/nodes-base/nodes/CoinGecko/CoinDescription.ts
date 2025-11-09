import type { INodeProperties } from 'n8n-workflow';

export const coinOperations: INodeProperties[] = [
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['coin'],
			},
		},
		options: [
			{
				name: '蜡烛图',
				value: 'candlestick',
				description: '获取选定货币的蜡烛图（开盘价-最高价-最低价-收盘价）',
				action: '获取币种蜡烛图',
			},
			{
				name: '获取',
				value: 'get',
				description: '获取币种的当前数据',
				action: '获取币种数据',
			},
			{
				name: '获取多个',
				value: 'getAll',
				description: '获取多个币种',
				action: '获取多个币种',
			},
			{
				name: '历史数据',
				value: 'history',
				description: '获取指定日期的币种历史数据（名称、价格、市场、统计数据）',
				action: '获取币种历史数据',
			},
			{
				name: '市场数据',
				value: 'market',
				description: '获取与所选货币匹配的所有交易对的价格和市场相关数据',
				action: '获取币种市场价格',
			},
			{
				name: '市场图表',
				value: 'marketChart',
				description: '获取历史市场数据，包括价格、市值和 24 小时成交量（粒度自动）',
				action: '获取币种市场图表',
			},
			{
				name: '价格',
				value: 'price',
				description: '获取任何加密货币在任何其他支持货币中的当前价格',
				action: '获取币种价格',
			},
			{
				name: '行情',
				value: 'ticker',
				description: '获取币种行情数据',
				action: '获取币种行情',
			},
		],
		default: 'getAll',
	},
];

export const coinFields: INodeProperties[] = [
	{
		displayName: '搜索方式',
		name: 'searchBy',
		required: true,
		type: 'options',
		options: [
			{
				name: '币种 ID',
				value: 'coinId',
			},
			{
				name: '合约地址',
				value: 'contractAddress',
			},
		],
		displayOptions: {
			show: {
				operation: ['get', 'marketChart', 'price'],
				resource: ['coin'],
			},
		},
		default: 'coinId',
		description: '按币种 ID 或合约地址搜索',
	},
	{
		displayName: '币种名称或 ID',
		name: 'coinId',
		required: true,
		type: 'options',
		description:
			'从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['coin'],
			},
		},
		default: '',
		placeholder: 'bitcoin',
	},
	{
		displayName: '基础货币名称或 ID',
		name: 'baseCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['candlestick'],
				resource: ['coin'],
			},
		},
		default: '',
		description:
			'交易对中的第一个货币。例如 BTC:ETH 中为 BTC。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
	},
	{
		displayName: '基础货币名称或 ID',
		name: 'baseCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		displayOptions: {
			show: {
				operation: ['market'],
				resource: ['coin'],
			},
		},
		default: '',
		description:
			'交易对中的第一个货币。例如 BTC:ETH 中为 BTC。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
	},
	{
		displayName: '币种名称或 ID',
		name: 'coinId',
		required: true,
		type: 'options',
		description:
			'从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['ticker', 'history'],
				resource: ['coin'],
			},
		},
		default: '',
		placeholder: 'bitcoin',
	},
	{
		displayName: '基础货币名称或 ID',
		name: 'baseCurrencies',
		required: true,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['price'],
				resource: ['coin'],
				searchBy: ['coinId'],
			},
		},
		default: [],
		placeholder: 'bitcoin',
		description:
			'交易对中的第一个货币。例如 BTC:ETH 中为 BTC。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
	},
	{
		displayName: '平台 ID',
		name: 'platformId',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'marketChart', 'price'],
				resource: ['coin'],
				searchBy: ['contractAddress'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'Ethereum',
				value: 'ethereum',
			},
		],
		default: 'ethereum',
		description: '发行代币的平台 ID',
	},
	{
		displayName: '合约地址',
		name: 'contractAddress',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['get', 'marketChart'],
				resource: ['coin'],
				searchBy: ['contractAddress'],
			},
		},
		description: '代币的合约地址',
	},
	{
		displayName: '合约地址',
		name: 'contractAddresses',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['price'],
				resource: ['coin'],
				searchBy: ['contractAddress'],
			},
		},
		description: '代币的合约地址，用逗号分隔',
	},
	{
		displayName: '基础货币名称或 ID',
		name: 'baseCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['marketChart'],
				resource: ['coin'],
				searchBy: ['coinId'],
			},
			hide: {
				searchBy: ['contractAddress'],
			},
		},
		default: '',
		description:
			'交易对中的第一个货币。例如 BTC:ETH 中为 BTC。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
	},
	{
		displayName: '报价货币名称或 ID',
		name: 'quoteCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		displayOptions: {
			show: {
				operation: ['candlestick', 'marketChart'],
				resource: ['coin'],
			},
		},
		default: '',
		description:
			'交易对中的第二个货币。例如 BTC:ETH 中为 ETH。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
	},
	{
		displayName: '报价货币名称或 ID',
		name: 'quoteCurrencies',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['price'],
				resource: ['coin'],
			},
		},
		default: [],
		description:
			'交易对中的第二个货币。例如 BTC:ETH 中为 ETH。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
	},
	{
		displayName: '时间范围（天数）',
		name: 'days',
		required: true,
		type: 'options',

		options: [
			{
				name: '1',
				value: '1',
			},
			{
				name: '7',
				value: '7',
			},
			{
				name: '14',
				value: '14',
			},
			{
				name: '30',
				value: '30',
			},
			{
				name: '90',
				value: '90',
			},
			{
				name: '180',
				value: '180',
			},
			{
				name: '365',
				value: '365',
			},
			{
				name: '最大值',
				value: 'max',
			},
		],
		displayOptions: {
			show: {
				operation: ['marketChart', 'candlestick'],
				resource: ['coin'],
			},
		},
		default: '',
		description: '返回过去 N 天的数据',
	},
	{
		displayName: '日期',
		name: 'date',
		required: true,
		type: 'dateTime',
		displayOptions: {
			show: {
				operation: ['history'],
				resource: ['coin'],
			},
		},
		default: '',
		description: '数据快照的日期',
	},
	{
		displayName: '返回全部',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll', 'market', 'ticker'],
				resource: ['coin'],
			},
		},
		default: false,
		description: '是否返回所有结果或仅返回到给定限制为止的结果',
	},
	{
		displayName: '限制',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll', 'market', 'ticker'],
				resource: ['coin'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: '返回结果的最大数量',
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['market'],
			},
		},
		options: [
			{
				displayName: '币种 ID',
				name: 'ids',
				type: 'string',
				placeholder: 'bitcoin',
				default: '',
				description: '按币种 ID 的逗号分隔列表筛选结果',
			},
			{
				displayName: '分类',
				name: 'category',
				type: 'options',
				options: [
					{
						name: '分散金融 Defi',
						value: 'decentralized_finance_defi',
					},
				],
				default: 'decentralized_finance_defi',
				description: '按币种分类筛选',
			},
			{
				displayName: '排序',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Gecko 升序',
						value: 'gecko_asc',
					},
					{
						name: 'Gecko 降序',
						value: 'gecko_desc',
					},
					{
						name: 'ID 升序',
						value: 'id_asc',
					},
					{
						name: 'ID 降序',
						value: 'id_desc',
					},
					{
						name: '市值升序',
						value: 'market_cap_asc',
					},
					{
						name: '市值降序',
						value: 'market_cap_desc',
					},
					{
						name: '成交量升序',
						value: 'volume_asc',
					},
					{
						name: '成交量降序',
						value: 'volume_desc',
					},
				],
				default: '',
				description: '按字段排序结果',
			},
			{
				displayName: '走势图',
				name: 'sparkline',
				type: 'boolean',
				default: false,
				description: '是否包含 7 天走势图数据',
			},
			{
				displayName: '价格涨跌幅',
				name: 'price_change_percentage',
				type: 'multiOptions',
				// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
				options: [
					{
						name: '1 小时',
						value: '1h',
					},
					{
						name: '24 小时',
						value: '24h',
					},
					{
						name: '7 天',
						value: '7d',
					},
					{
						name: '14 天',
						value: '14d',
					},
					{
						name: '30 天',
						value: '30d',
					},
					{
						name: '200 天',
						value: '200d',
					},
					{
						name: '1 年',
						value: '1y',
					},
				],
				default: [],
				description: '包含指定时间的价格涨跌幅百分比',
			},
		],
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加字段',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['price'],
			},
		},
		options: [
			{
				displayName: '包含 24 小时涨幅',
				name: 'include_24hr_change',
				type: 'boolean',
				default: false,
			},
			{
				displayName: '包含 24 小时成交量',
				name: 'include_24hr_vol',
				type: 'boolean',
				default: false,
			},
			{
				displayName: '包含最后更新时间',
				name: 'include_last_updated_at',
				type: 'boolean',
				default: false,
			},
			{
				displayName: '包含市值',
				name: 'include_market_cap',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['ticker'],
			},
		},
		options: [
			{
				displayName: '交易所名称或 ID',
				name: 'exchange_ids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getExchanges',
				},
				default: [],
				description:
					'按交易所 ID 筛选结果。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID',
			},
			{
				displayName: '包含交易所标志',
				name: 'include_exchange_logo',
				type: 'boolean',
				default: false,
			},
			{
				displayName: '排序',
				name: 'order',
				type: 'options',
				options: [
					{
						name: '信任评分降序',
						value: 'trust_score_desc',
					},
					{
						name: '信任评分升序',
						value: 'trust_score_asc',
					},
					{
						name: '成交量降序',
						value: 'volume_desc',
					},
				],
				default: 'trust_score_desc',
				description: '按所选规则排序结果',
			},
		],
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加选项',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['history'],
			},
		},
		options: [
			{
				displayName: '本地化',
				name: 'localization',
				type: 'boolean',
				default: true,
				description: '是否在响应中排除本地化的语言',
			},
		],
	},
	{
		displayName: '选项',
		name: 'options',
		type: 'collection',
		placeholder: '添加字段',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['coin'],
			},
		},
		options: [
			{
				displayName: '社区数据',
				name: 'community_data',
				type: 'boolean',
				default: false,
				description: '是否包含社区数据',
			},
			{
				displayName: '开发者数据',
				name: 'developer_data',
				type: 'boolean',
				default: false,
				description: '是否包含开发者数据',
			},
			{
				displayName: '本地化',
				name: 'localization',
				type: 'boolean',
				default: false,
				description: '是否在响应中包含所有本地化的语言',
			},
			{
				displayName: '市场数据',
				name: 'market_data',
				type: 'boolean',
				default: false,
				description: '是否包含市场数据',
			},
			{
				displayName: '走势图',
				name: 'sparkline',
				type: 'boolean',
				default: false,
				description: '是否包含 7 天走势图数据（例如：true、false）',
			},
			{
				displayName: '行情',
				name: 'tickers',
				type: 'boolean',
				default: false,
				description: '是否包含行情数据',
			},
		],
	},
];
