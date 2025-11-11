<template>
	<a-modal
		:open="open"
		:title="isEditMode ? '编辑模型' : '添加模型'"
		width="600px"
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
			<a-form-item label="模型 ID" name="id">
				<a-input
					v-model:value="formData.id"
					placeholder="例如：gpt-4, claude-3-opus"
					:disabled="isEditMode"
				/>
				<div class="form-item-hint">模型的唯一标识，创建后不可修改</div>
			</a-form-item>

			<a-form-item label="显示名称" name="name">
				<a-input v-model:value="formData.name" placeholder="例如：GPT-4, Claude 3 Opus" />
			</a-form-item>

			<a-form-item label="描述" name="description">
				<a-textarea v-model:value="formData.description" placeholder="模型的简要描述" :rows="2" />
			</a-form-item>

			<a-row :gutter="16">
				<a-col :span="12">
					<a-form-item label="价格（¥/Token）" name="pricePerToken">
						<a-input-number
							v-model:value="formData.pricePerToken"
							:min="0"
							:step="0.000001"
							:precision="6"
							style="width: 100%"
							placeholder="0.000001"
						/>
						<div class="form-item-hint">每个 Token 的价格（人民币）</div>
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="货币" name="currency">
						<a-input v-model:value="formData.currency" placeholder="CNY" disabled />
						<div class="form-item-hint">固定使用人民币</div>
					</a-form-item>
				</a-col>
			</a-row>

			<a-row :gutter="16">
				<a-col :span="12">
					<a-form-item label="上下文窗口" name="contextWindow">
						<a-input-number
							v-model:value="formData.contextWindow"
							:min="0"
							:step="1000"
							style="width: 100%"
							placeholder="4096"
						/>
						<div class="form-item-hint">最大 Token 数量</div>
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="最大输出 Token" name="maxOutputTokens">
						<a-input-number
							v-model:value="formData.maxOutputTokens"
							:min="0"
							:step="100"
							style="width: 100%"
							placeholder="2048"
						/>
						<div class="form-item-hint">单次输出上限</div>
					</a-form-item>
				</a-col>
			</a-row>

			<a-form-item label="支持的能力" name="capabilities">
				<a-checkbox-group v-model:value="capabilities">
					<a-checkbox value="supportsFunctions">函数调用</a-checkbox>
					<a-checkbox value="supportsVision">视觉理解</a-checkbox>
				</a-checkbox-group>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance, Rule } from 'ant-design-vue/es/form';
import type { ModelConfig } from '@/types/admin.types';

const props = defineProps<{
	open: boolean;
	modelData?: ModelConfig;
}>();

const emit = defineEmits<{
	(e: 'update:open', value: boolean): void;
	(e: 'success', model: ModelConfig): void;
}>();

const formRef = ref<FormInstance>();
const loading = ref(false);

const isEditMode = computed(() => !!props.modelData);

const formData = reactive<ModelConfig>({
	id: '',
	name: '',
	description: '',
	pricePerToken: 0.000001,
	currency: 'CNY',
	contextWindow: 4096,
	maxOutputTokens: 2048,
	supportsFunctions: false,
	supportsVision: false,
});

// 能力的 checkbox 绑定
const capabilities = ref<string[]>([]);

const rules: Record<string, Rule[]> = {
	id: [
		{ required: true, message: '请输入模型 ID', trigger: 'blur' },
		{
			pattern: /^[a-zA-Z0-9-_.]+$/,
			message: '只能包含字母、数字、连字符、下划线和点',
			trigger: 'blur',
		},
	],
	name: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
	pricePerToken: [
		{ required: true, message: '请输入价格', trigger: 'blur' },
		{ type: 'number', min: 0, message: '价格不能为负数', trigger: 'blur' },
	],
	contextWindow: [
		{ required: true, message: '请输入上下文窗口大小', trigger: 'blur' },
		{ type: 'number', min: 1, message: '上下文窗口必须大于 0', trigger: 'blur' },
	],
	maxOutputTokens: [
		{ required: true, message: '请输入最大输出 Token', trigger: 'blur' },
		{ type: 'number', min: 1, message: '最大输出 Token 必须大于 0', trigger: 'blur' },
	],
};

// 监听弹窗打开，加载数据
watch(
	() => props.open,
	(newOpen) => {
		if (newOpen && props.modelData) {
			// 编辑模式：加载现有数据
			Object.assign(formData, props.modelData);

			// 设置能力 checkbox
			capabilities.value = [];
			if (formData.supportsFunctions) capabilities.value.push('supportsFunctions');
			if (formData.supportsVision) capabilities.value.push('supportsVision');
		} else if (newOpen) {
			// 新建模式：重置表单
			resetForm();
		}
	},
);

const resetForm = () => {
	formData.id = '';
	formData.name = '';
	formData.description = '';
	formData.pricePerToken = 0.000001;
	formData.currency = 'CNY';
	formData.contextWindow = 4096;
	formData.maxOutputTokens = 2048;
	formData.supportsFunctions = false;
	formData.supportsVision = false;
	capabilities.value = [];
	formRef.value?.clearValidate();
};

const handleSubmit = async () => {
	try {
		await formRef.value?.validate();
		loading.value = true;

		// 从 checkbox 转换回 boolean
		formData.supportsFunctions = capabilities.value.includes('supportsFunctions');
		formData.supportsVision = capabilities.value.includes('supportsVision');

		// 返回模型数据
		emit('success', { ...formData });
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
</style>
