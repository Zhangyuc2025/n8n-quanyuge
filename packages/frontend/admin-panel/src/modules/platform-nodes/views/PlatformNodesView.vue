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
import { ElTabs, ElTabPane, ElSwitch, ElMessageBox, ElMessage } from 'element-plus';
import { usePlatformNodesStore } from '../stores/platform-nodes.store';
import type { AdminPlatformNode, AdminCustomNode } from '../stores/platform-nodes.store';
import PlatformNodeDialog from '../components/PlatformNodeDialog.vue';

const platformNodesStore = usePlatformNodesStore();

// State
const activeTab = ref<'platform' | 'custom' | 'pending'>('platform');
const searchQuery = ref('');
const showDialog = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const selectedNode = ref<AdminPlatformNode | null>(null);

// Computed
const filteredPlatformNodes = computed(() => {
	if (!searchQuery.value.trim()) {
		return platformNodesStore.platformNodes;
	}
	const query = searchQuery.value.toLowerCase();
	return platformNodesStore.platformNodes.filter(
		(n) => n.nodeName.toLowerCase().includes(query) || n.nodeKey.toLowerCase().includes(query),
	);
});

const pendingNodes = computed(() => platformNodesStore.pendingPlatformNodes);

const customNodes = computed(() => platformNodesStore.customNodes);

// Methods
async function loadPlatformNodes() {
	try {
		await platformNodesStore.fetchPlatformNodes();
	} catch (error) {
		ElMessage.error('加载平台节点失败');
		console.error('Failed to load platform nodes:', error);
	}
}

async function loadPendingNodes() {
	try {
		await platformNodesStore.fetchPendingSubmissions();
	} catch (error) {
		ElMessage.error('加载待审核节点失败');
		console.error('Failed to load pending nodes:', error);
	}
}

async function loadAllCustomNodes() {
	// For admin view, we need to load custom nodes from all workspaces
	// This would require a new admin API endpoint or fetching for each workspace
	// For now, we'll keep the list empty or show a message
	try {
		// TODO: Implement admin-level custom nodes fetching
		// For now, this will remain empty in admin panel
		ElMessage.info('自定义节点查看功能将在后续版本中实现');
	} catch (error) {
		ElMessage.error('加载自定义节点失败');
		console.error('Failed to load custom nodes:', error);
	}
}

function onCreateNode() {
	dialogMode.value = 'create';
	selectedNode.value = null;
	showDialog.value = true;
}

function onEditNode(node: AdminPlatformNode) {
	dialogMode.value = 'edit';
	selectedNode.value = node;
	showDialog.value = true;
}

