import { watch } from 'chokidar';
import type { EventName } from 'chokidar/handler';
import {
	type ITriggerFunctions,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerResponse,
	NodeConnectionTypes,
} from 'n8n-workflow';

export class LocalFileTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '本地文件触发器',
		name: 'localFileTrigger',
		icon: 'fa:folder-open',
		iconColor: 'black',
		group: ['trigger'],
		version: 1,
		subtitle: '=路径：{{$parameter["path"]}}',
		description: '在文件系统更改时触发工作流',
		eventTriggerDescription: '',
		defaults: {
			name: '本地文件触发器',
			color: '#404040',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>构建工作流时</b>，点击「执行步骤」按钮，然后对监视的文件或文件夹进行更改。这将触发一次执行，并显示在此编辑器中。<br /> <br /><b>当你对工作流满意时</b>，<a data-key='activate'>激活</a>它。然后每次检测到更改时，工作流都会执行。这些执行将显示在<a data-key='executions'>执行列表</a>中，但不会显示在编辑器中",
				active:
					"<b>构建工作流时</b>，点击「执行步骤」按钮，然后对监视的文件或文件夹进行更改。这将触发一次执行，并显示在此编辑器中。<br /> <br /><b>你的工作流也会自动执行</b>，因为它已激活。每次检测到更改时，此节点都会触发一次执行。这些执行将显示在<a data-key='executions'>执行列表</a>中，但不会显示在编辑器中",
			},
			activationHint:
				"完成工作流构建后，<a data-key='activate'>激活</a>它以使其持续监听（你只是看不到这些执行）",
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '触发条件',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: '特定文件的更改',
						value: 'file',
					},
					{
						name: '特定文件夹的相关更改',
						value: 'folder',
					},
				],
				required: true,
				default: '',
			},
			{
				displayName: '要监视的文件',
				name: 'path',
				type: 'string',
				displayOptions: {
					show: {
						triggerOn: ['file'],
					},
				},
				default: '',
				placeholder: '/data/invoices/1.pdf',
			},
			{
				displayName: '要监视的文件夹',
				name: 'path',
				type: 'string',
				displayOptions: {
					show: {
						triggerOn: ['folder'],
					},
				},
				default: '',
				placeholder: '/data/invoices',
			},
			{
				displayName: '监视事件',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						triggerOn: ['folder'],
					},
				},
				options: [
					{
						name: '文件添加',
						value: 'add',
						description: '每当添加新文件时触发',
					},
					{
						name: '文件更改',
						value: 'change',
						description: '每当文件更改时触发',
					},
					{
						name: '文件删除',
						value: 'unlink',
						description: '每当文件被删除时触发',
					},
					{
						name: '文件夹添加',
						value: 'addDir',
						description: '每当添加新文件夹时触发',
					},
					{
						name: '文件夹删除',
						value: 'unlinkDir',
						description: '每当文件夹被删除时触发',
					},
				],
				required: true,
				default: [],
				description: '要监听的事件',
			},

			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: 'Await Write Finish',
						name: 'awaitWriteFinish',
						type: 'boolean',
						default: false,
						description: 'Whether to wait until files finished writing to avoid partially read',
					},
					{
						displayName: 'Include Linked Files/Folders',
						name: 'followSymlinks',
						type: 'boolean',
						default: true,
						description:
							'Whether linked files/folders will also be watched (this includes symlinks, aliases on MacOS and shortcuts on Windows). Otherwise only the links themselves will be monitored).',
					},
					{
						displayName: 'Ignore',
						name: 'ignored',
						type: 'string',
						default: '',
						placeholder: '**/*.txt or ignore-me/subfolder',
						description:
							"Files or paths to ignore. The whole path is tested, not just the filename. Supports <a href=\"https://github.com/micromatch/anymatch\">Anymatch</a>- syntax. Regex patterns may not work on macOS. To ignore files based on substring matching, use the 'Ignore Mode' option with 'Contain'.",
					},
					{
						displayName: 'Ignore Existing Files/Folders',
						name: 'ignoreInitial',
						type: 'boolean',
						default: true,
						description: 'Whether to ignore existing files/folders to not trigger an event',
					},
					{
						displayName: '最大文件夹深度',
						name: 'depth',
						type: 'options',
						options: [
							{
								name: '向下 1 级',
								value: 1,
							},
							{
								name: '向下 2 级',
								value: 2,
							},
							{
								name: '向下 3 级',
								value: 3,
							},
							{
								name: '向下 4 级',
								value: 4,
							},
							{
								name: '向下 5 级',
								value: 5,
							},
							{
								name: '仅顶层文件夹',
								value: 0,
							},
							{
								name: '无限制',
								value: -1,
							},
						],
						default: -1,
						description: '监视文件夹结构的深度',
					},
					{
						displayName: '使用轮询',
						name: 'usePolling',
						type: 'boolean',
						default: false,
						description: '是否使用轮询进行监视。通常需要通过网络成功监视文件',
					},
					{
						displayName: '忽略模式',
						name: 'ignoreMode',
						type: 'options',
						options: [
							{
								name: '匹配',
								value: 'match',
								description: '使用正则表达式模式忽略文件（例如 **/*.txt），macOS 不支持',
							},
							{
								name: '包含',
								value: 'contain',
								description: '如果文件路径包含指定值，则忽略文件',
							},
						],
						default: 'match',
						description:
							'是使用正则匹配（Anymatch 模式）忽略文件，还是通过检查路径是否包含指定值来忽略文件',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const path = this.getNodeParameter('path') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		let events: EventName[];
		if (triggerOn === 'file') {
			events = ['change'];
		} else {
			events = this.getNodeParameter('events', []) as EventName[];
		}
		const ignored = options.ignored === '' ? undefined : (options.ignored as string);
		const watcher = watch(path, {
			ignored: options.ignoreMode === 'match' ? ignored : (x) => x.includes(ignored as string),
			persistent: true,
			ignoreInitial:
				options.ignoreInitial === undefined ? true : (options.ignoreInitial as boolean),
			followSymlinks:
				options.followSymlinks === undefined ? true : (options.followSymlinks as boolean),
			depth: [-1, undefined].includes(options.depth as number)
				? undefined
				: (options.depth as number),
			usePolling: options.usePolling as boolean,
			awaitWriteFinish: options.awaitWriteFinish as boolean,
		});

		const executeTrigger = (event: string, pathString: string) => {
			this.emit([this.helpers.returnJsonArray([{ event, path: pathString }])]);
		};

		for (const eventName of events) {
			watcher.on(eventName, (pathString: string) => executeTrigger(eventName, pathString));
		}

		async function closeFunction() {
			return await watcher.close();
		}

		return {
			closeFunction,
		};
	}
}
