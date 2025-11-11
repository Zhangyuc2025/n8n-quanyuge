<template>
	<div class="workspaces-view">
		<a-card title="工作空间管理" :bordered="false">
			<!-- 筛选和操作栏 -->
			<div class="filter-bar">
				<a-space>
					<a-input-search
						v-model:value="searchKeyword"
						placeholder="搜索工作空间名称"
						style="width: 300px"
						@search="handleSearch"
						allow-clear
					/>
					<a-select
						v-model:value="filterType"
						placeholder="工作空间类型"
						style="width: 150px"
						allow-clear
						@change="handleFilterChange"
					>
						<a-select-option value="team">团队空间</a-select-option>
						<a-select-option value="personal">个人空间</a-select-option>
					</a-select>
					<a-select
						v-model:value="sortBy"
						placeholder="排序方式"
						style="width: 150px"
						@change="handleSortChange"
					>
						<a-select-option value="createdAt">创建时间</a-select-option>
						<a-select-option value="balance">余额</a-select-option>
						<a-select-option value="name">名称</a-select-option>
					</a-select>
					<a-select v-model:value="sortOrder" style="width: 120px" @change="handleSortChange">
						<a-select-option value="DESC">降序</a-select-option>
						<a-select-option value="ASC">升序</a-select-option>
					</a-select>
				</a-space>
			</div>

			<!-- 数据表格 -->
			<a-table
				:columns="columns"
				:data-source="workspaces"
				:loading="loading"
				:pagination="paginationConfig"
				:scroll="{ x: 1200 }"
				@change="handleTableChange"
				row-key="id"
				class="workspaces-table"
			>
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'name'">
						<a @click="handleViewDetail(record)">{{ record.name }}</a>
					</template>

					<template v-else-if="column.key === 'type'">
						<a-tag :color="record.type === 'team' ? 'blue' : 'green'">
							<template #icon>
								<TeamOutlined v-if="record.type === 'team'" />
								<UserOutlined v-else />
							</template>
							{{ workspacesStore.getWorkspaceTypeLabel(record.type) }}
						</a-tag>
					</template>

					<template v-else-if="column.key === 'balance'">
						<span :style="{ color: getBalanceColor(record.balance), fontWeight: 600 }">
							{{ formatCurrency(record.balance) }}
						</span>
						<a-badge
							v-if="record.isLowBalance"
							status="error"
							text="余额不足"
							style="margin-left: 8px"
						/>
					</template>

					<template v-else-if="column.key === 'memberCount'">
						{{ record.memberCount }} 人
					</template>

					<template v-else-if="column.key === 'status'">
						<a-tag :color="record.status === 'active' ? 'green' : 'red'">
							{{ workspacesStore.getStatusLabel(record.status) }}
						</a-tag>
					</template>

					<template v-else-if="column.key === 'createdAt'">
						{{ formatDate(record.createdAt, 'YYYY-MM-DD HH:mm') }}
					</template>

					<template v-else-if="column.key === 'actions'">
						<a-space>
							<a-button size="small" @click="handleViewDetail(record)"> 详情 </a-button>
							<a-button size="small" type="primary" @click="handleRecharge(record)">
								充值
							</a-button>
							<a-dropdown>
								<template #overlay>
									<a-menu @click="(e: any) => handleMenuClick(e, record)">
										<a-menu-item key="usage">查看消费记录</a-menu-item>
										<a-menu-divider />
										<a-menu-item v-if="record.status === 'active'" key="suspend" danger>
											暂停工作空间
										</a-menu-item>
										<a-menu-item v-else key="activate"> 恢复工作空间 </a-menu-item>
									</a-menu>
								</template>
								<a-button size="small">
									更多
									<DownOutlined />
								</a-button>
							</a-dropdown>
						</a-space>
					</template>
				</template>
			</a-table>
		</a-card>

		<!-- 工作空间详情抽屉 -->
		<WorkspaceDetailDrawer
			v-model:open="detailDrawerVisible"
			:workspace-id="selectedWorkspaceId"
			@view-usage-records="handleViewUsageRecordsFromDrawer"
		/>

		<!-- 充值弹窗 -->
		<RechargeDialog
			v-model:open="rechargeDialogVisible"
			:workspace-id="selectedWorkspaceId"
			:workspace-name="selectedWorkspaceName"
			:current-balance="selectedWorkspaceBalance"
			@success="handleRechargeSuccess"
		/>

		<!-- 消费记录弹窗 -->
		<UsageRecordsModal
			v-model:open="usageRecordsModalVisible"
			:workspace-id="selectedWorkspaceId"
			:workspace-name="selectedWorkspaceName"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Modal, message } from 'ant-design-vue';
import { UserOutlined, TeamOutlined, DownOutlined } from '@ant-design/icons-vue';
import { formatDate, formatCurrency } from '@n8n/shared';
import { useWorkspacesStore } from '@/stores/workspaces.store';
import WorkspaceDetailDrawer from '@/components/workspaces/WorkspaceDetailDrawer.vue';
import RechargeDialog from '@/components/workspaces/RechargeDialog.vue';
import UsageRecordsModal from '@/components/workspaces/UsageRecordsModal.vue';
import type { TableColumnType } from 'ant-design-vue';
import type { Workspace } from '@/types/admin.types';

const workspacesStore = useWorkspacesStore();

// 筛选和排序
const searchKeyword = ref('');
const filterType = ref<'team' | 'personal' | undefined>(undefined);
const sortBy = ref<'name' | 'createdAt' | 'balance'>('createdAt');
const sortOrder = ref<'ASC' | 'DESC'>('DESC');

