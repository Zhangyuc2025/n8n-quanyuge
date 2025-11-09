import isEmpty from 'lodash/isEmpty';
import set from 'lodash/set';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy } from 'n8n-workflow';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Converter } from 'showdown';

export class Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown',
		name: 'markdown',
		icon: { light: 'file:markdown.svg', dark: 'file:markdown.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle:
			'={{$parameter["mode"]==="markdownToHtml" ? "Markdown 转 HTML" : "HTML 转 Markdown"}}',
		description: '在 Markdown 和 HTML 格式之间进行转换',
		defaults: {
			name: 'Markdown',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		properties: [
			{
				displayName: '模式',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Markdown 转 HTML',
						value: 'markdownToHtml',
						description: '将数据从 Markdown 转换为 HTML',
					},
					{
						name: 'HTML 转 Markdown',
						value: 'htmlToMarkdown',
						description: '将数据从 HTML 转换为 Markdown',
					},
				],
				default: 'htmlToMarkdown',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['htmlToMarkdown'],
					},
				},
				default: '',
				required: true,
				description: '要转换为 Markdown 的 HTML 内容',
			},
			{
				displayName: 'Markdown',
				name: 'markdown',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['markdownToHtml'],
					},
				},
				default: '',
				required: true,
				description: '要转换为 HTML 的 Markdown 内容',
			},
			{
				displayName: '目标字段',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['markdownToHtml', 'htmlToMarkdown'],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description: '存放输出结果的字段。使用点号指定嵌套字段，例如 "level1.level2.newKey"',
			},

			//============= HTML to Markdown Options ===============
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						mode: ['htmlToMarkdown'],
					},
				},
				options: [
					{
						displayName: '列表标记',
						name: 'bulletMarker',
						type: 'string',
						default: '*',
						description: '指定列表标记符号，默认为 *',
					},
					{
						displayName: '代码块围栏',
						name: 'codeFence',
						type: 'string',
						default: '```',
						description: '指定代码块围栏符号，默认为 ```',
					},
					{
						displayName: '强调分隔符',
						name: 'emDelimiter',
						type: 'string',
						default: '_',
						description: '指定强调分隔符，默认为 _',
					},
					{
						displayName: '全局转义模式',
						name: 'globalEscape',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						description: '设置此项将覆盖默认转义设置，您可能更希望使用文本替换选项',
						options: [
							{
								name: 'value',
								displayName: '值',
								values: [
									{
										displayName: '模式',
										name: 'pattern',
										type: 'string',
										default: '',
										description: '正则表达式模式',
									},
									{
										displayName: '替换值',
										name: 'replacement',
										type: 'string',
										default: '',
										description: '字符串替换值',
									},
								],
							},
						],
					},
					{
						displayName: '忽略元素',
						name: 'ignore',
						type: 'string',
						default: '',
						description: '指定要忽略的元素（忽略内部文本，不解析子元素）',
						placeholder: '例如：h1, p ...',
						hint: '用逗号分隔多个元素',
					},
					{
						displayName: '保留数据图片',
						name: 'keepDataImages',
						type: 'boolean',
						default: false,
						description:
							'是否保留 data: URI 格式的图片（注意：每个可能高达 1MB），例如 &lt;img src="data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSK......0o/"&gt;',
					},
					{
						displayName: '行首转义模式',
						name: 'lineStartEscape',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						description: '设置此项将覆盖默认转义设置，您可能更希望使用文本替换选项',
						options: [
							{
								name: 'value',
								displayName: '值',
								values: [
									{
										displayName: '模式',
										name: 'pattern',
										type: 'string',
										default: '',
										description: '正则表达式模式',
									},
									{
										displayName: '替换值',
										name: 'replacement',
										type: 'string',
										default: '',
										description: '字符串替换值',
									},
								],
							},
						],
					},
					{
						displayName: '最大连续换行数',
						name: 'maxConsecutiveNewlines',
						type: 'number',
						default: 3,
						description: '指定允许的最大连续换行数',
					},
					{
						displayName: '将 URL 放置在底部',
						name: 'useLinkReferenceDefinitions',
						type: 'boolean',
						default: false,
						description: '是否将 URL 放置在底部，并使用链接引用定义格式化链接',
					},
					{
						displayName: '加粗分隔符',
						name: 'strongDelimiter',
						type: 'string',
						default: '**',
						description: '指定加粗分隔符，默认为 **',
					},
					{
						displayName: '代码块样式',
						name: 'codeBlockStyle',
						type: 'options',
						default: 'fence',
						description: '指定代码块样式，默认为"fence"',
						options: [
							{
								name: '围栏式',
								value: 'fence',
							},
							{
								name: '缩进式',
								value: 'indented',
							},
						],
					},
					{
						displayName: '文本替换模式',
						name: 'textReplace',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: [],
						description: '用户定义的文本替换模式（替换从节点检索到的匹配文本）',
						options: [
							{
								name: 'values',
								displayName: '值',
								values: [
									{
										displayName: '模式',
										name: 'pattern',
										type: 'string',
										default: '',
										description: '正则表达式模式',
									},
									{
										displayName: '替换值',
										name: 'replacement',
										type: 'string',
										default: '',
										description: '字符串替换值',
									},
								],
							},
						],
					},
					{
						displayName: '视为块元素',
						name: 'blockElements',
						type: 'string',
						default: '',
						description: '指定要视为块元素的标签（使用空行包围）',
						placeholder: '例如：p, div, ...',
						hint: '用逗号分隔多个元素',
					},
				],
			},
			//============= Markdown to HTML Options ===============
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					show: {
						mode: ['markdownToHtml'],
					},
				},
				options: [
					{
						displayName: '在新窗口打开链接',
						name: 'openLinksInNewWindow',
						type: 'boolean',
						default: false,
						description: '是否在新窗口中打开所有链接（通过向 <a> 标签添加 target="_blank" 属性）',
					},
					{
						displayName: '自动链接到 URL',
						name: 'simplifiedAutoLink',
						type: 'boolean',
						default: false,
						description: '是否启用自动链接到 URL',
					},
					{
						displayName: '反斜杠转义 HTML 标签',
						name: 'backslashEscapesHTMLTags',
						type: 'boolean',
						default: false,
						description: '是否支持 HTML 标签转义，例如：&lt;div&gt;foo&lt;/div&gt;',
					},
					{
						displayName: '输出完整 HTML 文档',
						name: 'completeHTMLDocument',
						type: 'boolean',
						default: false,
						description:
							'是否输出完整的 HTML 文档，包括 &lt;html&gt;、&lt;head&gt; 和 &lt;body&gt; 标签，而不是 HTML 片段',
					},
					{
						displayName: '自定义标题 ID',
						name: 'customizedHeaderId',
						type: 'boolean',
						default: false,
						description: '是否使用花括号中的文本作为标题 ID',
					},
					{
						displayName: 'Emoji 支持',
						name: 'emoji',
						type: 'boolean',
						default: false,
						description:
							'是否启用 emoji 支持。例如：this is a :smile: emoji。有关可用 emoji 的更多信息，请参见 https://github.com/showdownjs/showdown/wiki/Emojis',
					},
					{
						displayName: '编码电子邮件地址',
						name: 'encodeEmails',
						type: 'boolean',
						default: true,
						description:
							'是否通过字符实体编码电子邮件地址，将 ASCII 电子邮件地址转换为等效的十进制实体',
					},
					{
						displayName: '从 URL 中排除尾随标点',
						name: 'excludeTrailingPunctuationFromURLs',
						type: 'boolean',
						default: false,
						description:
							'是否从自动链接的 URL 中排除尾随标点。排除的标点：. ! ? ( )。仅在 simplifiedAutoLink 选项设置为 true 时适用',
					},
					{
						displayName: 'GitHub 代码块',
						name: 'ghCodeBlocks',
						type: 'boolean',
						default: true,
						description: '是否启用 GFM 代码块样式支持',
					},
					{
						displayName: 'GitHub 兼容标题 ID',
						name: 'ghCompatibleHeaderId',
						type: 'boolean',
						default: false,
						description:
							'是否生成与 GitHub 样式兼容的标题 ID（空格替换为破折号，并删除一些非字母数字字符）',
					},
					{
						displayName: 'GitHub @提及链接',
						name: 'ghMentionsLink',
						type: 'string',
						default: 'https://github.com/{u}',
						description:
							'是否更改 @mentions 生成的链接。Showdown 将用用户名替换 {u}。仅在启用 ghMentions 选项时适用',
					},
					{
						displayName: 'GitHub @提及',
						name: 'ghMentions',
						type: 'boolean',
						default: false,
						description: '是否启用 GitHub @mentions，链接到提到的用户名',
					},
					{
						displayName: 'GitHub 任务列表',
						name: 'tasklists',
						type: 'boolean',
						default: false,
						description: '是否启用 GFM 任务列表支持',
					},
					{
						displayName: '标题起始级别',
						name: 'headerLevelStart',
						type: 'number',
						default: 1,
						description: '是否设置标题起始级别',
					},
					{
						displayName: '标题前必须有空格',
						name: 'requireSpaceBeforeHeadingText',
						type: 'boolean',
						default: false,
						description: '是否强制要求在 # 和标题文本之间添加空格',
					},
					{
						displayName: '词中星号',
						name: 'literalMidWordAsterisks',
						type: 'boolean',
						default: false,
						description:
							'是否阻止 showdown 将单词中间的星号解释为 <em> 和 <strong>，而是将它们视为字面星号',
					},
					{
						displayName: '词中下划线',
						name: 'literalMidWordUnderscores',
						type: 'boolean',
						default: false,
						description:
							'是否阻止 showdown 将单词中间的下划线解释为 <em> 和 <strong>，而是将它们视为字面下划线',
					},
					{
						displayName: '禁用标题 ID',
						name: 'noHeaderId',
						type: 'boolean',
						default: false,
						description: '是否禁用标题 ID 的自动生成',
					},
					{
						displayName: '解析图片尺寸',
						name: 'parseImgDimensions',
						type: 'boolean',
						default: false,
						description: '是否启用在 Markdown 语法中设置图片尺寸的支持',
					},
					{
						displayName: '标题 ID 前缀',
						name: 'prefixHeaderId',
						type: 'string',
						default: 'section',
						description: '为生成的标题 ID 添加前缀',
					},
					{
						displayName: '原始标题 ID',
						name: 'rawHeaderId',
						type: 'boolean',
						default: false,
						description:
							'是否仅从生成的标题 ID（包括前缀）中删除空格、单引号和双引号，并用破折号 (-) 替换它们',
					},
					{
						displayName: '原始前缀标题 ID',
						name: 'rawPrefixHeaderId',
						type: 'boolean',
						default: false,
						description: '是否阻止 showdown 修改前缀',
					},
					{
						displayName: '简单换行',
						name: 'simpleLineBreaks',
						type: 'boolean',
						default: false,
						description:
							'是否将换行解析为 &lt;br&gt;，就像 GitHub 那样，而不需要在行尾添加 2 个空格',
					},
					{
						displayName: '智能缩进修复',
						name: 'smartIndentationFix',
						type: 'boolean',
						default: false,
						description: '是否尝试智能修复与缩进代码中的 ES6 模板字符串相关的缩进问题',
					},
					{
						displayName: '空格缩进子列表',
						name: 'disableForced4SpacesIndentedSublists',
						type: 'boolean',
						default: false,
						description:
							'是否禁用子列表必须缩进 4 个空格才能嵌套的要求，实际上恢复到 2 或 3 个空格就足够的旧行为',
					},
					{
						displayName: '分割相邻引用块',
						name: 'splitAdjacentBlockquotes',
						type: 'boolean',
						default: false,
						description: '是否分割相邻的引用块',
					},
					{
						displayName: '删除线',
						name: 'strikethrough',
						type: 'boolean',
						default: false,
						description: '是否启用删除线语法支持',
					},
					{
						displayName: '表格标题 ID',
						name: 'tablesHeaderId',
						type: 'boolean',
						default: false,
						description: '是否为表格标题标签添加 ID 属性',
					},
					{
						displayName: '表格支持',
						name: 'tables',
						type: 'boolean',
						default: false,
						description: '是否启用表格语法支持',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const mode = this.getNodeParameter('mode', 0) as string;

		const { length } = items;
		for (let i = 0; i < length; i++) {
			try {
				if (mode === 'htmlToMarkdown') {
					const options = this.getNodeParameter('options', i);
					const destinationKey = this.getNodeParameter('destinationKey', i) as string;

					const textReplaceOption = this.getNodeParameter(
						'options.textReplace.values',
						i,
						[],
					) as IDataObject[];
					options.textReplace = !isEmpty(textReplaceOption)
						? textReplaceOption.map((entry) => [entry.pattern, entry.replacement])
						: undefined;

					const lineStartEscapeOption = this.getNodeParameter(
						'options.lineStartEscape.value',
						i,
						{},
					) as IDataObject;
					options.lineStartEscape = !isEmpty(lineStartEscapeOption)
						? [lineStartEscapeOption.pattern, lineStartEscapeOption.replacement]
						: undefined;

					const globalEscapeOption = this.getNodeParameter(
						'options.globalEscape.value',
						i,
						{},
					) as IDataObject;
					options.globalEscape = !isEmpty(globalEscapeOption)
						? [globalEscapeOption.pattern, globalEscapeOption.replacement]
						: undefined;

					options.ignore = options.ignore
						? (options.ignore as string).split(',').map((element) => element.trim())
						: undefined;
					options.blockElements = options.blockElements
						? (options.blockElements as string).split(',').map((element) => element.trim())
						: undefined;

					const markdownOptions = {} as IDataObject;

					Object.keys(options).forEach((option) => {
						if (options[option]) {
							markdownOptions[option] = options[option];
						}
					});

					const html = this.getNodeParameter('html', i) as string;

					const markdownFromHTML = NodeHtmlMarkdown.translate(html, markdownOptions);

					const newItem = deepCopy(items[i].json);
					set(newItem, destinationKey, markdownFromHTML);
					returnData.push(newItem);
				}

				if (mode === 'markdownToHtml') {
					const markdown = this.getNodeParameter('markdown', i) as string;
					const destinationKey = this.getNodeParameter('destinationKey', i) as string;
					const options = this.getNodeParameter('options', i);

					const converter = new Converter();

					Object.keys(options).forEach((key) => converter.setOption(key, options[key]));
					const htmlFromMarkdown = converter.makeHtml(markdown);

					const newItem = deepCopy(items[i].json);
					set(newItem, destinationKey, htmlFromMarkdown);

					returnData.push(newItem);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
