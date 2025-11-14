import { type CredentialsMap } from '@/features/ai/chatHub/chat.types';
import { type ChatHubProvider } from '@n8n/api-types';
import { computed } from 'vue';

/**
 * Composable for managing chat credentials.
 *
 * Note: SASA platform uses platformAiProvider instead of user-managed credentials.
 * This composable has been simplified to return empty credentials map for compatibility.
 */
export function useChatCredentials(_userId: string) {
	// Return empty credentials map as SASA uses platform AI providers
	const credentialsByProvider = computed<CredentialsMap>(() => ({}));

	function selectCredential(_provider: ChatHubProvider, _id: string) {
		// No-op: SASA platform uses platformAiProvider instead of credentials
		console.warn(
			'Credential selection is not available in SASA platform. Using platform AI providers instead.',
		);
	}

	return { credentialsByProvider, selectCredential };
}
