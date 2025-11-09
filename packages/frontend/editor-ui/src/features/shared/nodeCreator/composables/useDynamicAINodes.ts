import { ref } from 'vue';
import type { SimplifiedNodeType } from '@/Interface';
import { useAIProvidersStore } from '@/app/stores/aiProviders.store';
import { AI_NODES_PACKAGE_NAME } from '@/app/constants/ai';

/**
 * Composable for dynamically loading AI provider nodes
 *
 * This loads AI providers from the backend and generates
 * dynamic node entries for the node creator panel.
 *
 * 从后台动态加载 AI 提供商,并生成节点选择面板条目
 */
export function useDynamicAINodes() {
	const aiProvidersStore = useAIProvidersStore();
	const dynamicNodes = ref<SimplifiedNodeType[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	/**
	 * Load AI providers from backend and generate dynamic nodes
	 * 从后台加载 AI 提供商并生成动态节点
	 */
	async function loadDynamicAIChatModels() {
		loading.value = true;
		error.value = null;

		try {
			// ✅ 从后台 API 加载 AI 提供商列表
			await aiProvidersStore.fetchProviders();

			// ✅ 为每个提供商生成一个节点条目
			const nodes: SimplifiedNodeType[] = aiProvidersStore.activeProviders.map((provider) => {
				// 提供商图标映射
				const iconMap: Record<string, string> = {
					openai: 'file:openAiLight.svg',
					anthropic: 'file:anthropic.svg',
					google: 'file:google.svg',
					'google-gemini': 'file:google.svg',
					azure: 'file:azure.svg',
					'aws-bedrock': 'file:bedrock.svg',
					cohere: 'file:cohere.dark.svg',
					deepseek: 'file:deepseek.svg',
					groq: 'file:groq.svg',
					mistral: 'file:mistral.svg',
					lemonade: 'file:lemonade.svg',
					ollama: 'file:ollama.svg',
					openrouter: 'file:openrouter.dark.svg',
					vercel: 'file:vercel.svg',
					xai: 'file:logo.svg',
				};

				const icon = iconMap[provider.providerKey] || 'fa:robot';

				return {
					// ✅ 使用唯一的节点名称（包含提供商 key）
					name: `${AI_NODES_PACKAGE_NAME}.lmChatPlatform-${provider.providerKey}`,
					displayName: `${provider.providerName} Chat Model`,
					description: `Platform-hosted ${provider.providerName} chat model with automatic billing`,
					icon,
					iconColor: 'black',
					group: ['transform'],
					version: 1,
					codex: {
						categories: ['AI'],
						subcategories: {
							AI: ['Language Models', 'Root Nodes'],
							'Language Models': ['Chat Models (Platform-Hosted)'],
						},
					},
					inputs: [],
					outputs: ['ai_languageModel'],
					// ✅ 添加 properties 字段防止 useActionsGeneration 报错
					properties: [],
					defaults: {
						name: `${provider.providerName} Chat Model`,
						// ✅ 预设参数（提供商信息）
						parameters: {
							providerKey: provider.providerKey,
							providerName: provider.providerName,
							providerIcon: icon,
						} as Record<string, unknown>,
					},
					// ✅ 实际使用的节点类型
					typeVersion: 1,
					__isDynamic: true,
					__actualNodeType: `${AI_NODES_PACKAGE_NAME}.lmChatPlatform`,
				} as SimplifiedNodeType & { __isDynamic: boolean; __actualNodeType: string };
			});

			dynamicNodes.value = nodes;
			return nodes;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to load AI providers';
			console.error('Failed to load dynamic AI nodes:', err);
			return [];
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Check if a node is a dynamic AI Chat Model node
	 * 检查节点是否是动态 AI Chat Model 节点
	 */
	function isDynamicAIChatModel(nodeName: string): boolean {
		return nodeName.startsWith(`${AI_NODES_PACKAGE_NAME}.lmChatPlatform-`);
	}

	/**
	 * Get provider key from dynamic node name
	 * 从动态节点名称获取提供商 key
	 */
	function getProviderKeyFromNodeName(nodeName: string): string | null {
		if (!isDynamicAIChatModel(nodeName)) {
			return null;
		}
		return nodeName.replace(`${AI_NODES_PACKAGE_NAME}.lmChatPlatform-`, '');
	}

	return {
		dynamicNodes,
		loading,
		error,
		loadDynamicAIChatModels,
		isDynamicAIChatModel,
		getProviderKeyFromNodeName,
	};
}
