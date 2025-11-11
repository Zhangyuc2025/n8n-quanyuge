<template>
	<a-modal :open="open" :title="node ? node.name : '节点详情'" :width="800" @cancel="handleCancel">
		<a-spin :spinning="loading">
			<div v-if="node" class="node-detail">
				<!-- 基本信息 -->
				<section class="detail-section">
					<h3>基本信息</h3>
					<a-descriptions bordered :column="2">
						<a-descriptions-item label="节点名称">
							{{ node.name }}
						</a-descriptions-item>
						<a-descriptions-item label="节点 Key">
							{{ node.nodeKey }}
						</a-descriptions-item>
						<a-descriptions-item label="分类">
							{{ node.category }}
						</a-descriptions-item>
						<a-descriptions-item label="版本">
							{{ node.version }}
						</a-descriptions-item>
						<a-descriptions-item label="节点类型">
							<a-tag :color="node.nodeType === 'platform' ? 'blue' : 'green'">
								{{ node.nodeType === 'platform' ? '平台节点' : '第三方节点' }}
							</a-tag>
						</a-descriptions-item>
						<a-descriptions-item label="状态">
							<a-space>
								<a-badge
									:status="node.isActive ? 'success' : 'default'"
									:text="node.isActive ? '激活' : '未激活'"
								/>
								<a-badge
									:status="node.enabled ? 'processing' : 'default'"
									:text="node.enabled ? '启用' : '禁用'"
								/>
							</a-space>
						</a-descriptions-item>
						<a-descriptions-item label="审核状态" :span="2">
							<a-tag :color="getSubmissionStatusColor(node.submissionStatus)">
								{{ getSubmissionStatusText(node.submissionStatus) }}
							</a-tag>
						</a-descriptions-item>
						<a-descriptions-item label="描述" :span="2">
							{{ node.description || '无' }}
						</a-descriptions-item>
					</a-descriptions>
				</section>

				<!-- 提交信息 -->
				<section v-if="node.submittedBy || node.reviewedBy" class="detail-section">
					<h3>提交与审核信息</h3>
					<a-descriptions bordered :column="2">
						<a-descriptions-item v-if="node.submittedBy" label="提交者">
							{{ node.submittedBy }}
						</a-descriptions-item>
						<a-descriptions-item v-if="node.submittedAt" label="提交时间">
							{{ formatDate(node.submittedAt) }}
						</a-descriptions-item>
						<a-descriptions-item v-if="node.reviewedBy" label="审核者">
							{{ node.reviewedBy }}
						</a-descriptions-item>
						<a-descriptions-item v-if="node.reviewedAt" label="审核时间">
							{{ formatDate(node.reviewedAt) }}
						</a-descriptions-item>
					</a-descriptions>
				</section>

				<!-- 使用统计 -->
				<section
					v-if="node.usageCount !== undefined || node.errorRate !== undefined"
					class="detail-section"
				>
					<h3>使用统计</h3>
					<a-descriptions bordered :column="2">
						<a-descriptions-item v-if="node.usageCount !== undefined" label="调用次数">
							{{ node.usageCount }}
						</a-descriptions-item>
						<a-descriptions-item v-if="node.errorRate !== undefined" label="错误率">
							{{ (node.errorRate * 100).toFixed(2) }}%
						</a-descriptions-item>
					</a-descriptions>
				</section>

				<!-- 节点代码预览 -->
				<section v-if="node.nodeCode" class="detail-section">
					<h3>节点代码</h3>
					<a-textarea
						:value="node.nodeCode"
						:rows="10"
						readonly
						style="font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 12px"
					/>
				</section>

				<!-- 节点定义 -->
				<section v-if="node.nodeDefinition" class="detail-section">
					<h3>节点定义</h3>
					<a-textarea
						:value="JSON.stringify(node.nodeDefinition, null, 2)"
						:rows="8"
						readonly
						style="font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 12px"
					/>
				</section>

				<!-- 操作按钮 -->
				<section class="detail-section">
					<a-space>
						<a-button
							v-if="node.submissionStatus === 'pending'"
							type="primary"
							@click="handleApprove"
						>
							审核通过
						</a-button>
						<a-button v-if="node.submissionStatus === 'pending'" danger @click="handleReject">
							审核拒绝
						</a-button>
						<a-button :type="node.enabled ? 'default' : 'primary'" @click="handleToggle">
							{{ node.enabled ? '禁用节点' : '启用节点' }}
						</a-button>
					</a-space>
				</section>
			</div>
			<div v-else class="empty-state">
				<a-empty description="节点不存在" />
			</div>
		</a-spin>

		<template #footer>
			<a-button @click="handleCancel">关闭</a-button>
		</template>
	</a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePlatformNodesStore } from '@/stores/platformNodes.store';
