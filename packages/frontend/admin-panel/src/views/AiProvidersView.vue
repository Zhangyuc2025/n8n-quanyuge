<template>
	<div class="ai-providers-view">
		<a-card title="AI 服务商管理" :bordered="false">
			<template #extra>
				<a-button type="primary" @click="handleAddProvider">
					<template #icon><PlusOutlined /></template>
					添加服务商
				</a-button>
			</template>

			<!-- 统计信息 -->
			<div class="stats-row">
				<a-statistic
					title="服务商总数"
					:value="aiProvidersStore.totalProviders"
					:value-style="{ color: '#1890ff' }"
				/>
				<a-statistic
					title="启用中"
					:value="aiProvidersStore.enabledProvidersCount"
					:value-style="{ color: '#52c41a' }"
				/>
				<a-statistic
					title="禁用"
					:value="aiProvidersStore.totalProviders - aiProvidersStore.enabledProvidersCount"
					:value-style="{ color: '#faad14' }"
				/>
			</div>

			<a-divider />

			<!-- 服务商列表 -->
			<a-table
				:columns="columns"
				:data-source="aiProvidersStore.providers"
				:loading="aiProvidersStore.loading"
				:pagination="{
					pageSize: 10,
					showSizeChanger: true,
					showTotal: (total: number) => `共 ${total} 条`,
				}"
				row-key="providerKey"
			>
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'provider'">
						<div class="provider-cell">
							<strong>{{ record.providerName }}</strong>
							<span class="provider-key">{{ record.providerKey }}</span>
						</div>
					</template>

					<template v-else-if="column.key === 'apiEndpoint'">
						<a-tooltip :title="record.apiEndpoint">
							<span class="api-endpoint">{{ truncateUrl(record.apiEndpoint) }}</span>
						</a-tooltip>
					</template>

					<template v-else-if="column.key === 'modelsCount'">
						<a-badge
							:count="record.modelsConfig?.models?.length || 0"
							:number-style="{ backgroundColor: '#52c41a' }"
						/>
					</template>

					<template v-else-if="column.key === 'enabled'">
						<a-tag :color="record.enabled ? 'success' : 'default'">
							{{ record.enabled ? '启用' : '禁用' }}
						</a-tag>
					</template>

					<template v-else-if="column.key === 'createdAt'">
						<span>{{ formatDate(record.createdAt) }}</span>
					</template>

					<template v-else-if="column.key === 'actions'">
						<a-space>
							<a-button type="link" size="small" @click="handleViewProvider(record)">
								查看
							</a-button>
							<a-button type="link" size="small" @click="handleEditProvider(record)">
								编辑
							</a-button>
							<a-dropdown>
								<a-button type="link" size="small">
									更多
									<DownOutlined />
								</a-button>
								<template #overlay>
									<a-menu>
										<a-menu-item
											key="toggle"
											@click="handleToggleProvider(record.providerKey, !record.enabled)"
										>
											{{ record.enabled ? '禁用' : '启用' }}
										</a-menu-item>
										<a-menu-item
											v-if="record.enabled"
											key="disable"
											@click="handleDisableProvider(record)"
										>
											停用服务商
										</a-menu-item>
										<a-menu-divider />
										<a-menu-item key="delete" danger @click="handleDeleteProvider(record)">
											永久删除
										</a-menu-item>
									</a-menu>
								</template>
							</a-dropdown>
						</a-space>
					</template>
				</template>
			</a-table>
		</a-card>

		<!-- 服务商表单弹窗 -->
		<ProviderFormDialog
			v-model:open="providerDialogVisible"
			:provider-key="currentProviderKey"
			@success="handleProviderSuccess"
		/>

		<!-- 服务商详情弹窗 -->
		<a-modal v-model:open="detailsDialogVisible" title="服务商详情" width="900px" :footer="null">
			<div v-if="selectedProvider" class="provider-details">
				<a-descriptions :column="2" bordered>
					<a-descriptions-item label="服务商标识">
						{{ selectedProvider.providerKey }}
					</a-descriptions-item>
					<a-descriptions-item label="显示名称">
						{{ selectedProvider.providerName }}
					</a-descriptions-item>
					<a-descriptions-item label="API 端点" :span="2">
						{{ selectedProvider.apiEndpoint }}
					</a-descriptions-item>
					<a-descriptions-item label="API Key" :span="2">
						<span class="api-key-masked">{{ maskApiKey(selectedProvider.apiKeyEncrypted) }}</span>
					</a-descriptions-item>
					<a-descriptions-item label="状态">
						<a-tag :color="selectedProvider.enabled ? 'success' : 'default'">
							{{ selectedProvider.enabled ? '启用' : '禁用' }}
						</a-tag>
					</a-descriptions-item>
					<a-descriptions-item label="创建时间">
						{{ formatDate(selectedProvider.createdAt) }}
					</a-descriptions-item>
				</a-descriptions>

				<!-- 模型配置表格 -->
				<ModelConfigTable
					:provider-key="selectedProvider.providerKey"
					:models-config="selectedProvider.modelsConfig"
					:loading="aiProvidersStore.loading"
					@update="handleModelsConfigUpdate"
				/>
			</div>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, DownOutlined } from '@ant-design/icons-vue';
