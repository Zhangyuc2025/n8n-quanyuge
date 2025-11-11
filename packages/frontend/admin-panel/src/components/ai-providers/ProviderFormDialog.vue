<template>
	<a-modal
		:open="open"
		:title="isEditMode ? '编辑服务商' : '添加服务商'"
		width="700px"
		:confirm-loading="loading"
		@ok="handleSubmit"
		@cancel="handleCancel"
	>
		<a-form
			ref="formRef"
			:model="formData"
			:rules="rules"
			layout="vertical"
			style="margin-top: 24px"
		>
			<a-form-item label="服务商标识" name="providerKey">
				<a-input
					v-model:value="formData.providerKey"
					placeholder="例如：openai, anthropic, google"
					:disabled="isEditMode"
				/>
				<div class="form-item-hint">服务商的唯一标识，创建后不可修改</div>
			</a-form-item>

			<a-form-item label="显示名称" name="providerName">
				<a-input v-model:value="formData.providerName" placeholder="例如：OpenAI, Anthropic" />
			</a-form-item>

			<a-form-item label="API 端点" name="apiEndpoint">
				<a-input
					v-model:value="formData.apiEndpoint"
					placeholder="例如：https://api.openai.com/v1"
				/>
				<div class="form-item-hint">完整的 API 基础 URL</div>
			</a-form-item>

			<a-form-item label="API Key" name="apiKey">
				<a-input-password
					v-model:value="formData.apiKey"
					placeholder="输入服务商的 API Key"
					:maxlength="500"
				/>
				<div class="form-item-hint">
					{{ isEditMode ? '留空则保持原 API Key 不变' : 'API Key 将被加密存储' }}
				</div>
			</a-form-item>

			<a-form-item label="启用状态" name="enabled">
				<a-switch v-model:checked="formData.enabled" />
				<span style="margin-left: 12px">
					{{ formData.enabled ? '启用' : '禁用' }}
				</span>
			</a-form-item>

			<a-form-item label="模型配置" name="modelsConfig">
				<div class="models-config-section">
					<a-alert
						v-if="!formData.modelsConfig?.models?.length"
						message="暂无模型配置"
						description="请在创建服务商后添加模型配置"
						type="info"
						show-icon
					/>
					<div v-else class="models-list">
						<div
							v-for="(model, index) in formData.modelsConfig.models"
							:key="index"
							class="model-item"
						>
							<div class="model-info">
								<strong>{{ model.name }}</strong>
								<span class="model-id">{{ model.id }}</span>
							</div>
							<div class="model-meta">
								<span>价格: ¥{{ model.pricePerToken.toFixed(6) }}/token</span>
								<span>上下文: {{ model.contextWindow.toLocaleString() }}</span>
							</div>
						</div>
					</div>
				</div>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance, Rule } from 'ant-design-vue/es/form';
import { useAIProvidersStore } from '@/stores/aiProviders.store';
import type { AIProviderFormData } from '@/types/admin.types';

const props = defineProps<{
	open: boolean;
	providerKey?: string;
}>();

const emit = defineEmits<{
	(e: 'update:open', value: boolean): void;
	(e: 'success'): void;
}>();

const aiProvidersStore = useAIProvidersStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

const isEditMode = computed(() => !!props.providerKey);

const formData = reactive<AIProviderFormData>({
	providerKey: '',
	providerName: '',
	apiEndpoint: '',
	apiKey: '',
	enabled: true,
	modelsConfig: {
		models: [],
	},
});

const rules: Record<string, Rule[]> = {
	providerKey: [
		{ required: true, message: '请输入服务商标识', trigger: 'blur' },
		{ pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符', trigger: 'blur' },
	],
	providerName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
	apiEndpoint: [
		{ required: true, message: '请输入 API 端点', trigger: 'blur' },
		{ type: 'url', message: '请输入有效的 URL', trigger: 'blur' },
	],
	apiKey: [
		{
			required: !isEditMode.value,
			message: '请输入 API Key',
			trigger: 'blur',
		},
	],
};

// 监听弹窗打开，加载数据
watch(
	() => props.open,
	async (newOpen) => {
		if (newOpen && props.providerKey) {
			// 编辑模式：加载现有数据
			loading.value = true;
			try {
				const provider = await aiProvidersStore.getProvider(props.providerKey);
				formData.providerKey = provider.providerKey;
				formData.providerName = provider.providerName;
				formData.apiEndpoint = provider.apiEndpoint;
				formData.apiKey = ''; // 编辑时不显示原 API Key
				formData.enabled = provider.enabled;
				formData.modelsConfig = provider.modelsConfig || { models: [] };
			} catch (error) {
				message.error('加载服务商数据失败');
				handleCancel();
			} finally {
				loading.value = false;
			}
		} else if (newOpen) {
			// 新建模式：重置表单
			resetForm();
		}
	},
);

const resetForm = () => {
	formData.providerKey = '';
	formData.providerName = '';
	formData.apiEndpoint = '';
	formData.apiKey = '';
	formData.enabled = true;
	formData.modelsConfig = { models: [] };
	formRef.value?.clearValidate();
};

const handleSubmit = async () => {
	try {
		await formRef.value?.validate();
		loading.value = true;

		if (isEditMode.value) {
			// 编辑模式
			const updateData: Partial<AIProviderFormData> = {
				providerName: formData.providerName,
				apiEndpoint: formData.apiEndpoint,
				enabled: formData.enabled,
			};

			// 只有输入了新 API Key 才更新
			if (formData.apiKey) {
				updateData.apiKey = formData.apiKey;
			}

			await aiProvidersStore.updateProvider(props.providerKey!, updateData);
			message.success('服务商更新成功');
		} else {
			// 新建模式
			await aiProvidersStore.createProvider(formData);
			message.success('服务商创建成功');
		}

		emit('success');
		handleCancel();
	} catch (error) {
		if (error instanceof Error) {
			message.error(error.message || '操作失败');
		}
	} finally {
		loading.value = false;
	}
};

const handleCancel = () => {
	emit('update:open', false);
	resetForm();
};
</script>

<style scoped lang="scss">
.form-item-hint {
	margin-top: 4px;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-2);
}

.models-config-section {
	padding: 12px;
	background: var(--color--background--light-2);
	border-radius: var(--radius);
}

.models-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.model-item {
	padding: 12px;
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--sm);
}

.model-info {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 4px;

	strong {
		font-weight: var(--font-weight--bold);
		color: var(--color--text);
	}

	.model-id {
		font-size: var(--font-size--xs);
		color: var(--color--text--tint-2);
	}
}

.model-meta {
	display: flex;
	gap: 16px;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
}
</style>
