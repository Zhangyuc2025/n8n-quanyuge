export const configureNodeInputs = (operation: 'classify' | 'sanitize') => {
	if (operation === 'sanitize') {
		// sanitize operations don't use a chat model
		return ['main'];
	}

	return [
		'main',
		{
			type: 'ai_languageModel',
			displayName: '聊天模型',
			maxConnections: 1,
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'n8n/n8n-nodes-langchain.lmOpenAi',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
	];
};
