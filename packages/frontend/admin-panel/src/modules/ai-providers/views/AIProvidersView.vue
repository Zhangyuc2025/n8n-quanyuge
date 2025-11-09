<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
	N8nCard,
	N8nButton,
	N8nHeading,
	N8nText,
	N8nInput,
	N8nBadge,
	N8nActionToggle,
	N8nIcon,
} from '@n8n/design-system';
import { ElSwitch, ElMessageBox, ElMessage } from 'element-plus';
import { useAIProvidersStore } from '../stores/ai-providers.store';
import type { AdminAIProvider } from '../stores/ai-providers.store';
import ProviderDialog from '../components/ProviderDialog.vue';

const aiProvidersStore = useAIProvidersStore();

// State
const searchQuery = ref('');
const filterStatus = ref<'all' | 'enabled' | 'disabled'>('all');
const showDialog = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const selectedProvider = ref<AdminAIProvider | null>(null);

// Computed
const filteredProviders = computed(() => {
	let result = aiProvidersStore.providers;

	// Filter by status
	if (filterStatus.value === 'enabled') {
		result = result.filter((p) => p.enabled && p.isActive);
	} else if (filterStatus.value === 'disabled') {
		result = result.filter((p) => !p.enabled || !p.isActive);
	}

	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase();
		result = result.filter(
			(p) =>
				p.providerName.toLowerCase().includes(query) ||
				p.providerKey.toLowerCase().includes(query),
		);
	}

	return result;
});

const hasProviders = computed(() => aiProvidersStore.providers.length > 0);

// Methods
async function loadProviders() {
	try {
		await aiProvidersStore.fetchProviders();
	} catch (error) {
		ElMessage.error('加载 AI 提供商列表失败');
		console.error('Failed to load providers:', error);
	}
}

function onCreateProvider() {
	dialogMode.value = 'create';
	selectedProvider.value = null;
	showDialog.value = true;
}

function onEditProvider(provider: AdminAIProvider) {
	dialogMode.value = 'edit';
	selectedProvider.value = provider;
	showDialog.value = true;
}