async function onDeleteNode(node: AdminPlatformNode) {
	try {
		await ElMessageBox.confirm(
			`确定要删除节点 "${node.nodeName}" 吗？此操作不可恢复。`,
			'确认删除',
			{
				confirmButtonText: '删除',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await platformNodesStore.deletePlatformNode(node.nodeKey);
		ElMessage.success('删除成功');
	} catch (error) {
		if (error !== 'cancel') {
			ElMessage.error('删除失败');
			console.error('Failed to delete node:', error);
		}
	}
}

async function onToggleNode(node: AdminPlatformNode, enabled: boolean) {
	try {
		await platformNodesStore.togglePlatformNode(node.nodeKey, enabled);
		ElMessage.success(enabled ? '已启用' : '已禁用');
	} catch (error) {
		ElMessage.error('切换状态失败');
		console.error('Failed to toggle node:', error);
	}
}

async function onApproveNode(node: AdminPlatformNode) {
	try {
		const { value: reviewNotes } = await ElMessageBox.prompt(
			'请输入审核备注（可选）',
			'审核通过',
			{
				confirmButtonText: '通过',
				cancelButtonText: '取消',
				inputPlaceholder: '审核备注...',
			},
		);

		await platformNodesStore.approvePlatformNode(node.nodeKey, reviewNotes || undefined);
		ElMessage.success('审核通过');
		await loadPendingNodes();
	} catch (error) {
		if (error !== 'cancel') {
			ElMessage.error('审核失败');
			console.error('Failed to approve node:', error);
		}
	}
}

async function onRejectNode(node: AdminPlatformNode) {
	try {
		const { value: reviewNotes } = await ElMessageBox.prompt(
			'请输入拒绝原因',
			'拒绝节点',
			{
				confirmButtonText: '拒绝',
				cancelButtonText: '取消',
				inputPlaceholder: '拒绝原因...',
				inputValidator: (value) => {
					if (!value || !value.trim()) {
						return '请输入拒绝原因';
					}
					return true;
				},
			},
		);

		await platformNodesStore.rejectPlatformNode(node.nodeKey, reviewNotes);
		ElMessage.success('已拒绝');
		await loadPendingNodes();
	} catch (error) {
		if (error !== 'cancel') {
			ElMessage.error('操作失败');
			console.error('Failed to reject node:', error);
		}
	}
}

function onNodeAction(node: AdminPlatformNode, action: string) {
	switch (action) {
		case 'edit':
			onEditNode(node);
			break;
		case 'delete':
			void onDeleteNode(node);
			break;
	}
}

function getPlatformNodeActions(node: AdminPlatformNode) {
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

function onDialogClose() {
	showDialog.value = false;
	selectedNode.value = null;
}

async function onDialogSave() {
	showDialog.value = false;
	await loadPlatformNodes();
}

function onTabChange(tabName: string) {
	activeTab.value = tabName as 'platform' | 'custom' | 'pending';
	if (tabName === 'platform') {
		void loadPlatformNodes();
	} else if (tabName === 'custom') {
		void loadAllCustomNodes();
	} else if (tabName === 'pending') {
		void loadPendingNodes();
	}
}

// Lifecycle
onMounted(() => {
	void loadPlatformNodes();
	void loadPendingNodes();
});
</script>

<template>
	<div :class="$style.container">
		<!-- Header -->
		<div :class="$style.header">
			<div>
				<N8nHeading tag="h1" size="2xlarge">节点管理</N8nHeading>
				<p :class="$style.subtitle">管理平台节点、自定义节点和审核提交</p>
			</div>
			<div :class="$style.headerActions">
				<N8nButton
					icon="refresh-cw"
					type="secondary"
					:loading="platformNodesStore.loading"
					@click="loadPlatformNodes"
				>
					刷新
				</N8nButton>
				<N8nButton v-if="activeTab === 'platform'" icon="plus" type="primary" @click="onCreateNode">
					创建节点
				</N8nButton>
			</div>
		</div>

		<!-- Tabs -->
		<N8nCard :class="$style.tabsCard">
			<ElTabs :model-value="activeTab" @tab-click="onTabChange">
				<ElTabPane label="平台节点" name="platform">
					<!-- Search Bar -->
					<div :class="$style.searchBar">
						<N8nInput v-model="searchQuery" placeholder="搜索节点名称或标识..." clearable>
							<template #prefix>
								<N8nIcon icon="search" size="small" />
							</template>
						</N8nInput>
					</div>

					<!-- Loading State -->
					<div
						v-if="platformNodesStore.loading && platformNodesStore.platformNodes.length === 0"
						:class="$style.loading"
					>
						<N8nIcon icon="spinner" size="xlarge" spin />
						<p>加载中...</p>
					</div>

					<!-- Empty State -->
					<div
						v-else-if="filteredPlatformNodes.length === 0 && !platformNodesStore.loading"
						:class="$style.emptyState"
					>
						<N8nIcon icon="box" size="xlarge" />
						<N8nText color="text-light" size="large" align="center">
							暂无平台节点，点击上方按钮创建
						</N8nText>
					</div>

					<!-- Nodes List -->
					<div v-else :class="$style.nodesList">
						<N8nCard
							v-for="node in filteredPlatformNodes"
							:key="node.id"
							:class="$style.nodeCard"
							@click="onEditNode(node)"
						>
							<div :class="$style.nodeHeader">
								<div :class="$style.nodeInfo">
									<N8nText tag="h3" bold size="large">
										{{ node.nodeName }}
									</N8nText>
									<N8nText color="text-light" size="small">
										{{ node.nodeKey }}
									</N8nText>
								</div>
								<div :class="$style.nodeActions" @click.stop>
									<ElSwitch
										:model-value="node.enabled"
										@update:model-value="onToggleNode(node, $event)"
									/>
									<N8nActionToggle
										:actions="getPlatformNodeActions(node)"
										theme="dark"
										@action="onNodeAction(node, $event)"
									/>
								</div>
							</div>
							<div :class="$style.nodeContent">
								<div :class="$style.nodeStat">
									<N8nText color="text-light" size="small">类型</N8nText>
									<N8nBadge theme="secondary">{{ node.nodeType }}</N8nBadge>
								</div>
								<div :class="$style.nodeStat">
									<N8nText color="text-light" size="small">分类</N8nText>
									<N8nText size="small">{{ node.category || '-' }}</N8nText>
								</div>
								<div :class="$style.nodeStat">
									<N8nText color="text-light" size="small">状态</N8nText>
									<N8nBadge :theme="node.enabled && node.isActive ? 'success' : 'secondary'">
										{{ node.enabled && node.isActive ? '已启用' : '已禁用' }}
									</N8nBadge>
								</div>
							</div>
						</N8nCard>
					</div>
				</ElTabPane>

				<ElTabPane label="自定义节点" name="custom">
					<!-- Empty State for Custom Nodes -->
					<div :class="$style.emptyState">
						<N8nIcon icon="info" size="xlarge" />
						<N8nText color="text-light" size="large" align="center">
							自定义节点查看功能将在后续版本中实现
						</N8nText>
						<N8nText color="text-light" size="small" align="center">
							管理员将能够查看和管理所有工作区的自定义节点
						</N8nText>
					</div>
				</ElTabPane>

				<ElTabPane name="pending">
					<template #label>
						<span>
							待审核节点
							<N8nBadge v-if="pendingNodes.length > 0" theme="warning" :class="$style.badge">
								{{ pendingNodes.length }}
							</N8nBadge>
						</span>
					</template>

					<!-- Loading State -->
					<div v-if="platformNodesStore.loading && pendingNodes.length === 0" :class="$style.loading">
						<N8nIcon icon="spinner" size="xlarge" spin />
						<p>加载中...</p>
					</div>

					<!-- Empty State -->
					<div v-else-if="pendingNodes.length === 0" :class="$style.emptyState">
						<N8nIcon icon="check-circle" size="xlarge" />
						<N8nText color="text-light" size="large" align="center">
							暂无待审核节点
						</N8nText>
					</div>

					<!-- Pending Nodes List -->
					<div v-else :class="$style.nodesList">
						<N8nCard v-for="node in pendingNodes" :key="node.id" :class="$style.nodeCard">
							<div :class="$style.nodeHeader">
								<div :class="$style.nodeInfo">
									<N8nText tag="h3" bold size="large">
										{{ node.nodeName }}
									</N8nText>
									<N8nText color="text-light" size="small">
										{{ node.nodeKey }}
									</N8nText>
								</div>
								<div :class="$style.nodeActions">
									<N8nButton type="primary" size="small" @click="onApproveNode(node)">
										通过
									</N8nButton>
									<N8nButton type="secondary" size="small" @click="onRejectNode(node)">
										拒绝
									</N8nButton>
								</div>
							</div>
							<div :class="$style.nodeContent">
								<div :class="$style.nodeStat">
									<N8nText color="text-light" size="small">提交状态</N8nText>
									<N8nBadge theme="warning">{{ node.submissionStatus }}</N8nBadge>
								</div>
								<div v-if="node.description" :class="$style.nodeStat">
									<N8nText color="text-light" size="small">描述</N8nText>
									<N8nText size="small">{{ node.description }}</N8nText>
								</div>
								<div v-if="node.category" :class="$style.nodeStat">
									<N8nText color="text-light" size="small">分类</N8nText>
									<N8nText size="small">{{ node.category }}</N8nText>
								</div>
							</div>
						</N8nCard>
					</div>
				</ElTabPane>
			</ElTabs>
		</N8nCard>

		<!-- Platform Node Dialog -->
		<PlatformNodeDialog
			v-if="showDialog"
			:mode="dialogMode"
			:node="selectedNode"
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

.tabsCard {
	margin-bottom: var(--spacing--lg);
}

.searchBar {
	margin-top: var(--spacing--md);
	margin-bottom: var(--spacing--md);
	max-width: 400px;
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
	min-height: 400px;
}

.nodesList {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: var(--spacing--lg);
	margin-top: var(--spacing--md);
}

.nodeCard {
	cursor: pointer;
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: 0 2px 8px rgba(68, 28, 23, 0.1);
	}
}

.nodeHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--md);
}

.nodeInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex: 1;
}

.nodeActions {
	display: flex;
	gap: var(--spacing--sm);
	align-items: center;
}

.nodeContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.nodeStat {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.badge {
	margin-left: var(--spacing--xs);
}

@media (max-width: 768px) {
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--md);
	}

	.searchBar {
		max-width: none;
	}

	.nodesList {
		grid-template-columns: 1fr;
	}
}
</style>
