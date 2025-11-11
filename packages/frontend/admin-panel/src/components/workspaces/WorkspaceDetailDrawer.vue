<template>
	<a-drawer :open="open" title="工作空间详情" :width="720" @close="handleClose">
		<a-spin :spinning="loading">
			<div v-if="workspace" class="workspace-detail">
				<!-- 基本信息 -->
				<section class="detail-section">
					<h3>基本信息</h3>
					<a-descriptions bordered :column="2">
						<a-descriptions-item label="工作空间名称" :span="2">
							{{ workspace.workspace.name }}
						</a-descriptions-item>
						<a-descriptions-item label="类型">
							<a-tag :color="workspace.workspace.type === 'team' ? 'blue' : 'green'">
								<template #icon>
									<TeamOutlined v-if="workspace.workspace.type === 'team'" />
									<UserOutlined v-else />
								</template>
								{{ workspacesStore.getWorkspaceTypeLabel(workspace.workspace.type) }}
							</a-tag>
						</a-descriptions-item>
						<a-descriptions-item label="创建时间">
							{{ formatDate(workspace.workspace.createdAt) }}
						</a-descriptions-item>
					</a-descriptions>
				</section>

				<!-- 财务信息 -->
				<section class="detail-section">
					<h3>财务信息</h3>
					<a-row :gutter="16">
						<a-col :span="8">
							<a-statistic
								title="当前余额"
								:value="workspace.balance.current"
								:precision="2"
								suffix="元"
								:value-style="{
									color: getBalanceColor(workspace.balance.current),
								}"
							/>
						</a-col>
						<a-col :span="8">
							<a-statistic title="总充值" :value="getTotalRecharged()" :precision="2" suffix="元" />
						</a-col>
						<a-col :span="8">
							<a-statistic
								title="预警阈值"
								:value="workspace.balance.lowBalanceThreshold"
								:precision="2"
								suffix="元"
							/>
						</a-col>
					</a-row>
				</section>

				<!-- 成员列表 -->
				<section class="detail-section">
					<h3>成员列表 ({{ workspace.members.length }})</h3>
					<a-list
						:data-source="workspace.members"
						:pagination="workspace.members.length > 5 ? { pageSize: 5 } : false"
					>
						<template #renderItem="{ item }">
							<a-list-item>
								<a-list-item-meta>
									<template #avatar>
										<a-avatar :style="{ backgroundColor: '#1890ff' }">
											<template #icon>
												<UserOutlined />
											</template>
										</a-avatar>
									</template>
									<template #title>
										{{ getMemberDisplayName(item) }}
									</template>
									<template #description>
										{{ item.email }}
										<a-tag v-if="item.role" color="blue" size="small" style="margin-left: 8px">
											{{ item.role }}
										</a-tag>
									</template>
								</a-list-item-meta>
							</a-list-item>
						</template>
					</a-list>
				</section>

				<!-- 最近充值记录 -->
				<section class="detail-section">
					<div class="section-header">
						<h3>最近充值记录</h3>
					</div>
					<a-timeline v-if="workspace.recentRecharges.length > 0">
						<a-timeline-item
							v-for="record in workspace.recentRecharges"
							:key="record.id"
							:color="getRechargeStatusColor(record.status)"
						>
							<template #dot>
								<CheckCircleOutlined v-if="record.status === 'completed'" />
								<ClockCircleOutlined v-else-if="record.status === 'pending'" />
								<CloseCircleOutlined v-else />
							</template>
							<div class="timeline-content">
								<div class="timeline-header">
									<span class="timeline-amount">{{ formatCurrency(record.amount) }}</span>
									<a-tag v-if="record.isAdminRecharge" color="orange">管理员充值</a-tag>
									<a-tag :color="getRechargeStatusColor(record.status)">
										{{ getRechargeStatusLabel(record.status) }}
									</a-tag>
								</div>
								<div class="timeline-meta">
									<span>{{ formatDate(record.createdAt) }}</span>
									<span v-if="record.paymentMethod"> | {{ record.paymentMethod }}</span>
								</div>
							</div>
						</a-timeline-item>
					</a-timeline>
					<a-empty v-else description="暂无充值记录" />
				</section>

				<!-- 操作按钮 -->
				<section class="detail-section">
					<a-space>
						<a-button type="primary" @click="handleRecharge">
							<template #icon>
								<DollarOutlined />
							</template>
							充值
						</a-button>
						<a-button @click="handleViewUsageRecords">
							<template #icon>
								<BarChartOutlined />
							</template>
							查看完整消费记录
						</a-button>
					</a-space>
				</section>
			</div>
		</a-spin>

		<!-- 充值弹窗 -->
		<RechargeDialog
			v-model:open="rechargeDialogVisible"
			:workspace-id="workspaceId"
			:workspace-name="workspace?.workspace.name || ''"
			:current-balance="workspace?.balance.current"
			@success="handleRechargeSuccess"
		/>
	</a-drawer>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
	UserOutlined,
	TeamOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CloseCircleOutlined,
	DollarOutlined,
	BarChartOutlined,
} from '@ant-design/icons-vue';
import { formatDate, formatCurrency } from '@n8n/shared';
import { useWorkspacesStore } from '@/stores/workspaces.store';
import RechargeDialog from './RechargeDialog.vue';
import type { WorkspaceMember } from '@/types/admin.types';