// 分页
const currentPage = ref(1);
const pageSize = ref(20);

// 弹窗和抽屉
const detailDrawerVisible = ref(false);
const rechargeDialogVisible = ref(false);
const usageRecordsModalVisible = ref(false);
const selectedWorkspaceId = ref('');
const selectedWorkspaceName = ref('');
const selectedWorkspaceBalance = ref<number | undefined>(undefined);

const loading = computed(() => workspacesStore.loading);
const workspaces = computed(() => workspacesStore.workspaces);
const pagination = computed(() => workspacesStore.pagination);

const columns: TableColumnType[] = [
	{
		title: '工作空间名称',
		dataIndex: 'name',
		key: 'name',
		width: 200,
		fixed: 'left',
	},
	{
		title: '类型',
		dataIndex: 'type',
		key: 'type',
		width: 120,
	},
	{
		title: '当前余额',
		dataIndex: 'balance',
		key: 'balance',
		width: 150,
		align: 'right',
	},
	{
		title: '成员数',
		dataIndex: 'memberCount',
		key: 'memberCount',
		width: 100,
		align: 'center',
	},
	{
		title: '状态',
		dataIndex: 'status',
		key: 'status',
		width: 100,
		align: 'center',
	},
	{
		title: '创建时间',
		dataIndex: 'createdAt',
		key: 'createdAt',
		width: 180,
	},
	{
		title: '操作',
		key: 'actions',
		width: 250,
		fixed: 'right',
	},
];

const paginationConfig = computed(() => ({
	current: currentPage.value,
	pageSize: pageSize.value,
	total: pagination.value?.total || 0,
	showSizeChanger: true,
	showQuickJumper: true,
	showTotal: (total: number) => `共 ${total} 个工作空间`,
	pageSizeOptions: ['10', '20', '50', '100'],
}));

const getBalanceColor = (balance: number): string => {
	if (balance < 100) return '#f5222d';
	if (balance < 1000) return '#fa8c16';
	return '#52c41a';
};

const fetchWorkspaces = async (): Promise<void> => {
	try {
		await workspacesStore.fetchWorkspaces({
			page: currentPage.value,
			limit: pageSize.value,
			search: searchKeyword.value || undefined,
			sortBy: sortBy.value,
			sortOrder: sortOrder.value,
		});
	} catch (error: any) {
		console.error('Failed to fetch workspaces:', error);
		message.error('获取工作空间列表失败');
	}
};

const handleSearch = (): void => {
	currentPage.value = 1;
	fetchWorkspaces();
};

const handleFilterChange = (): void => {
	currentPage.value = 1;
	fetchWorkspaces();
};

const handleSortChange = (): void => {
	fetchWorkspaces();
};

const handleTableChange = (pagination: any): void => {
	currentPage.value = pagination.current;
	pageSize.value = pagination.pageSize;
	fetchWorkspaces();
};

const handleViewDetail = (workspace: Workspace): void => {
	selectedWorkspaceId.value = workspace.id;
	detailDrawerVisible.value = true;
};

const handleRecharge = (workspace: Workspace): void => {
	selectedWorkspaceId.value = workspace.id;
	selectedWorkspaceName.value = workspace.name;
	selectedWorkspaceBalance.value = workspace.balance;
	rechargeDialogVisible.value = true;
};

const handleRechargeSuccess = (): void => {
	fetchWorkspaces();
};

const handleViewUsageRecords = (workspace: Workspace): void => {
	selectedWorkspaceId.value = workspace.id;
	selectedWorkspaceName.value = workspace.name;
	usageRecordsModalVisible.value = true;
};

const handleViewUsageRecordsFromDrawer = (workspaceId: string): void => {
	const workspace = workspaces.value.find((w) => w.id === workspaceId);
	if (workspace) {
		selectedWorkspaceId.value = workspaceId;
		selectedWorkspaceName.value = workspace.name;
		detailDrawerVisible.value = false;
		usageRecordsModalVisible.value = true;
	}
};

const handleMenuClick = async (e: { key: string }, workspace: Workspace): Promise<void> => {
	if (e.key === 'usage') {
		handleViewUsageRecords(workspace);
	} else if (e.key === 'suspend') {
		Modal.confirm({
			title: '确认暂停工作空间',
			content: `确定要暂停工作空间"${workspace.name}"吗？暂停后该工作空间将无法执行工作流。`,
			okText: '确认',
			okType: 'danger',
			cancelText: '取消',
			onOk: async () => {
				try {
					await workspacesStore.updateWorkspaceStatus(workspace.id, 'suspended', '管理员手动暂停');
					message.success('工作空间已暂停');
					await fetchWorkspaces();
				} catch (error: any) {
					console.error('Failed to suspend workspace:', error);
					message.error('暂停工作空间失败');
				}
			},
		});
	} else if (e.key === 'activate') {
		try {
			await workspacesStore.updateWorkspaceStatus(workspace.id, 'active', '管理员手动恢复');
			message.success('工作空间已恢复');
			await fetchWorkspaces();
		} catch (error: any) {
			console.error('Failed to activate workspace:', error);
			message.error('恢复工作空间失败');
		}
	}
};

onMounted(() => {
	fetchWorkspaces();
});
</script>

<style scoped lang="scss">
.workspaces-view {
	padding: var(--admin-spacing-lg);

	.filter-bar {
		margin-bottom: 16px;
	}

	.workspaces-table {
		:deep(.ant-table-cell) {
			padding: 12px 16px;
		}
	}
}
</style>
