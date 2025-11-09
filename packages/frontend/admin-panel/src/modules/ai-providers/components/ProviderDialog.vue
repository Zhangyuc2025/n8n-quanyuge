<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nInputLabel, N8nCard, N8nHeading, N8nIcon } from '@n8n/design-system';
import { ElMessage } from 'element-plus';
import type { AdminAIProvider, CreateAIProviderRequest, UpdateAIProviderRequest } from '../stores/ai-providers.store';
import { useAIProvidersStore } from '../stores/ai-providers.store';
import ModelConfigEditor from './ModelConfigEditor.vue';

interface Props {
	mode: 'create' | 'edit';
	provider?: AdminAIProvider | null;
}

const props = withDefaults(defineProps<Props>(), {
	provider: null,
});

const emit = defineEmits<{
	close: [];
	save: [];
}>();

const aiProvidersStore = useAIProvidersStore();

// Form data
const formData = ref({
	providerKey: '',
	providerName: '',
	apiEndpoint: '',
	apiKey: '',
	description: '',
	iconUrl: '',
	modelsConfig: {
		models: [] as Array<{
			id: string;
			name: string;
			description: string;
			pricePerToken: number;
			currency: string;
			contextWindow: number;
			maxOutputTokens: number;
			supportsFunctions: boolean;
			supportsVision: boolean;
		}>,
	},
	quotaConfig: {
		monthlyTokens: undefined as number | undefined,
		currentUsed: undefined as number | undefined,
	},
});

const showPassword = ref(false);
const saving = ref(false);

// Computed
const dialogTitle = computed(() => {
	return props.mode === 'create' ? '创建 AI 提供商' : '编辑 AI 提供商';
});

const isFormValid = computed(() => {
	if (props.mode === 'create') {
		return (
			formData.value.providerKey.trim() !== '' &&
			formData.value.providerName.trim() !== '' &&
			formData.value.apiEndpoint.trim() !== '' &&
			formData.value.apiKey.trim() !== '' &&
			formData.value.modelsConfig.models.length > 0
		);
	} else {
		return (
			formData.value.providerName.trim() !== '' &&
			formData.value.apiEndpoint.trim() !== ''
		);
	}
});

// Methods
function loadProviderData() {
	if (props.provider && props.mode === 'edit') {
		formData.value.providerKey = props.provider.providerKey;
		formData.value.providerName = props.provider.providerName;
		formData.value.apiEndpoint = props.provider.apiEndpoint;

		// Load models config
		if (props.provider.modelsConfig && Array.isArray(props.provider.modelsConfig.models)) {
			formData.value.modelsConfig.models = [...props.provider.modelsConfig.models];
		}

		// Load quota config
		if (props.provider.quotaConfig) {
			formData.value.quotaConfig = {
				monthlyTokens: props.provider.quotaConfig.monthlyTokens,
				currentUsed: props.provider.quotaConfig.currentUsed,
			};
		}
	}
}

function onClose() {
	emit('close');
}

async function onSave() {
	if (!isFormValid.value) {
		ElMessage.error('请填写所有必填项');
		return;
	}

	saving.value = true;
	try {
		if (props.mode === 'create') {
			const createData: CreateAIProviderRequest = {
				providerKey: formData.value.providerKey,
				providerName: formData.value.providerName,
				apiEndpoint: formData.value.apiEndpoint,
				apiKey: formData.value.apiKey,
				modelsConfig: formData.value.modelsConfig,
				quotaConfig:
					formData.value.quotaConfig.monthlyTokens || formData.value.quotaConfig.currentUsed
						? formData.value.quotaConfig
						: undefined,
			};
			await aiProvidersStore.createProvider(createData);
			ElMessage.success('创建成功');
		} else {
			const updateData: UpdateAIProviderRequest = {
				modelsConfig: formData.value.modelsConfig,
				quotaConfig:
					formData.value.quotaConfig.monthlyTokens || formData.value.quotaConfig.currentUsed
						? formData.value.quotaConfig
						: undefined,
			};
			if (formData.value.apiKey.trim()) {
				updateData.apiKey = formData.value.apiKey;
			}
			await aiProvidersStore.updateProvider(formData.value.providerKey, updateData);
			ElMessage.success('更新成功');
		}
		emit('save');
	} catch (error) {
		ElMessage.error(props.mode === 'create' ? '创建失败' : '更新失败');
		console.error('Failed to save provider:', error);
	} finally {
		saving.value = false;
	}
}

