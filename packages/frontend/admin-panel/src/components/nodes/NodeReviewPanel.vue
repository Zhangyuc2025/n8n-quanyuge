<template>
	<a-card title="待审核节点" :bordered="false" class="review-panel">
		<a-spin :spinning="loading">
			<div v-if="pendingNodes.length > 0">
				<a-list :data-source="pendingNodes" :pagination="{ pageSize: 5, showSizeChanger: false }">
					<template #renderItem="{ item }">
						<a-list-item>
							<a-list-item-meta :description="item.description || '无描述'">
								<template #title>
									<a @click="handleViewDetail(item)">{{ item.name }}</a>
								</template>
								<template #avatar>
									<a-avatar v-if="item.icon" :src="item.icon" shape="square" />
									<a-avatar v-else shape="square" style="background-color: #1890ff">
										{{ item.name.charAt(0).toUpperCase() }}
									</a-avatar>
								</template>
							</a-list-item-meta>

							<template #extra>
								<a-space>
									<a-button type="primary" size="small" @click="handleApprove(item)">
										通过
									</a-button>
									<a-button danger size="small" @click="handleReject(item)"> 拒绝 </a-button>
								</a-space>
							</template>
						</a-list-item>
					</template>
				</a-list>
			</div>
			<div v-else class="empty-state">
				<a-empty description="暂无待审核节点" />
			</div>
		</a-spin>

		<!-- 节点详情弹窗 -->
		<NodeDetailDialog
			v-model:open="detailVisible"
			:node-key="selectedNodeKey"
			@updated="handleUpdated"
		/>
	</a-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePlatformNodesStore } from '@/stores/platformNodes.store';
import { useAdminNotification } from '@n8n/shared';
import type { PlatformNode } from '@/types/admin.types';
import NodeDetailDialog from './NodeDetailDialog.vue';

const platformNodesStore = usePlatformNodesStore();
const notification = useAdminNotification();

const loading = ref(false);
const detailVisible = ref(false);
const selectedNodeKey = ref<string | undefined>(undefined);

// 获取待审核节点
const pendingNodes = computed(() => {
	return platformNodesStore.nodes.filter((node) => node.submissionStatus === 'pending');
});

onMounted(async () => {
	await fetchPendingNodes();
});

async function fetchPendingNodes(): Promise<void> {
	loading.value = true;
	try {
		await platformNodesStore.fetchAllNodes({ submissionStatus: 'pending' });
	} catch (error: any) {
		notification.error({
			message: '加载失败',
			description: error.message || '无法加载待审核节点',
		});
	} finally {
		loading.value = false;
	}
}

function handleViewDetail(node: PlatformNode): void {
	selectedNodeKey.value = node.nodeKey;
	detailVisible.value = true;
}

async function handleApprove(node: PlatformNode): Promise<void> {
	try {
		await platformNodesStore.approveNode(node.nodeKey);
		notification.success({
			message: '审核成功',
			description: `节点 ${node.name} 已审核通过`,
		});
		await fetchPendingNodes();
	} catch (error: any) {
		notification.error({
			message: '审核失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleReject(node: PlatformNode): Promise<void> {
	try {
		await platformNodesStore.rejectNode(node.nodeKey);
		notification.success({
			message: '审核成功',
			description: `节点 ${node.name} 已被拒绝`,
		});
		await fetchPendingNodes();
	} catch (error: any) {
		notification.error({
			message: '审核失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleUpdated(): Promise<void> {
	detailVisible.value = false;
	await fetchPendingNodes();
}
</script>

<style scoped lang="scss">
.review-panel {
	:deep(.ant-card-head) {
		border-bottom: 1px solid var(--color--foreground);
	}

	:deep(.ant-list-item-meta-title) {
		margin-bottom: 4px;
		font-weight: 600;
	}

	:deep(.ant-list-item-meta-description) {
		color: var(--color--text--tint-1);
	}
}

.empty-state {
	padding: 40px 0;
	text-align: center;
}
</style>