import { useAIProvidersStore } from '@/stores/aiProviders.store';
import type { AIProvider } from '@/types/admin.types';
import ProviderFormDialog from '@/components/ai-providers/ProviderFormDialog.vue';
import ModelConfigTable from '@/components/ai-providers/ModelConfigTable.vue';

const aiProvidersStore = useAIProvidersStore();

const providerDialogVisible = ref(false);
const detailsDialogVisible = ref(false);
const currentProviderKey = ref<string | undefined>(undefined);
const selectedProvider = ref<AIProvider | null>(null);

const columns = [
	{
		title: '服务商',
		key: 'provider',
		width: 200,
	},
	{
		title: 'API 端点',
		key: 'apiEndpoint',
		width: 250,
	},
	{
		title: '模型数量',
		key: 'modelsCount',
		width: 100,
		align: 'center' as const,
	},
	{
		title: '状态',
		key: 'enabled',
		width: 100,
		align: 'center' as const,
	},
	{
		title: '创建时间',
		key: 'createdAt',
		width: 180,
	},
	{
		title: '操作',
		key: 'actions',
		width: 200,
		fixed: 'right' as const,
	},
];

onMounted(async () => {
	await aiProvidersStore.fetchProviders();
});

const handleAddProvider = () => {
	currentProviderKey.value = undefined;
	providerDialogVisible.value = true;
};

const handleEditProvider = (provider: AIProvider) => {
	currentProviderKey.value = provider.providerKey;
	providerDialogVisible.value = true;
};

const handleViewProvider = async (provider: AIProvider) => {
	try {
		selectedProvider.value = await aiProvidersStore.getProvider(provider.providerKey);
		detailsDialogVisible.value = true;
	} catch (error) {
		message.error('加载服务商详情失败');
	}
};

const handleToggleProvider = async (providerKey: string, enabled: boolean) => {
	try {
		await aiProvidersStore.toggleProvider(providerKey, enabled);
		message.success(`服务商已${enabled ? '启用' : '禁用'}`);
	} catch (error) {
		message.error(`操作失败`);
	}
};

const handleDisableProvider = (provider: AIProvider) => {
	Modal.confirm({
		title: '确认停用',
		content: `确定要停用服务商 "${provider.providerName}" 吗？停用后该服务商将不可用，但数据会保留，可以重新启用。`,
		okText: '确定停用',
		cancelText: '取消',
		onOk: async () => {
			try {
				await aiProvidersStore.disableProvider(provider.providerKey);
				message.success('服务商已停用');
			} catch (error) {
				message.error('停用失败');
			}
		},
	});
};

const handleDeleteProvider = (provider: AIProvider) => {
	Modal.confirm({
		title: '⚠️ 永久删除确认',
		content: `您即将永久删除服务商 "${provider.providerName}"。此操作将从数据库中彻底删除该服务商及其所有配置，且无法恢复！如果只是临时停用，建议使用"停用服务商"功能。`,
		okText: '确认删除',
		okType: 'danger',
		cancelText: '取消',
		onOk: async () => {
			try {
				await aiProvidersStore.deleteProvider(provider.providerKey);
				message.success('服务商已永久删除');
			} catch (error) {
				message.error('删除失败');
			}
		},
	});
};

const handleProviderSuccess = async () => {
	await aiProvidersStore.fetchProviders();
};

const handleModelsConfigUpdate = async (modelsConfig: { models: any[] }) => {
	if (!selectedProvider.value) return;

	try {
		await aiProvidersStore.updateProvider(selectedProvider.value.providerKey, {
			modelsConfig,
		});
		message.success('模型配置已更新');
		// 刷新详情
		selectedProvider.value = await aiProvidersStore.getProvider(selectedProvider.value.providerKey);
	} catch (error) {
		message.error('更新失败');
	}
};

const truncateUrl = (url: string): string => {
	if (url.length > 40) {
		return url.substring(0, 37) + '...';
	}
	return url;
};

const maskApiKey = (apiKey?: string): string => {
	if (!apiKey) return '未设置';
	if (apiKey.length <= 8) return '****';
	return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
};

const formatDate = (date: string): string => {
	return new Date(date).toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};
</script>

<style scoped lang="scss">
.ai-providers-view {
	padding: var(--spacing--lg);
}

.stats-row {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: var(--spacing--lg);
	margin-bottom: var(--spacing--lg);
}

.provider-cell {
	display: flex;
	flex-direction: column;
	gap: 4px;

	strong {
		font-weight: var(--font-weight--bold);
		color: var(--color--text);
	}

	.provider-key {
		font-size: var(--font-size--xs);
		color: var(--color--text--tint-2);
		font-family: monospace;
	}
}

.api-endpoint {
	font-family: monospace;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
}

.provider-details {
	margin-top: var(--spacing--md);
}

.api-key-masked {
	font-family: monospace;
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
}
</style>