import { useAdminNotification } from '@n8n/shared';
import type { PlatformNode } from '@/types/admin.types';

interface Props {
	open: boolean;
	nodeKey?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	'update:open': [value: boolean];
	cancel: [];
	updated: [];
}>();

const platformNodesStore = usePlatformNodesStore();
const notification = useAdminNotification();

const loading = ref(false);
const node = ref<PlatformNode | null>(null);

// 监听 nodeKey 变化加载节点详情
watch(
	() => props.nodeKey,
	async (newNodeKey) => {
		if (newNodeKey && props.open) {
			await loadNodeDetail(newNodeKey);
		}
	},
	{ immediate: true },
);

// 监听弹窗可见性
watch(
	() => props.open,
	async (isVisible) => {
		if (isVisible && props.nodeKey) {
			await loadNodeDetail(props.nodeKey);
		} else if (!isVisible) {
			node.value = null;
		}
	},
);

async function loadNodeDetail(nodeKey: string): Promise<void> {
	loading.value = true;
	try {
		node.value = await platformNodesStore.fetchNodeDetail(nodeKey);
	} catch (error: any) {
		notification.error({
			message: '加载节点详情失败',
			description: error.message || '请稍后重试',
		});
	} finally {
		loading.value = false;
	}
}

function handleCancel(): void {
	emit('update:open', false);
	emit('cancel');
}

async function handleApprove(): Promise<void> {
	if (!node.value) return;

	try {
		await platformNodesStore.approveNode(node.value.nodeKey);
		notification.success({
			message: '审核成功',
			description: `节点 ${node.value.name} 已审核通过`,
		});
		emit('updated');
	} catch (error: any) {
		notification.error({
			message: '审核失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleReject(): Promise<void> {
	if (!node.value) return;

	try {
		await platformNodesStore.rejectNode(node.value.nodeKey);
		notification.success({
			message: '审核成功',
			description: `节点 ${node.value.name} 已被拒绝`,
		});
		emit('updated');
	} catch (error: any) {
		notification.error({
			message: '审核失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleToggle(): Promise<void> {
	if (!node.value) return;

	const newEnabled = !node.value.enabled;

	try {
		await platformNodesStore.toggleNode(node.value.nodeKey, newEnabled);
		notification.success({
			message: '操作成功',
			description: `节点已${newEnabled ? '启用' : '禁用'}`,
		});
		node.value.enabled = newEnabled;
		emit('updated');
	} catch (error: any) {
		notification.error({
			message: '操作失败',
			description: error.message || '请稍后重试',
		});
	}
}

function getSubmissionStatusColor(status: string): string {
	const colorMap: Record<string, string> = {
		pending: 'orange',
		approved: 'green',
		rejected: 'red',
	};
	return colorMap[status] || 'default';
}

function getSubmissionStatusText(status: string): string {
	const textMap: Record<string, string> = {
		pending: '待审核',
		approved: '已批准',
		rejected: '已拒绝',
	};
	return textMap[status] || status;
}

function formatDate(date: string): string {
	return new Date(date).toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}
</script>

<style scoped lang="scss">
.node-detail {
	.detail-section {
		margin-bottom: 24px;

		&:last-child {
			margin-bottom: 0;
		}

		h3 {
			margin-bottom: 16px;
			font-size: 16px;
			font-weight: 600;
			color: var(--color--text);
		}
	}
}

.empty-state {
	padding: 40px 0;
	text-align: center;
}
</style>
