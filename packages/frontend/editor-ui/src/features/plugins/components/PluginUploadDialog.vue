<script setup lang="ts">
import { ref, computed } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { N8nText, N8nFormInput, N8nButton, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { usePluginsStore } from '../plugins.store';
import { useToast } from '@/app/composables/useToast';

interface Props {
	workspaceId: string;
	modalName: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	uploaded: [];
}>();

const i18n = useI18n();
const pluginsStore = usePluginsStore();
const toast = useToast();
const modalBus = createEventBus();

const fileInputRef = ref<HTMLInputElement>();
const file = ref<File | null>(null);
const serviceKey = ref('');
const serviceName = ref('');
const category = ref('');
const description = ref('');
const pluginVersion = ref('1.0.0');
const iconUrl = ref('');
const loading = ref(false);

const categoryOptions = [
	{ label: i18n.baseText('plugins.category.ai'), value: 'AI' },
	{ label: i18n.baseText('plugins.category.communication'), value: 'Communication' },
	{ label: i18n.baseText('plugins.category.productivity'), value: 'Productivity' },
	{ label: i18n.baseText('plugins.category.crm'), value: 'CRM' },
	{ label: i18n.baseText('plugins.category.analytics'), value: 'Analytics' },
	{ label: i18n.baseText('plugins.category.development'), value: 'Development' },
	{ label: i18n.baseText('plugins.category.other'), value: 'Other' },
];

const isValid = computed(() => {
	return (
		file.value !== null &&
		serviceKey.value.trim() !== '' &&
		serviceName.value.trim() !== '' &&
		category.value.trim() !== '' &&
		pluginVersion.value.trim() !== ''
	);
});

const fileName = computed(() => {
	return file.value?.name || i18n.baseText('plugins.noFileSelected');
});

const triggerFileInput = () => {
	fileInputRef.value?.click();
};

const onFileChange = (event: Event) => {
	const input = event.target as HTMLInputElement;
	if (input.files && input.files.length > 0) {
		file.value = input.files[0];
	}
};

const onUpload = async () => {
	if (!isValid.value || !file.value) return;

	loading.value = true;
	try {
		await pluginsStore.uploadPlugin(props.workspaceId, file.value, {
			serviceKey: serviceKey.value.trim(),
			serviceName: serviceName.value.trim(),
			category: category.value,
			description: description.value.trim() || undefined,
			pluginVersion: pluginVersion.value.trim(),
			iconUrl: iconUrl.value.trim() || undefined,
		});

		toast.showMessage({
			title: i18n.baseText('plugins.uploadSuccess'),
			message: i18n.baseText('plugins.uploadSuccessMessage'),
			type: 'success',
		});

		// Reset form
		file.value = null;
		serviceKey.value = '';
		serviceName.value = '';
		category.value = '';
		description.value = '';
		pluginVersion.value = '1.0.0';
		iconUrl.value = '';

		emit('uploaded');
		modalBus.emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('plugins.uploadFailed'));
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<Modal
		:name="modalName"
		:title="i18n.baseText('plugins.uploadCustomPlugin')"
		:event-bus="modalBus"
		:loading="loading"
		width="700px"
		@enter="onUpload"
	>
		<template #content>
			<div class="content">
				<N8nText size="small" color="text-light" class="hint">
					{{ i18n.baseText('plugins.uploadHint') }}
				</N8nText>

				<div class="file-upload">
					<input
						ref="fileInputRef"
						type="file"
						accept=".js,.ts"
						style="display: none"
						@change="onFileChange"
					/>
					<N8nButton type="secondary" icon="plus" @click="triggerFileInput">
						{{ i18n.baseText('plugins.selectFile') }}
					</N8nButton>
					<N8nText v-if="file" size="small" class="file-name">
						{{ fileName }}
					</N8nText>
				</div>

				<div class="form">
					<N8nFormInput
						v-model="serviceKey"
						:label="i18n.baseText('plugins.form.serviceKey')"
						:placeholder="i18n.baseText('plugins.form.serviceKeyPlaceholder')"
						required
					>
						<template #hint>
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText('plugins.form.serviceKeyHint') }}
							</N8nText>
						</template>
					</N8nFormInput>

					<N8nFormInput
						v-model="serviceName"
						:label="i18n.baseText('plugins.form.serviceName')"
						:placeholder="i18n.baseText('plugins.form.serviceNamePlaceholder')"
						required
					/>

					<N8nSelect
						v-model="category"
						:label="i18n.baseText('plugins.form.category')"
						:options="categoryOptions"
						:placeholder="i18n.baseText('plugins.form.categoryPlaceholder')"
						required
					/>

					<N8nFormInput
						v-model="description"
						:label="i18n.baseText('plugins.form.description')"
						:placeholder="i18n.baseText('plugins.form.descriptionPlaceholder')"
						type="textarea"
						:rows="3"
					/>

					<N8nFormInput
						v-model="pluginVersion"
						:label="i18n.baseText('plugins.form.version')"
						:placeholder="i18n.baseText('plugins.form.versionPlaceholder')"
						required
					/>

					<N8nFormInput
						v-model="iconUrl"
						:label="i18n.baseText('plugins.form.iconUrl')"
						:placeholder="i18n.baseText('plugins.form.iconUrlPlaceholder')"
					/>
				</div>
			</div>
		</template>

		<template #footer="{ close }">
			<div class="footer">
				<N8nButton type="secondary" :disabled="loading" @click="close">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="primary" :loading="loading" :disabled="!isValid" @click="onUpload">
					{{ i18n.baseText('plugins.upload') }}
				</N8nButton>
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

.hint {
	padding: var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);
}

.file-upload {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.file-name {
	color: var(--color--text--tint-1);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
