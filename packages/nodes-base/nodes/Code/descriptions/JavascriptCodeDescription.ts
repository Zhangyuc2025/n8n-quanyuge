import type { INodeProperties } from 'n8n-workflow';

const commonDescription: INodeProperties = {
	displayName: 'JavaScript',
	name: 'jsCode',
	type: 'string',
	typeOptions: {
		editor: 'codeNodeEditor',
		editorLanguage: 'javaScript',
	},
	default: '',
	description:
		'要执行的 JavaScript 代码。<br><br>提示：您可以使用 luxon 变量（如 <code>$today</code>）处理日期，使用 <code>$jmespath</code> 查询 JSON 结构。<a href="{{javaScriptReference}}">了解更多</a>。',
	noDataExpression: true,
};

const v1Properties: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [1],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [1],
				mode: ['runOnceForEachItem'],
			},
		},
	},
];

const v2Properties: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [2],
				language: ['javaScript'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [2],
				language: ['javaScript'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
];

export const javascriptCodeDescription: INodeProperties[] = [
	...v1Properties,
	...v2Properties,
	{
		displayName:
			'输入 <code>$</code> 可查看<a target="_blank" href="{{javaScriptMethods}}">特殊变量/方法</a>列表。使用 <code>console.log()</code> 语句调试，并在浏览器控制台中查看输出。',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['javaScript'],
			},
		},
		default: '',
	},
];
