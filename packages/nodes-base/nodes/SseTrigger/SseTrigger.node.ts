import EventSource from 'eventsource';
import type {
	IDataObject,
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, jsonParse } from 'n8n-workflow';

export class SseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSE 触发器',
		name: 'sseTrigger',
		icon: 'fa:cloud-download-alt',
		iconColor: 'dark-blue',
		group: ['trigger'],
		version: 1,
		description: '当服务器发送事件发生时触发工作流',
		eventTriggerDescription: '',
		activationMessage: '现在您可以调用 SSE URL 来触发执行。',
		defaults: {
			name: 'SSE 触发器',
			color: '#225577',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>在构建工作流时</b>，点击「执行步骤」按钮，然后触发 SSE 事件。这将触发执行，并显示在此编辑器中。<br /> <br /><b>一旦您对工作流满意</b>，请<a data-key='activate'>激活</a>它。然后每次检测到更改时，工作流都会执行。这些执行将显示在<a data-key='executions'>执行列表</a>中，但不会显示在编辑器中。",
				active:
					"<b>在构建工作流时</b>，点击「执行步骤」按钮，然后触发 SSE 事件。这将触发执行，并显示在此编辑器中。<br /> <br /><b>您的工作流也会自动执行</b>，因为它已激活。每次检测到更改时，此节点都会触发执行。这些执行将显示在<a data-key='executions'>执行列表</a>中，但不会显示在编辑器中。",
			},
			activationHint:
				"一旦您完成工作流构建，请<a data-key='activate'>激活</a>它以使其持续监听（您只是看不到这些执行）。",
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'http://example.com',
				description: '要接收 SSE 的 URL',
				required: true,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const url = this.getNodeParameter('url') as string;

		const eventSource = new EventSource(url);

		eventSource.onmessage = (event) => {
			const eventData = jsonParse<IDataObject>(event.data as string, {
				errorMessage: 'Invalid JSON for event data',
			});
			this.emit([this.helpers.returnJsonArray([eventData])]);
		};

		async function closeFunction() {
			eventSource.close();
		}

		return {
			closeFunction,
		};
	}
}
