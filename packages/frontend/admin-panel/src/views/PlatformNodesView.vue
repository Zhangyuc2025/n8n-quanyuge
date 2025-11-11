<template>
	<div class="platform-nodes-view">
		<a-page-header title="平台节点管理" sub-title="管理所有平台节点和第三方节点" />

		<a-card :bordered="false" class="filter-card">
			<a-row :gutter="[16, 16]">
				<a-col :span="6">
					<a-input-search
						v-model:value="searchQuery"
						placeholder="搜索节点名称或 Key"
						allow-clear
						@search="handleSearch"
					/>
				</a-col>
				<a-col :span="4">
					<a-select
						v-model:value="filters.category"
						placeholder="选择分类"
						allow-clear
						style="width: 100%"
						@change="handleFilterChange"
					>
						<a-select-option value="">全部分类</a-select-option>
						<a-select-option value="ai">AI</a-select-option>
						<a-select-option value="data">数据处理</a-select-option>
						<a-select-option value="communication">通讯</a-select-option>
						<a-select-option value="productivity">生产力</a-select-option>
						<a-select-option value="automation">自动化</a-select-option>
					</a-select>
				</a-col>
				<a-col :span="4">
					<a-select
						v-model:value="filters.nodeType"
						placeholder="节点类型"
						allow-clear
						style="width: 100%"
						@change="handleFilterChange"
					>
						<a-select-option value="">全部类型</a-select-option>
						<a-select-option value="platform">平台节点</a-select-option>
						<a-select-option value="third_party">第三方节点</a-select-option>
					</a-select>
				</a-col>
				<a-col :span="4">
					<a-select
						v-model:value="filters.submissionStatus"
						placeholder="审核状态"
						allow-clear
						style="width: 100%"
						@change="handleFilterChange"
					>
						<a-select-option value="">全部状态</a-select-option>
						<a-select-option value="pending">待审核</a-select-option>
						<a-select-option value="approved">已批准</a-select-option>
						<a-select-option value="rejected">已拒绝</a-select-option>
					</a-select>
				</a-col>
				<a-col :span="4">
					<a-select
						v-model:value="filters.enabled"
						placeholder="启用状态"
						allow-clear
						style="width: 100%"
						@change="handleFilterChange"
					>
						<a-select-option :value="undefined">全部</a-select-option>
						<a-select-option :value="true">已启用</a-select-option>
						<a-select-option :value="false">已禁用</a-select-option>
					</a-select>
				</a-col>
				<a-col :span="2" :flex="1" style="display: flex; justify-content: flex-end; gap: 8px">
					<a-button @click="handleRefresh"> 刷新 </a-button>
					<a-button type="primary" @click="createDialogVisible = true">
						<template #icon>
							<PlusOutlined />
						</template>
						添加节点
					</a-button>
				</a-col>
			</a-row>
		</a-card>

		<a-card :bordered="false" class="table-card">
			<a-table
				:columns="columns"
				:data-source="platformNodesStore.nodes"
				:loading="platformNodesStore.loading"
				:pagination="pagination"
				row-key="id"
				@change="handleTableChange"
			>
				<!-- 节点名称 -->
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'name'">
						<a-space>
							<a-avatar v-if="record.icon" :src="record.icon" :size="32" shape="square" />
							<a-avatar v-else :size="32" shape="square" style="background-color: #1890ff">
								{{ record.name.charAt(0).toUpperCase() }}
							</a-avatar>
							<div>
								<div style="font-weight: 600">{{ record.name }}</div>
								<div style="font-size: 12px; color: var(--color--text--tint-2)">
									{{ record.nodeKey }}
								</div>
							</div>
						</a-space>
					</template>

					<!-- 节点类型 -->
					<template v-else-if="column.key === 'nodeType'">
						<a-tag :color="record.nodeType === 'platform' ? 'blue' : 'green'">
							{{ record.nodeType === 'platform' ? '平台节点' : '第三方节点' }}
						</a-tag>
					</template>

					<!-- 状态 -->
					<template v-else-if="column.key === 'status'">
						<a-space direction="vertical" :size="4">
							<a-badge
								:status="record.isActive ? 'success' : 'default'"
								:text="record.isActive ? '激活' : '未激活'"
							/>
							<a-badge
								:status="record.enabled ? 'processing' : 'default'"
								:text="record.enabled ? '启用' : '禁用'"
							/>
						</a-space>
					</template>

					<!-- 审核状态 -->
					<template v-else-if="column.key === 'submissionStatus'">
						<a-tag :color="getSubmissionStatusColor(record.submissionStatus)">
							{{ getSubmissionStatusText(record.submissionStatus) }}
						</a-tag>
					</template>

					<!-- 操作 -->
					<template v-else-if="column.key === 'actions'">
						<a-space>
							<a-button type="link" size="small" @click="handleViewDetail(record)"> 查看 </a-button>
							<a-button
								v-if="record.submissionStatus === 'pending'"
								type="link"
								size="small"
								@click="handleApprove(record)"
							>
								通过
							</a-button>
							<a-button
								v-if="record.submissionStatus === 'pending'"
								type="link"
								size="small"
								danger
								@click="handleReject(record)"
							>
								拒绝
							</a-button>
							<a-button type="link" size="small" @click="handleToggle(record)">
								{{ record.enabled ? '禁用' : '启用' }}
							</a-button>
							<a-popconfirm
								title="确定要删除这个节点吗？此操作不可恢复。"
								ok-text="确定"
								cancel-text="取消"
								@confirm="handleDelete(record)"
							>
								<a-button type="link" size="small" danger> 删除 </a-button>
							</a-popconfirm>
						</a-space>
					</template>
				</template>
			</a-table>
		</a-card>

		<!-- 节点详情弹窗 -->
		<NodeDetailDialog
			v-model:open="detailVisible"
			:node-key="selectedNodeKey"
			@updated="handleRefresh"
		/>

		<!-- 创建节点弹窗 -->
		<NodeCreateDialog v-model:open="createDialogVisible" @success="handleCreateSuccess" />
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { usePlatformNodesStore } from '@/stores/platformNodes.store';
import { useAdminNotification } from '@n8n/shared';
import type { PlatformNode } from '@/types/admin.types';
import type { TableColumnType } from 'ant-design-vue';
import NodeDetailDialog from '@/components/nodes/NodeDetailDialog.vue';
import NodeCreateDialog from '@/components/nodes/NodeCreateDialog.vue';

