<script lang="ts" setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { useCustomNodesStore } from '@/app/stores/customNodes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { storeToRefs } from 'pinia';
import { ElRow, ElCol, ElInput, ElSwitch, ElEmpty } from 'element-plus';
import { N8nHeading, N8nButton, N8nCard, N8nText, N8nIcon } from '@n8n/design-system';
import CustomNodeUploadDialog from './CustomNodeUploadDialog.vue';
import { MODAL_CONFIRM } from '@/app/constants';

const customNodesStore = useCustomNodesStore();
const projectsStore = useProjectsStore();
const { customNodes, isLoading } = storeToRefs(customNodesStore);

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const documentTitle = useDocumentTitle();
const i18n = useI18n();

const searchQuery = ref('');
const uploadDialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingNode = ref<any>(null);

const filteredNodes = computed(() => {
	const query = searchQuery.value.toLowerCase();
	if (!query) return customNodes.value;

	return customNodes.value.filter(
		(node) =>
			node.nodeName.toLowerCase().includes(query) ||
			node.nodeKey.toLowerCase().includes(query) ||
			node.description?.toLowerCase().includes(query),
	);
});

onMounted(async () => {
	documentTitle.set('自定义节点');
	await loadNodes();
});

// 监听工作空间切换
watch(
	() => projectsStore.currentWorkspaceId,
	async () => {
		await loadNodes();
	},
);

async function loadNodes() {
	const workspaceId = projectsStore.currentWorkspaceId;
	if (!workspaceId) {
		showError(new Error('未选择工作空间'), '加载失败');
		return;
	}

	try {
		await customNodesStore.fetchWorkspaceNodes(workspaceId);
	} catch (error) {
		showError(error, '加载自定义节点失败');
	}
}

function handleCreateNode() {
	dialogMode.value = 'create';
	editingNode.value = null;
	uploadDialogVisible.value = true;
}

function handleEditNode(node: any) {
	dialogMode.value = 'edit';
	editingNode.value = node;
	uploadDialogVisible.value = true;
}

async function handleToggleNode(node: any) {
	const workspaceId = projectsStore.currentWorkspaceId;
	if (!workspaceId) return;

	try {
		await customNodesStore.toggleNode(node.id, workspaceId, !node.isActive);
		showMessage({
			title: node.isActive ? '节点已禁用' : '节点已启用',
			type: 'success',
		});
	} catch (error) {
		showError(error, '切换节点状态失败');
	}
}

async function handleDeleteNode(node: any) {
	const confirmed = await confirm(
		`确定要删除节点"${node.nodeName}"吗？此操作不可恢复。`,
		'删除自定义节点',
		{
			confirmButtonText: '删除',
			cancelButtonText: '取消',
			type: 'warning',
		},
	);

	if (confirmed === MODAL_CONFIRM) {
		const workspaceId = projectsStore.currentWorkspaceId;
		if (!workspaceId) return;

		try {
			await customNodesStore.deleteNode(node.id, workspaceId);
			showMessage({
				title: '节点已删除',
				type: 'success',
			});
		} catch (error) {
			showError(error, '删除节点失败');
		}
	}
}

