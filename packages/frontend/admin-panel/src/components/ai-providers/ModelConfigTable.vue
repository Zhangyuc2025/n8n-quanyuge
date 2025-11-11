<template>
	<div class="model-config-table">
		<div class="table-header">
			<h3>模型配置</h3>
			<a-button type="primary" @click="handleAddModel">
				<template #icon><PlusOutlined /></template>
				添加模型
			</a-button>
		</div>

		<a-table
			:columns="columns"
			:data-source="modelsConfig?.models || []"
			:pagination="false"
			:loading="loading"
			row-key="id"
			size="middle"
		>
			<template #bodyCell="{ column, record }">
				<template v-if="column.key === 'name'">
					<div class="model-name-cell">
						<strong>{{ record.name }}</strong>
						<span class="model-id">{{ record.id }}</span>
					</div>
				</template>

				<template v-else-if="column.key === 'pricePerToken'">
					<span class="price-cell">¥{{ formatPrice(record.pricePerToken) }}</span>
				</template>

				<template v-else-if="column.key === 'contextWindow'">
					<span>{{ formatNumber(record.contextWindow) }}</span>
				</template>

				<template v-else-if="column.key === 'maxOutputTokens'">
					<span>{{ formatNumber(record.maxOutputTokens) }}</span>
				</template>

				<template v-else-if="column.key === 'capabilities'">
					<div class="capabilities-cell">
						<a-tag v-if="record.supportsFunctions" color="blue">函数调用</a-tag>
						<a-tag v-if="record.supportsVision" color="green">视觉理解</a-tag>
						<span v-if="!record.supportsFunctions && !record.supportsVision" class="empty-tag">
							无
						</span>
					</div>
				</template>

				<template v-else-if="column.key === 'actions'">
					<a-space>
						<a-button type="link" size="small" @click="handleEditModel(record)">编辑</a-button>
						<a-popconfirm
							title="确定删除此模型？"
							ok-text="确定"
							cancel-text="取消"
							@confirm="handleDeleteModel(record.id)"
						>
							<a-button type="link" danger size="small">删除</a-button>
						</a-popconfirm>
					</a-space>
				</template>
			</template>
		</a-table>

		<!-- 模型编辑弹窗 -->
		<ModelFormDialog
			v-model:open="modelDialogVisible"
			:model-data="currentModel"
			@success="handleModelSuccess"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import type { ModelConfig } from '@/types/admin.types';
import ModelFormDialog from './ModelFormDialog.vue';

interface ModelsConfig {
	models: ModelConfig[];
}

const props = defineProps<{
	providerKey: string;
	modelsConfig?: ModelsConfig;
	loading?: boolean;
}>();

const emit = defineEmits<{
	(e: 'update', modelsConfig: ModelsConfig): void;
}>();

const modelDialogVisible = ref(false);
const currentModel = ref<ModelConfig | undefined>(undefined);

const columns = [
	{
		title: '模型名称',
		key: 'name',
		width: 200,
	},
	{
		title: '价格（¥/Token）',
		key: 'pricePerToken',
		width: 150,
	},
	{
		title: '上下文窗口',
		key: 'contextWindow',
		width: 120,
	},
	{
		title: '最大输出',
		key: 'maxOutputTokens',
		width: 120,
	},
	{
		title: '支持能力',
		key: 'capabilities',
		width: 180,
	},
	{
		title: '操作',
		key: 'actions',
		width: 150,
		fixed: 'right' as const,
	},
];

const models = computed(() => props.modelsConfig?.models || []);

const formatPrice = (price: number): string => {
	return price.toFixed(6);
};

const formatNumber = (num: number): string => {
	return num.toLocaleString();
};

const handleAddModel = () => {
	currentModel.value = undefined;
	modelDialogVisible.value = true;
};

const handleEditModel = (model: ModelConfig) => {
	currentModel.value = { ...model };
	modelDialogVisible.value = true;
};

const handleDeleteModel = (modelId: string) => {
	const updatedModels = models.value.filter((m) => m.id !== modelId);
	emit('update', { models: updatedModels });
	message.success('模型已删除');
};

const handleModelSuccess = (modelData: ModelConfig) => {
	const updatedModels = [...models.value];

	// 查找是否已存在
	const existingIndex = updatedModels.findIndex((m) => m.id === modelData.id);

	if (existingIndex >= 0) {
		// 更新
		updatedModels[existingIndex] = modelData;
		message.success('模型已更新');
	} else {
		// 新增
		updatedModels.push(modelData);
		message.success('模型已添加');
	}

	emit('update', { models: updatedModels });
};
</script>

<style scoped lang="scss">
.model-config-table {
	margin-top: 24px;
}

.table-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;

	h3 {
		margin: 0;
		font-size: var(--font-size--lg);
		font-weight: var(--font-weight--bold);
	}
}

.model-name-cell {
	display: flex;
	flex-direction: column;
	gap: 4px;

	strong {
		font-weight: var(--font-weight--bold);
		color: var(--color--text);
	}

	.model-id {
		font-size: var(--font-size--xs);
		color: var(--color--text--tint-2);
	}
}

.price-cell {
	font-family: monospace;
	font-weight: var(--font-weight--bold);
	color: var(--color--success);
}

.capabilities-cell {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;

	.empty-tag {
		font-size: var(--font-size--xs);
		color: var(--color--text--tint-2);
	}
}
</style>
