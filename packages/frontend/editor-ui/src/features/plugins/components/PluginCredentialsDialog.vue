<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { N8nText, N8nFormInput, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import type { Plugin, PluginCredentials } from '../plugins.api';
import { usePluginsStore } from '../plugins.store';
import { useToast } from '@/app/composables/useToast';

interface Props {
	plugin: Plugin | null;
	workspaceId: string;
	modalName: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	saved: [];
}>();

const i18n = useI18n();
const pluginsStore = usePluginsStore();
const toast = useToast();
const modalBus = createEventBus();

const credentials = ref<Record<string, unknown>>({});
const loading = ref(false);
const isActive = ref(false);

const formFields = computed(() => {
	if (!props.plugin?.userConfigSchema) return [];

	return Object.entries(props.plugin.userConfigSchema).map(([key, config]: [string, any]) => ({
		name: key,
		label: config.label || key,
		type: config.type === 'password' ? 'password' : 'text',
		required: config.required || false,
		placeholder: config.placeholder || '',
		description: config.description || '',
	}));
});

const title = computed(() => {
	if (!props.plugin) return '';
	return i18n.baseText('plugins.configureCredentials', {
		interpolate: { name: props.plugin.name },
	});
});

// Load existing credentials when dialog opens
watch(isActive, async (newValue) => {
	if (newValue && props.plugin) {
		try {
			const existing = await pluginsStore.fetchCredentials(
				props.workspaceId,
				props.plugin.serviceKey,
			);
			credentials.value = { ...existing };
		} catch (error) {
			// No existing credentials, start fresh
			credentials.value = {};
		}
	} else {
		credentials.value = {};
	}
});

const onSave = async () => {
	if (!props.plugin) return;

	loading.value = true;
	try {
		await pluginsStore.configureCredentials(
			props.workspaceId,
			props.plugin.serviceKey,
			credentials.value as PluginCredentials,
		);

		toast.showMessage({
			title: i18n.baseText('plugins.credentialsSaved'),
			message: i18n.baseText('plugins.credentialsSavedMessage'),
			type: 'success',
		});

		emit('saved');
		modalBus.emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('plugins.credentialsSaveFailed'));
	} finally {
		loading.value = false;
	}
};

const onDelete = async () => {
	if (!props.plugin) return;

	loading.value = true;
	try {
		await pluginsStore.deleteCredentials(props.workspaceId, props.plugin.serviceKey);

		toast.showMessage({
			title: i18n.baseText('plugins.credentialsDeleted'),
			message: i18n.baseText('plugins.credentialsDeletedMessage'),
			type: 'success',
		});

		emit('saved');
		modalBus.emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('plugins.credentialsDeleteFailed'));
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<Modal
		:name="modalName"
		:title="title"
		:event-bus="modalBus"
		:loading="loading"
		width="600px"
		@enter="onSave"
	>
		<template #content>
			<div class="content">
				<N8nText v-if="plugin?.description" size="small" color="text-light">
					{{ plugin.description }}
				</N8nText>

				<div v-if="formFields.length > 0" class="form">
					<N8nFormInput
						v-for="field in formFields"
						:key="field.name"
						:model-value="String(credentials[field.name] ?? '')"
						@update:model-value="
							(val) => {
								credentials[field.name] = val;
							}
						"
						:label="field.label"
						:type="field.type"
						:required="field.required"
						:placeholder="field.placeholder"
						class="form-field"
					>
						<template v-if="field.description" #hint>
							<N8nText size="xsmall" color="text-light">
								{{ field.description }}
							</N8nText>
						</template>
					</N8nFormInput>
				</div>

				<N8nText v-else color="text-light">
					{{ i18n.baseText('plugins.noCredentialsRequired') }}
				</N8nText>
			</div>
		</template>

		<template #footer="{ close }">
			<div class="footer">
				<div class="footer-left">
					<N8nButton
						v-if="plugin?.isConfigured"
						type="tertiary"
						icon="trash-2"
						:loading="loading"
						@click="onDelete"
					>
						{{ i18n.baseText('plugins.deleteCredentials') }}
					</N8nButton>
				</div>
				<div class="footer-right">
					<N8nButton type="secondary" :disabled="loading" @click="close">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton type="primary" :loading="loading" @click="onSave">
						{{ i18n.baseText('generic.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" scoped>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md) 0;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.form-field {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: space-between;
	width: 100%;
}

.footer-left {
	display: flex;
	gap: var(--spacing--xs);
}

.footer-right {
	display: flex;
	gap: var(--spacing--xs);
}
</style>
