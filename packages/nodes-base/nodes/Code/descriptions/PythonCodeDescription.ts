import type { INodeProperties } from 'n8n-workflow';

const commonDescription: INodeProperties = {
	displayName: 'Python',
	name: 'pythonCode',
	type: 'string',
	typeOptions: {
		editor: 'codeNodeEditor',
		editorLanguage: 'python',
	},
	default: '',
	description:
		'要执行的 Python 代码。<br><br>提示：您可以使用内置方法和变量（如 <code>_today</code>）处理日期，使用 <code>_jmespath</code> 查询 JSON 结构。<a href="{{pythonBuiltin}}">了解更多</a>。',
	noDataExpression: true,
};

const PRINT_INSTRUCTION = '使用 <code>print()</code> 语句调试，并在浏览器控制台中查看输出。';

export const pythonCodeDescription: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
	{
		displayName: PRINT_INSTRUCTION,
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['python'],
			},
		},
		default: '',
	},
	{
		displayName: `${PRINT_INSTRUCTION}<br><br>原生 Python 选项不支持 <code>_</code> 语法和辅助函数，但在"所有项目"模式下支持 <code>_items</code>，在"每个项目"模式下支持 <code>_item</code>。`,
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['pythonNative'],
			},
		},
		default: '',
	},
];