function onModelsChange(models: typeof formData.value.modelsConfig.models) {
	formData.value.modelsConfig.models = models;
}

// Lifecycle
onMounted(() => {
	loadProviderData();
});

watch(
	() => props.provider,
	() => {
		loadProviderData();
	},
);
</script>

<template>
	<div :class="$style.overlay" @click.self="onClose">
		<div :class="$style.dialog">
			<N8nCard :class="$style.dialogCard">
				<!-- Header -->
				<div :class="$style.dialogHeader">
					<N8nHeading tag="h2" size="large">{{ dialogTitle }}</N8nHeading>
					<N8nButton type="tertiary" icon="times" size="small" @click="onClose" />
				</div>

				<!-- Content -->
				<div :class="$style.dialogContent">
					<!-- Provider Key (only for create mode) -->
					<div v-if="mode === 'create'" :class="$style.formGroup">
						<N8nInputLabel label="提供商标识" required>
							<N8nInput
								v-model="formData.providerKey"
								placeholder="例如: openai, anthropic"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Provider Name -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="提供商名称" required>
							<N8nInput
								v-model="formData.providerName"
								placeholder="例如: OpenAI, Anthropic"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- API Endpoint -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="API 端点" required>
							<N8nInput
								v-model="formData.apiEndpoint"
								placeholder="https://api.example.com"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- API Key -->
					<div :class="$style.formGroup">
						<N8nInputLabel :label="`API 密钥${mode === 'edit' ? '（留空保持不变）' : ''}`" :required="mode === 'create'">
							<N8nInput
								v-model="formData.apiKey"
								:type="showPassword ? 'text' : 'password'"
								:placeholder="
									mode === 'create'
										? '请输入 API 密钥'
										: '留空以保持当前密钥不变'
								"
								:disabled="saving"
							>
								<template #suffix>
									<N8nIcon
										:icon="showPassword ? 'eye' : 'eye-off'"
										size="small"
										:class="$style.passwordToggle"
										@click="showPassword = !showPassword"
									/>
								</template>
							</N8nInput>
						</N8nInputLabel>
					</div>

					<!-- Icon URL -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="图标 URL">
							<N8nInput
								v-model="formData.iconUrl"
								placeholder="https://example.com/icon.png"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Models Config -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="模型配置" required>
							<ModelConfigEditor
								:models="formData.modelsConfig.models"
								:disabled="saving"
								@update:models="onModelsChange"
							/>
						</N8nInputLabel>
					</div>

					<!-- Quota Config (Optional) -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="配额配置（可选）">
							<div :class="$style.quotaInputs">
								<N8nInput
									v-model.number="formData.quotaConfig.monthlyTokens"
									type="number"
									placeholder="每月 Token 配额"
									:disabled="saving"
								/>
								<N8nInput
									v-model.number="formData.quotaConfig.currentUsed"
									type="number"
									placeholder="当前已使用"
									:disabled="saving"
								/>
							</div>
						</N8nInputLabel>
					</div>
				</div>

				<!-- Footer -->
				<div :class="$style.dialogFooter">
					<N8nButton type="secondary" :disabled="saving" @click="onClose">
						取消
					</N8nButton>
					<N8nButton type="primary" :loading="saving" :disabled="!isFormValid" @click="onSave">
						保存
					</N8nButton>
				</div>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: var(--spacing--md);
}

.dialog {
	width: 100%;
	max-width: 800px;
	max-height: 90vh;
	overflow: hidden;
}

.dialogCard {
	display: flex;
	flex-direction: column;
	max-height: 90vh;
}

.dialogHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--lg);
	border-bottom: var(--border);
}

.dialogContent {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--lg);
}

.formGroup {
	margin-bottom: var(--spacing--md);

	&:last-child {
		margin-bottom: 0;
	}
}

.quotaInputs {
	display: flex;
	gap: var(--spacing--sm);
	flex-direction: column;
}

.passwordToggle {
	cursor: pointer;
	color: var(--color--text--tint-2);

	&:hover {
		color: var(--color--text);
	}
}

.dialogFooter {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	border-top: var(--border);
}

@media (max-width: 768px) {
	.overlay {
		padding: 0;
	}

	.dialog {
		max-width: 100%;
		max-height: 100vh;
	}

	.dialogCard {
		max-height: 100vh;
		border-radius: 0;
	}
}
</style>
