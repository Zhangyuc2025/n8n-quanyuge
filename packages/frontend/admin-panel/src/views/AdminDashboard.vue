<template>
	<div class="admin-dashboard">
		<!-- Welcome Section -->
		<div class="dashboard-header">
			<div>
				<h1>欢迎回到全域阁管理后台</h1>
				<p>当前登录：{{ adminDisplayName }}</p>
			</div>
		</div>

		<!-- Statistics Cards -->
		<a-spin :spinning="loading" tip="加载中...">
			<a-row :gutter="[16, 16]" class="statistics-section">
				<a-col :xs="24" :sm="12" :lg="6">
					<StatisticsCard
						title="总工作空间"
						:value="overview?.totalWorkspaces || 0"
						:icon="TeamOutlined"
						iconColor="#1890ff"
						iconBgColor="#e6f7ff"
					/>
				</a-col>
				<a-col :xs="24" :sm="12" :lg="6">
					<StatisticsCard
						title="总用户数"
						:value="overview?.totalUsers || 0"
						:icon="UserOutlined"
						iconColor="#52c41a"
						iconBgColor="#f6ffed"
					/>
				</a-col>
				<a-col :xs="24" :sm="12" :lg="6">
					<StatisticsCard
						title="总余额"
						:value="overview?.totalBalance || 0"
						prefix="¥"
						:precision="2"
						:icon="WalletOutlined"
						iconColor="#faad14"
						iconBgColor="#fffbe6"
					/>
				</a-col>
				<a-col :xs="24" :sm="12" :lg="6">
					<StatisticsCard
						title="今日营收"
						:value="overview?.todayRevenue || 0"
						prefix="¥"
						:precision="2"
						:icon="RiseOutlined"
						iconColor="#f5222d"
						iconBgColor="#fff1f0"
					/>
				</a-col>
			</a-row>
		</a-spin>

		<!-- Charts Section -->
		<!-- TODO: 实现图表组件 LineChart 和 BarChart -->
		<!--
    <a-row :gutter="[16, 16]" class="charts-section">
      <a-col :xs="24" :lg="16">
        <a-card title="最近 7 天营收趋势" :bordered="false" :loading="loading">
          <a-empty description="图表功能待实现" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8">
        <a-card title="热门服务 Top 5" :bordered="false" :loading="loading">
          <a-empty description="图表功能待实现" />
        </a-card>
      </a-col>
    </a-row>
    -->

		<!-- Quick Actions -->
		<a-card title="快速操作" :bordered="false" class="quick-actions-section">
			<a-row :gutter="[16, 16]">
				<a-col :xs="24" :sm="12" :md="6">
					<a-button type="primary" size="large" block @click="navigateTo('/admin/platform-nodes')">
						<template #icon>
							<AppstoreOutlined />
						</template>
						平台节点管理
					</a-button>
				</a-col>
				<a-col :xs="24" :sm="12" :md="6">
					<a-button type="primary" size="large" block @click="navigateTo('/admin/ai-providers')">
						<template #icon>
							<RobotOutlined />
						</template>
						AI 服务商管理
					</a-button>
				</a-col>
				<a-col :xs="24" :sm="12" :md="6">
					<a-button type="primary" size="large" block @click="navigateTo('/admin/workspaces')">
						<template #icon>
							<TeamOutlined />
						</template>
						工作空间管理
					</a-button>
				</a-col>
				<a-col :xs="24" :sm="12" :md="6">
					<a-button type="primary" size="large" block @click="navigateTo('/admin/statistics')">
						<template #icon>
							<BarChartOutlined />
						</template>
						数据统计
					</a-button>
				</a-col>
			</a-row>
		</a-card>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
	AppstoreOutlined,
	RobotOutlined,
	TeamOutlined,
	BarChartOutlined,
	UserOutlined,
	WalletOutlined,
	RiseOutlined,
} from '@ant-design/icons-vue';
import { useAdminAuthStore } from '@/stores/adminAuth.store';
import { adminApiClient, useAdminNotification } from '@n8n/shared';
import StatisticsCard from '@/components/StatisticsCard.vue';
import type { StatisticsOverview } from '@/types/admin.types';

const router = useRouter();
const adminAuthStore = useAdminAuthStore();
const notification = useAdminNotification();

const loading = ref(false);
const overview = ref<StatisticsOverview | null>(null);

const adminDisplayName = computed(() => adminAuthStore.adminDisplayName);

const navigateTo = (path: string) => {
	router.push(path);
};

const fetchOverview = async () => {
	console.log('[Dashboard] 开始获取概览数据...');
	try {
		const response = await adminApiClient.get('/admin/stats/overview');
		console.log('[Dashboard] API 响应:', response);
		console.log('[Dashboard] 响应数据:', response.data);
		overview.value = response.data;
		console.log('[Dashboard] overview.value 已设置:', overview.value);
	} catch (error: any) {
		console.error('[Dashboard] 获取概览数据失败:', error);
		console.error('[Dashboard] 错误详情:', {
			status: error.response?.status,
			statusText: error.response?.statusText,
			data: error.response?.data,
		});
		notification.error({
			message: '获取概览数据失败',
			description: error.response?.data?.message || error.message,
		});
	}
};

const loadDashboardData = async () => {
	console.log('[Dashboard] loadDashboardData 开始执行');
	loading.value = true;
	try {
		await fetchOverview();
		console.log('[Dashboard] 数据加载完成');
	} catch (error: any) {
		console.error('[Dashboard] 加载仪表板数据失败:', error);
	} finally {
		loading.value = false;
		console.log('[Dashboard] loading 状态设置为 false');
	}
};

onMounted(() => {
	console.log('[Dashboard] 组件已挂载，开始加载数据');
	console.log('[Dashboard] 管理员信息:', adminAuthStore.admin);
	console.log('[Dashboard] 是否已认证:', adminAuthStore.isAuthenticated);
	loadDashboardData();
});
</script>

<style scoped lang="scss">
.admin-dashboard {
	padding: var(--admin-spacing-lg);
}

.dashboard-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--admin-spacing-xl);

	h1 {
		font-size: 28px;
		font-weight: 600;
		margin: 0 0 var(--admin-spacing-xs) 0;
		color: var(--admin-text-primary);
	}

	p {
		font-size: 14px;
		color: var(--admin-text-secondary);
		margin: 0;
	}
}

.statistics-section {
	margin-bottom: var(--admin-spacing-xl);
}

.charts-section {
	margin-bottom: var(--admin-spacing-xl);

	:deep(.ant-card) {
		height: 100%;
	}

	:deep(.ant-card-head-title) {
		font-size: 16px;
		font-weight: 600;
	}
}

.quick-actions-section {
	:deep(.ant-card-head-title) {
		font-size: 16px;
		font-weight: 600;
	}

	:deep(.ant-btn) {
		height: 48px;
		font-size: 15px;
		font-weight: 500;

		.anticon {
			font-size: 18px;
		}
	}
}
</style>