async function handleUploadSuccess() {
	await loadNodes();
	uploadDialogVisible.value = false;
	showMessage({
		title: dialogMode.value === 'create' ? '节点创建成功' : '节点更新成功',
		type: 'success',
	});
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">自定义节点</N8nHeading>
			<N8nButton type="primary" size="large" @click="handleCreateNode">
				<template #icon>
					<N8nIcon icon="plus" />
				</template>
				上传节点
			</N8nButton>
		</div>

		<div :class="$style.description">
			<N8nText>
				创建和管理您的自定义节点。自定义节点只在当前工作空间内可用，不会影响其他工作空间。
			</N8nText>
		</div>

		<!-- 搜索栏 -->
		<div :class="$style.searchBar">
			<ElInput
				v-model="searchQuery"
				placeholder="搜索节点..."
				clearable
				:class="$style.searchInput"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</ElInput>
		</div>

		<!-- 节点列表 -->
		<div v-if="isLoading" :class="$style.loading">
			<N8nText>加载中...</N8nText>
		</div>

		<div v-else-if="filteredNodes.length === 0" :class="$style.empty">
			<ElEmpty description="暂无自定义节点">
				<N8nButton type="primary" @click="handleCreateNode">创建第一个节点</N8nButton>
			</ElEmpty>
		</div>

		<div v-else :class="$style.nodesList">
			<ElRow :gutter="16">
				<ElCol
					v-for="node in filteredNodes"
					:key="node.id"
					:xs="24"
					:sm="24"
					:md="12"
					:lg="8"
					:xl="6"
				>
					<N8nCard :class="$style.nodeCard">
						<div :class="$style.nodeHeader">
							<div :class="$style.nodeIcon">
								<img v-if="node.iconUrl" :src="node.iconUrl" alt="" />
								<N8nIcon v-else icon="code" size="large" />
							</div>
							<div :class="$style.nodeInfo">
								<N8nHeading size="small" :class="$style.nodeName">
									{{ node.nodeName }}
								</N8nHeading>
								<N8nText size="small" :class="$style.nodeKey">
									{{ node.nodeKey }}
								</N8nText>
							</div>
						</div>

						<div v-if="node.description" :class="$style.nodeDescription">
							<N8nText size="small" color="text-light">
								{{ node.description }}
							</N8nText>
						</div>

						<div :class="$style.nodeMeta">
							<N8nText size="small" color="text-light">
								<span v-if="node.version">v{{ node.version }}</span>
								<span v-if="node.category"> | {{ node.category }}</span>
							</N8nText>
							<N8nText size="small" color="text-light">
								创建于 {{ new Date(node.createdAt).toLocaleDateString() }}
							</N8nText>
						</div>

						<div :class="$style.nodeActions">
							<div :class="$style.toggleWrapper">
								<N8nText size="small">启用</N8nText>
								<ElSwitch :model-value="node.isActive" @change="handleToggleNode(node)" />
							</div>

							<div :class="$style.actionButtons">
								<N8nButton size="small" @click="handleEditNode(node)">编辑</N8nButton>
								<N8nButton size="small" type="tertiary" @click="handleDeleteNode(node)">
									删除
								</N8nButton>
							</div>
						</div>

						<!-- 提交状态标记 -->
						<div v-if="node.submissionStatus" :class="$style.statusBadge">
							<N8nText v-if="node.submissionStatus === 'pending'" size="small" color="warning" bold>
								审核中
							</N8nText>
							<N8nText
								v-else-if="node.submissionStatus === 'approved'"
								size="small"
								color="success"
								bold
							>
								已通过
							</N8nText>
							<N8nText
								v-else-if="node.submissionStatus === 'rejected'"
								size="small"
								color="danger"
								bold
							>
								已拒绝
							</N8nText>
						</div>
					</N8nCard>
				</ElCol>
			</ElRow>
		</div>

		<!-- 上传弹窗 -->
		<CustomNodeUploadDialog
			v-model:open="uploadDialogVisible"
			:mode="dialogMode"
			:initial-data="editingNode"
			@success="handleUploadSuccess"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--2xl);
	max-width: 1400px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--md);
}

.description {
	margin-bottom: var(--spacing--xl);
	color: var(--color--text--tint-1);
}

.searchBar {
	margin-bottom: var(--spacing--xl);
}

.searchInput {
	max-width: 400px;
}

.loading,
.empty {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 400px;
}

.nodesList {
	margin-top: var(--spacing--xl);
}

.nodeCard {
	margin-bottom: var(--spacing--md);
	height: 100%;
	display: flex;
	flex-direction: column;
	position: relative;
}

.nodeHeader {
	display: flex;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.nodeIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color--background--shade-1);
	border-radius: var(--radius);

	img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
}

.nodeInfo {
	flex: 1;
	min-width: 0;
}

.nodeName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.nodeKey {
	color: var(--color--text--tint-2);
	font-family: monospace;
	font-size: var(--font-size--2xs);
}

.nodeDescription {
	margin-bottom: var(--spacing--sm);
	min-height: 40px;
}

.nodeMeta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: 1px solid var(--color--foreground);
}

.nodeActions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: 1px solid var(--color--foreground);
}

.toggleWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.actionButtons {
	display: flex;
	gap: var(--spacing--xs);
}

.statusBadge {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	padding: 2px 8px;
	border-radius: var(--radius--sm);
	background-color: var(--color--background);
}
</style>
