import { NodeConnectionTypes } from 'n8n-workflow';
import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const metadataFilterField: INodeProperties = {
	displayName: '元数据过滤器',
	name: 'metadata',
	type: 'fixedCollection',
	description: '用于过滤文档的元数据',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: '添加过滤字段',
	options: [
		{
			name: 'metadataValues',
			displayName: '要设置的字段',
			values: [
				{
					displayName: '名称',
					name: 'name',
					type: 'string',
					default: '',
					required: true,
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
};

export function getTemplateNoticeField(templateId: number): INodeProperties {
	return {
		displayName: `通过<a href="/templates/${templateId}" target="_blank">示例</a>节省时间，了解此节点如何工作`,
		name: 'notice',
		type: 'notice',
		default: '',
	};
}

export function getBatchingOptionFields(
	displayOptions: IDisplayOptions | undefined,
	defaultBatchSize: number = 5,
): INodeProperties {
	return {
		displayName: '批处理',
		name: 'batching',
		type: 'collection',
		placeholder: '添加批处理选项',
		description: '用于速率限制的批处理选项',
		default: {},
		options: [
			{
				displayName: '批次大小',
				name: 'batchSize',
				default: defaultBatchSize,
				type: 'number',
				description: '并行处理的项目数量。这对于速率限制很有用，但可能会影响日志输出顺序。',
			},
			{
				displayName: '批次间延迟',
				name: 'delayBetweenBatches',
				default: 0,
				type: 'number',
				description: '批次之间的延迟（毫秒）。这对于速率限制很有用。',
			},
		],
		displayOptions,
	};
}

const connectionsString = {
	[NodeConnectionTypes.AiAgent]: {
		// Root AI view
		connection: '',
		locale: 'AI 智能体',
	},
	[NodeConnectionTypes.AiChain]: {
		// Root AI view
		connection: '',
		locale: 'AI 链',
	},
	[NodeConnectionTypes.AiDocument]: {
		connection: NodeConnectionTypes.AiDocument,
		locale: '文档加载器',
	},
	[NodeConnectionTypes.AiVectorStore]: {
		connection: NodeConnectionTypes.AiVectorStore,
		locale: '向量存储',
	},
	[NodeConnectionTypes.AiRetriever]: {
		connection: NodeConnectionTypes.AiRetriever,
		locale: '向量存储检索器',
	},
};

type AllowedConnectionTypes =
	| typeof NodeConnectionTypes.AiAgent
	| typeof NodeConnectionTypes.AiChain
	| typeof NodeConnectionTypes.AiDocument
	| typeof NodeConnectionTypes.AiVectorStore
	| typeof NodeConnectionTypes.AiRetriever;

// function determineArticle(nextWord: string): string {
// 	// check if the next word starts with a vowel sound
// 	const vowels = /^[aeiouAEIOU]/;
// 	return vowels.test(nextWord) ? 'an' : 'a';
// }
const getConnectionParameterString = (connectionType: string) => {
	if (connectionType === '') return "data-action-parameter-creatorview='AI'";

	return `data-action-parameter-connectiontype='${connectionType}'`;
};
const getAhref = (connectionType: { connection: string; locale: string }) =>
	`<a class="test" data-action='openSelectiveNodeCreator'${getConnectionParameterString(
		connectionType.connection,
	)}'>${connectionType.locale}</a>`;

export function getConnectionHintNoticeField(
	connectionTypes: AllowedConnectionTypes[],
): INodeProperties {
	const groupedConnections = new Map<string, string[]>();

	// group connection types by their 'connection' value
	// to not create multiple links
	connectionTypes.forEach((connectionType) => {
		const connectionString = connectionsString[connectionType].connection;
		const localeString = connectionsString[connectionType].locale;

		if (!groupedConnections.has(connectionString)) {
			groupedConnections.set(connectionString, [localeString]);
			return;
		}

		groupedConnections.get(connectionString)?.push(localeString);
	});

	let displayName;

	if (groupedConnections.size === 1) {
		const [[connection, locales]] = Array.from(groupedConnections);

		displayName = `此节点必须连接到${locales[0]}。<a data-action='openSelectiveNodeCreator' ${getConnectionParameterString(
			connection,
		)}>插入一个</a>`;
	} else {
		const ahrefs = Array.from(groupedConnections, ([connection, locales]) => {
			// If there are multiple locales, join them with ' or '
			// use determineArticle to insert the correct article
			const locale =
				locales.length > 1
					? locales
							.map((localeString, index, { length }) => {
								return index < length - 1 ? `${localeString}或` : localeString;
							})
							.join('')
					: locales[0];
			return getAhref({ connection, locale });
		});

		displayName = `此节点需要连接到 ${ahrefs.join('或')}。`;
	}

	return {
		displayName,
		name: 'notice',
		type: 'notice',
		default: '',
		typeOptions: {
			containerClass: 'ndv-connection-hint-notice',
		},
	};
}
