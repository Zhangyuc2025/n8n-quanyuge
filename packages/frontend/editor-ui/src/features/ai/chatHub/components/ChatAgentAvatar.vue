<script setup lang="ts">
import { type ChatModelDto, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { N8nAvatar, N8nIcon, N8nTooltip } from '@n8n/design-system';

defineProps<{
	agent: ChatModelDto | null;
	size: 'sm' | 'md' | 'lg';
	tooltip?: boolean;
}>();
</script>

<template>
	<N8nTooltip :show-after="100" placement="left" :disabled="!tooltip">
		<template v-if="agent" #content>{{ agent.name }}</template>
		<N8nIcon
			v-if="!agent"
			icon="messages-square"
			:size="size === 'lg' ? 'xxlarge' : size === 'sm' ? 'large' : 'xlarge'"
		/>
		<N8nAvatar
			v-else-if="agent.model.provider === 'custom-agent' || agent.model.provider === 'n8n'"
			:first-name="agent.name"
			:size="size === 'lg' ? 'medium' : size === 'sm' ? 'xxsmall' : 'xsmall'"
		/>
		<N8nAvatar
			v-else
			:first-name="agent.name"
			:size="size === 'lg' ? 'medium' : size === 'sm' ? 'xxsmall' : 'xsmall'"
		/>
	</N8nTooltip>
</template>
