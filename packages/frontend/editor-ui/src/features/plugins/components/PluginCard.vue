<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard, N8nText, N8nButton, N8nBadge, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Plugin } from '../plugins.api';

interface Props {
	plugin: Plugin;
	isConfigured?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	configure: [plugin: Plugin];
	edit: [plugin: Plugin];
	delete: [plugin: Plugin];
}>();

const i18n = useI18n();

const statusBadge = computed(() => {
	if (props.plugin.submissionStatus === 'pending') {
		return {
			text: i18n.baseText('plugins.status.pending'),
			theme: 'warning' as const,
		};
	}
	if (props.plugin.submissionStatus === 'rejected') {
		return {
			text: i18n.baseText('plugins.status.rejected'),
			theme: 'danger' as const,
		};
	}
	if (props.isConfigured) {
		return {
			text: i18n.baseText('plugins.status.configured'),
			theme: 'success' as const,
		};
	}
	if (props.plugin.serviceMode === 'user_managed') {
		return {
			text: i18n.baseText('plugins.status.notConfigured'),
			theme: 'secondary' as const,
		};
	}
	return null;
});

const isUserManaged = computed(() => props.plugin.serviceMode === 'user_managed');
const isCustomPlugin = computed(() => props.plugin.visibility === 'workspace');

const onConfigure = () => {
	emit('configure', props.plugin);
};

const onEdit = () => {
	emit('edit', props.plugin);
};

const onDelete = () => {
	emit('delete', props.plugin);
};
</script>

<template>
	<N8nCard :class="$style.pluginCard">
		<div :class="$style.header">
			<div :class="$style.iconContainer">
				<img v-if="plugin.iconUrl" :src="plugin.iconUrl" :alt="plugin.name" :class="$style.icon" />
				<N8nIcon v-else icon="box" size="xlarge" :class="$style.iconFallback" />
			</div>
			<div :class="$style.headerInfo">
				<N8nText size="large" bold>{{ plugin.name }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ plugin.category || i18n.baseText('plugins.uncategorized') }}
				</N8nText>
			</div>
			<N8nBadge v-if="statusBadge" :theme="statusBadge.theme" size="small">
				{{ statusBadge.text }}
			</N8nBadge>
		</div>

		<div :class="$style.content">
			<N8nText size="small" :class="$style.description">
				{{ plugin.description || i18n.baseText('plugins.noDescription') }}
			</N8nText>

			<div :class="$style.metadata">
				<div v-if="plugin.pluginVersion" :class="$style.metadataItem">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('plugins.version') }}:
					</N8nText>
					<N8nText size="xsmall">{{ plugin.pluginVersion }}</N8nText>
				</div>
				<div v-if="plugin.submittedAt" :class="$style.metadataItem">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('plugins.submittedAt') }}:
					</N8nText>
					<N8nText size="xsmall">
						{{ new Date(plugin.submittedAt).toLocaleDateString() }}
					</N8nText>
				</div>
			</div>
		</div>

		<template #footer>
			<div :class="$style.actions">
				<N8nButton
					v-if="isUserManaged && !isConfigured"
					type="primary"
					size="small"
					icon="cog"
					@click="onConfigure"
				>
					{{ i18n.baseText('plugins.configure') }}
				</N8nButton>
				<N8nButton
					v-else-if="isUserManaged && isConfigured"
					type="secondary"
					size="small"
					icon="pen"
					@click="onConfigure"
				>
					{{ i18n.baseText('plugins.editConfig') }}
				</N8nButton>

				<N8nButton
					v-if="isCustomPlugin"
					type="secondary"
					size="small"
					icon="pencil"
					@click="onEdit"
				>
					{{ i18n.baseText('generic.edit') }}
				</N8nButton>

				<N8nButton
					v-if="isCustomPlugin"
					type="tertiary"
					size="small"
					icon="trash-2"
					@click="onDelete"
				>
					{{ i18n.baseText('generic.delete') }}
				</N8nButton>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.pluginCard {
	height: 100%;
	display: flex;
	flex-direction: column;
	transition: box-shadow 0.2s;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}

.iconContainer {
	flex-shrink: 0;
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.icon {
	width: 100%;
	height: 100%;
	object-fit: contain;
	border-radius: var(--radius);
}

.iconFallback {
	color: var(--color--text--tint-1);
}

.headerInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--lg);
	min-height: calc(var(--font-size--sm) * var(--line-height--lg) * 3);
}

.metadata {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: auto;
}

.metadataItem {
	display: flex;
	gap: var(--spacing--3xs);
}

.actions {
	display: flex;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}
</style>