interface Props {
	open: boolean;
	workspaceId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	'update:open': [value: boolean];
	'view-usage-records': [workspaceId: string];
}>();

const workspacesStore = useWorkspacesStore();
const loading = ref(false);
const rechargeDialogVisible = ref(false);

const workspace = computed(() => workspacesStore.currentWorkspace);

const getBalanceColor = (balance: number): string => {
	if (balance < 100) return '#f5222d';
	if (balance < 1000) return '#fa8c16';
	return '#52c41a';
};

const getTotalRecharged = (): number => {
	if (!workspace.value) return 0;
	return workspace.value.recentRecharges
		.filter((r) => r.status === 'completed')
		.reduce((sum, r) => sum + r.amount, 0);
};

const getMemberDisplayName = (member: WorkspaceMember): string => {
	if (member.firstName && member.lastName) {
		return `${member.firstName} ${member.lastName}`;
	}
	return member.email;
};

const getRechargeStatusColor = (status: string): string => {
	const colors: Record<string, string> = {
		completed: 'green',
		pending: 'orange',
		failed: 'red',
	};
	return colors[status] || 'gray';
};

const getRechargeStatusLabel = (status: string): string => {
	const labels: Record<string, string> = {
		completed: '已完成',
		pending: '处理中',
		failed: '失败',
	};
	return labels[status] || status;
};

const handleRecharge = (): void => {
	rechargeDialogVisible.value = true;
};

const handleRechargeSuccess = async (): Promise<void> => {
	// 刷新详情
	await loadWorkspaceDetail();
};

const handleViewUsageRecords = (): void => {
	emit('view-usage-records', props.workspaceId);
};

const handleClose = (): void => {
	emit('update:open', false);
};

const loadWorkspaceDetail = async (): Promise<void> => {
	if (!props.workspaceId) return;

	loading.value = true;
	try {
		await workspacesStore.getWorkspaceDetail(props.workspaceId);
	} catch (error) {
		console.error('Failed to load workspace detail:', error);
	} finally {
		loading.value = false;
	}
};

// 当抽屉打开时加载详情
watch(
	() => props.open,
	async (newValue) => {
		if (newValue) {
			await loadWorkspaceDetail();
		} else {
			// 关闭时清空数据
			workspacesStore.clearCurrentWorkspace();
		}
	},
	{ immediate: true },
);
</script>

<style scoped lang="scss">
.workspace-detail {
	.detail-section {
		margin-bottom: 24px;

		&:last-child {
			margin-bottom: 0;
		}

		h3 {
			font-size: 16px;
			font-weight: 600;
			margin-bottom: 16px;
			color: var(--admin-text-primary);
		}

		.section-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16px;
		}
	}

	.timeline-content {
		.timeline-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 4px;

			.timeline-amount {
				font-size: 16px;
				font-weight: 600;
				color: var(--admin-text-primary);
			}
		}

		.timeline-meta {
			font-size: 12px;
			color: var(--admin-text-secondary);
		}
	}
}
</style>
