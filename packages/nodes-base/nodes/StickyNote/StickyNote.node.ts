import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class StickyNote implements INodeType {
	description: INodeTypeDescription = {
		displayName: '便签',
		name: 'stickyNote',
		icon: 'fa:sticky-note',
		group: ['input'],
		version: 1,
		description: '让您的工作流更易于理解',
		defaults: {
			name: '便签',
			color: '#FFD233',
		},

		inputs: [],

		outputs: [],
		properties: [
			{
				displayName: '内容',
				name: 'content',
				type: 'string',
				default:
					'## 我是便签 \n**双击** 编辑我。[指南](https://docs.n8n.io/workflows/sticky-notes/)',
			},
			{
				displayName: '高度',
				name: 'height',
				type: 'number',
				required: true,
				default: 160,
			},
			{
				displayName: '宽度',
				name: 'width',
				type: 'number',
				required: true,
				default: 240,
			},
			{
				displayName: '颜色',
				name: 'color',

				type: 'number',
				required: true,
				default: 1,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return [items];
	}
}