const platformNodesStore = usePlatformNodesStore();
const notification = useAdminNotification();

const searchQuery = ref('');
const detailVisible = ref(false);
const createDialogVisible = ref(false);
const selectedNodeKey = ref<string | undefined>(undefined);

const filters = reactive<{
	category?: string;
	nodeType?: 'platform' | 'third_party';
	submissionStatus?: 'pending' | 'approved' | 'rejected';
	enabled?: boolean;
}>({
	category: undefined,
	nodeType: undefined,
	submissionStatus: undefined,
	enabled: undefined,
});

const pagination = reactive({
	current: 1,
	pageSize: 10,
	total: 0,
	showSizeChanger: true,
	showQuickJumper: true,
	showTotal: (total: number) => `共 ${total} 条`,
	pageSizeOptions: ['10', '20', '50', '100'],
});

const columns: TableColumnType[] = [
	{
		title: '节点名称',
		key: 'name',
		dataIndex: 'name',
		width: 250,
	},
	{
		title: '分类',
		key: 'category',
		dataIndex: 'category',
		width: 120,
	},
	{
		title: '版本',
		key: 'version',
		dataIndex: 'version',
		width: 100,
	},
	{
		title: '节点类型',
		key: 'nodeType',
		dataIndex: 'nodeType',
		width: 120,
	},
	{
		title: '状态',
		key: 'status',
		width: 120,
	},
	{
		title: '审核状态',
		key: 'submissionStatus',
		dataIndex: 'submissionStatus',
		width: 120,
	},
	{
		title: '操作',
		key: 'actions',
		width: 280,
		fixed: 'right',
	},
];