async function onDeleteProvider(provider: AdminAIProvider) {
	try {
		await ElMessageBox.confirm(
			`确定要删除 AI 提供商 "${provider.providerName}" 吗？此操作不可恢复。`,
			'确认删除',
			{
				confirmButtonText: '删除',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await aiProvidersStore.deleteProvider(provider.providerKey);
		ElMessage.success('删除成功');
	} catch (error) {
		if (error !== 'cancel') {
			ElMessage.error('删除失败');
			console.error('Failed to delete provider:', error);
		}
	}
}

async function onToggleProvider(provider: AdminAIProvider, enabled: boolean) {
	try {
		await aiProvidersStore.toggleProvider(provider.providerKey, enabled);
		ElMessage.success(enabled ? '已启用' : '已禁用');
	} catch (error) {
		ElMessage.error('切换状态失败');
		console.error('Failed to toggle provider:', error);
	}
}

function onProviderAction(provider: AdminAIProvider, action: string) {
	switch (action) {
		case 'edit':
			onEditProvider(provider);
			break;
		case 'delete':
			void onDeleteProvider(provider);
			break;
	}
}

function onDialogClose() {
	showDialog.value = false;
	selectedProvider.value = null;
}

async function onDialogSave() {
	showDialog.value = false;
	await loadProviders();
}

function getProviderActions(provider: AdminAIProvider) {
	return [
		{
			label: '编辑',
			value: 'edit',
		},
		{
			label: '删除',
			value: 'delete',
		},
	];
}

function getModelCount(provider: AdminAIProvider): number {
	if (!provider.modelsConfig || typeof provider.modelsConfig !== 'object') {
		return 0;
	}
	const models = provider.modelsConfig.models;
	return Array.isArray(models) ? models.length : 0;
}

// Lifecycle
onMounted(() => {
	void loadProviders();
});
</script>

<template>
	<div :class="$style.container">
		<!-- Header -->
		<div :class="$style.header">
			<div>
				<N8nHeading tag="h1" size="2xlarge">AI 提供商管理</N8nHeading>
				<p :class="$style.subtitle">配置和管理平台 AI 服务提供商</p>
			</div>
			<div :class="$style.headerActions">
				<N8nButton
					icon="refresh-cw"
					type="secondary"
					:loading="aiProvidersStore.loading"
					@click="loadProviders"
				>
					刷新
				</N8nButton>
				<N8nButton icon="plus" type="primary" @click="onCreateProvider">
					创建提供商
				</N8nButton>
			</div>
		</div>

		<!-- Filters -->
		<N8nCard :class="$style.filtersCard">
			<div :class="$style.filters">
				<N8nInput
					v-model="searchQuery"
					placeholder="搜索提供商名称或标识..."
					clearable
					:class="$style.searchInput"
				>
					<template #prefix>
						<N8nIcon icon="search" size="small" />
					</template>
				</N8nInput>
				<div :class="$style.filterButtons">
					<N8nButton
						:type="filterStatus === 'all' ? 'primary' : 'secondary'"
						size="small"
						@click="filterStatus = 'all'"
					>
						全部
					</N8nButton>
					<N8nButton
						:type="filterStatus === 'enabled' ? 'primary' : 'secondary'"
						size="small"
						@click="filterStatus = 'enabled'"
					>
						已启用
					</N8nButton>
					<N8nButton
						:type="filterStatus === 'disabled' ? 'primary' : 'secondary'"
						size="small"
						@click="filterStatus = 'disabled'"
					>
						已禁用
					</N8nButton>
				</div>
			</div>
		</N8nCard>

		<!-- Loading State -->
		<div v-if="aiProvidersStore.loading && !hasProviders" :class="$style.loading">
			<N8nIcon icon="spinner" size="xlarge" spin />
			<p>加载中...</p>
		</div>

		<!-- Empty State -->
		<N8nCard v-else-if="!hasProviders && !aiProvidersStore.loading" :class="$style.emptyState">
			<N8nIcon icon="cloud-off" size="xlarge" />
			<N8nText color="text-light" size="large" align="center">
				暂无 AI 提供商，点击上方按钮创建
			</N8nText>
		</N8nCard>

		<!-- Provider List -->
		<div v-else :class="$style.providersList">
			<N8nCard
				v-for="provider in filteredProviders"
				:key="provider.id"
				:class="$style.providerCard"
				@click="onEditProvider(provider)"
			>
				<div :class="$style.providerHeader">
					<div :class="$style.providerInfo">
						<div :class="$style.providerIcon">
							<img v-if="provider.iconUrl" :src="provider.iconUrl" :alt="provider.providerName" />
							<N8nIcon v-else icon="server" size="large" />
						</div>
						<div :class="$style.providerDetails">
							<N8nText tag="h3" bold size="large">
								{{ provider.providerName }}
							</N8nText>
							<N8nText color="text-light" size="small">
								{{ provider.providerKey }}
							</N8nText>
						</div>
					</div>
					<div :class="$style.providerActions" @click.stop>
						<ElSwitch
							:model-value="provider.enabled"
							@update:model-value="onToggleProvider(provider, $event)"
						/>
						<N8nActionToggle
							:actions="getProviderActions(provider)"
							theme="dark"
							@action="onProviderAction(provider, $event)"
						/>
					</div>
				</div>
				<div :class="$style.providerContent">
					<div :class="$style.providerStat">
						<N8nText color="text-light" size="small">模型数量</N8nText>
						<N8nText bold>{{ getModelCount(provider) }}</N8nText>
					</div>
					<div :class="$style.providerStat">
						<N8nText color="text-light" size="small">状态</N8nText>
						<N8nBadge :theme="provider.enabled && provider.isActive ? 'success' : 'secondary'">
							{{ provider.enabled && provider.isActive ? '已启用' : '已禁用' }}
						</N8nBadge>
					</div>
					<div :class="$style.providerStat">
						<N8nText color="text-light" size="small">API 端点</N8nText>
						<N8nText size="small" :class="$style.endpoint">{{ provider.apiEndpoint }}</N8nText>
					</div>
				</div>
			</N8nCard>
		</div>

		<!-- Provider Dialog -->
		<ProviderDialog
			v-if="showDialog"
			:mode="dialogMode"
			:provider="selectedProvider"
			@close="onDialogClose"
			@save="onDialogSave"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--xl);
	max-width: 1400px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--lg);
}

.subtitle {
	margin-top: var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
}

.headerActions {
	display: flex;
	gap: var(--spacing--sm);
}

.filtersCard {
	margin-bottom: var(--spacing--lg);
}

.filters {
	display: flex;
	gap: var(--spacing--md);
	align-items: center;
}

.searchInput {
	flex: 1;
	max-width: 400px;
}

.filterButtons {
	display: flex;
	gap: var(--spacing--xs);
}

.loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xl);
	color: var(--color--text--tint-2);
	gap: var(--spacing--sm);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	gap: var(--spacing--md);
}

.providersList {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: var(--spacing--lg);
}

.providerCard {
	cursor: pointer;
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: 0 2px 8px rgba(68, 28, 23, 0.1);
	}
}

.providerHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--md);
}

.providerInfo {
	display: flex;
	gap: var(--spacing--sm);
	align-items: center;
	flex: 1;
}

.providerIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);

	img {
		width: 32px;
		height: 32px;
		object-fit: contain;
	}
}

.providerDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.providerActions {
	display: flex;
	gap: var(--spacing--sm);
	align-items: center;
}

.providerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.providerStat {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.endpoint {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (max-width: 768px) {
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--md);
	}

	.filters {
		flex-direction: column;
		align-items: stretch;
	}

	.searchInput {
		max-width: none;
	}

	.providersList {
		grid-template-columns: 1fr;
	}
}
</style>