onMounted(async () => {
	await fetchNodes();
});

async function fetchNodes(): Promise<void> {
	try {
		await platformNodesStore.fetchAllNodes(filters);
		pagination.total = platformNodesStore.nodes.length;
	} catch (error: any) {
		notification.error({
			message: '加载失败',
			description: error.message || '无法加载节点列表',
		});
	}
}

async function handleSearch(): Promise<void> {
	if (searchQuery.value.trim()) {
		try {
			await platformNodesStore.searchNodes(searchQuery.value.trim());
			pagination.total = platformNodesStore.nodes.length;
		} catch (error: any) {
			notification.error({
				message: '搜索失败',
				description: error.message || '请稍后重试',
			});
		}
	} else {
		await fetchNodes();
	}
}

async function handleFilterChange(): Promise<void> {
	pagination.current = 1;
	await fetchNodes();
}

async function handleRefresh(): Promise<void> {
	searchQuery.value = '';
	Object.assign(filters, {
		category: undefined,
		nodeType: undefined,
		submissionStatus: undefined,
		enabled: undefined,
	});
	await fetchNodes();
}

function handleTableChange(paginationParams: any): void {
	pagination.current = paginationParams.current;
	pagination.pageSize = paginationParams.pageSize;
}

function handleViewDetail(node: PlatformNode): void {
	selectedNodeKey.value = node.nodeKey;
	detailVisible.value = true;
}

async function handleCreateSuccess(data: {
	nodeKey: string;
	nodeName: string;
	nodeType: 'platform_official' | 'third_party_approved';
	nodeDefinition: Record<string, unknown>;
	category?: string;
	version?: string;
	iconUrl?: string;
	description?: string;
	nodeCode?: string;
}): Promise<void> {
	try {
		await platformNodesStore.createNode(data);
		notification.success({
			message: '创建成功',
			description: `节点 ${data.nodeName} 已成功创建`,
		});
		await fetchNodes();
	} catch (error: any) {
		notification.error({
			message: '创建失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleApprove(node: PlatformNode): Promise<void> {
	try {
		await platformNodesStore.approveNode(node.nodeKey);
		notification.success({
			message: '审核成功',
			description: `节点 ${node.name} 已审核通过`,
		});
		await fetchNodes();
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
		await fetchNodes();
	} catch (error: any) {
		notification.error({
			message: '审核失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleToggle(node: PlatformNode): Promise<void> {
	const newEnabled = !node.enabled;

	try {
		await platformNodesStore.toggleNode(node.nodeKey, newEnabled);
		notification.success({
			message: '操作成功',
			description: `节点已${newEnabled ? '启用' : '禁用'}`,
		});
		await fetchNodes();
	} catch (error: any) {
		notification.error({
			message: '操作失败',
			description: error.message || '请稍后重试',
		});
	}
}

async function handleDelete(node: PlatformNode): Promise<void> {
	try {
		await platformNodesStore.deleteNode(node.nodeKey);
		notification.success({
			message: '删除成功',
			description: `节点 ${node.name} 已删除`,
		});
		await fetchNodes();
	} catch (error: any) {
		notification.error({
			message: '删除失败',
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
</script>

<style scoped lang="scss">
.platform-nodes-view {
	padding: var(--spacing--lg);

	.filter-card {
		margin-bottom: var(--spacing--lg);
	}

	.table-card {
		:deep(.ant-table) {
			font-size: 14px;
		}

		:deep(.ant-table-cell) {
			padding: 12px 8px;
		}
	}
}
</style>
