<template>
	<div class="statistics-view">
		<div class="view-header">
			<h2 class="page-title">平台统计</h2>
			<a-button type="primary" :loading="loading" @click="handleRefresh">
				<template #icon>
					<ReloadOutlined />
				</template>
				刷新数据
			</a-button>
		</div>

		<!-- 区域 1: 概览统计卡片 -->
		<a-skeleton v-if="loading && !overview" active :paragraph="{ rows: 4 }" />
		<a-row v-else :gutter="[16, 16]" class="overview-section">
			<a-col :xs="24" :sm="12" :lg="6">
				<StatisticsCard
					title="总工作空间"
					:value="overview?.totalWorkspaces ?? 0"
					icon="team"
					:trend="overview?.trends?.workspaces"
					format="number"
					gradient="blue"
				/>
			</a-col>
			<a-col :xs="24" :sm="12" :lg="6">
				<StatisticsCard
					title="总用户数"
					:value="overview?.totalUsers ?? 0"
					icon="user"
					:trend="overview?.trends?.users"
					format="number"
					gradient="green"
				/>
			</a-col>
			<a-col :xs="24" :sm="12" :lg="6">
				<StatisticsCard
					title="平台总余额"
					:value="overview?.totalBalance ?? 0"
					icon="wallet"
					format="currency"
					gradient="orange"
				/>
			</a-col>
			<a-col :xs="24" :sm="12" :lg="6">
				<StatisticsCard
					title="今日营收"
					:value="overview?.todayRevenue ?? 0"
					icon="dollar"
					:trend="overview?.trends?.revenue"
					format="currency"
					gradient="purple"
				/>
			</a-col>
		</a-row>

		<!-- 区域 2: 营收分析 -->
		<a-row :gutter="[16, 16]" class="revenue-section">
			<!-- 左侧: 营收趋势图 -->
			<a-col :xs="24" :lg="14">
				<a-card :bordered="false" class="chart-card">
					<RevenueChart :data="revenueData" :loading="loading" @date-change="handleDateChange" />
				</a-card>
			</a-col>

			<!-- 右侧: 营收统计卡片 -->
			<a-col :xs="24" :lg="10">
				<a-card :bordered="false" class="revenue-stats-card">
					<h3 class="section-title">营收统计</h3>
					<a-skeleton v-if="loading && !revenueData" active :paragraph="{ rows: 6 }" />
					<div v-else class="revenue-stats">
						<div class="stat-row">
							<span class="stat-label">总营收</span>
							<span class="stat-value primary"
								>¥{{ revenueData?.totalRevenue.toFixed(2) ?? '0.00' }}</span
							>
						</div>
						<a-divider />
						<div class="stat-row">
							<span class="stat-label">平均每日营收</span>
							<span class="stat-value"
								>¥{{ revenueData?.avgRevenuePerDay.toFixed(2) ?? '0.00' }}</span
							>
						</div>
						<div class="stat-row">
							<span class="stat-label">总调用次数</span>
							<span class="stat-value">{{
								revenueData?.totalCalls.toLocaleString('zh-CN') ?? '0'
							}}</span>
						</div>
						<div class="stat-row">
							<span class="stat-label">总 Token 消耗</span>
							<span class="stat-value">{{
								revenueData?.totalTokens.toLocaleString('zh-CN') ?? '0'
							}}</span>
						</div>
						<a-divider />
						<div class="stat-row">
							<span class="stat-label">平均每次调用</span>
							<span class="stat-value"
								>¥{{ revenueData?.avgRevenuePerCall.toFixed(4) ?? '0.0000' }}</span
							>
						</div>
						<div class="stat-row">
							<span class="stat-label">统计周期</span>
							<span class="stat-value">{{ revenueData?.dateRange.days ?? 0 }} 天</span>
						</div>
					</div>
				</a-card>
			</a-col>
		</a-row>

		<!-- 区域 3: 服务与用户分析 -->
		<a-row :gutter="[16, 16]" class="analysis-section">
			<!-- 左侧: 热门服务排行 -->
			<a-col :xs="24" :lg="12">
				<a-card :bordered="false" class="ranking-card">
					<ServiceRankingTable :data="popularServices" :loading="loading" />
				</a-card>
			</a-col>

			<!-- 右侧: 活跃工作空间排行 -->
			<a-col :xs="24" :lg="12">
				<a-card :bordered="false" class="workspaces-card">
					<ActiveWorkspacesCard :data="activeWorkspaces" :loading="loading" />
				</a-card>
			</a-col>
		</a-row>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { useStatisticsStore } from '@/stores/statistics.store';
import StatisticsCard from '@/components/statistics/StatisticsCard.vue';
import RevenueChart from '@/components/statistics/RevenueChart.vue';
import ServiceRankingTable from '@/components/statistics/ServiceRankingTable.vue';
import ActiveWorkspacesCard from '@/components/statistics/ActiveWorkspacesCard.vue';

const statisticsStore = useStatisticsStore();

const loading = computed(() => statisticsStore.loading);
const overview = computed(() => statisticsStore.overview);
const revenueData = computed(() => statisticsStore.revenueData);
const popularServices = computed(() => statisticsStore.popularServices);
const activeWorkspaces = computed(() => statisticsStore.activeWorkspaces);

const handleRefresh = async () => {
	try {
		await statisticsStore.refreshAll();
		message.success('数据刷新成功');
	} catch (error) {
		message.error('数据刷新失败，请重试');
		console.error('Refresh error:', error);
	}
};

const handleDateChange = async (dateRange: { startDate: string; endDate: string }) => {
	try {
		await statisticsStore.fetchRevenue(dateRange);
	} catch (error) {
		message.error('获取营收数据失败');
		console.error('Fetch revenue error:', error);
	}
};

onMounted(async () => {
	try {
		await statisticsStore.refreshAll();
	} catch (error) {
		message.error('加载统计数据失败');
		console.error('Load statistics error:', error);
	}
});
</script>

<style scoped lang="scss">
.statistics-view {
	padding: var(--admin-spacing-lg);
	background: var(--admin-color-bg-layout);
	min-height: 100vh;
}

.view-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--admin-spacing-xl);
}

.page-title {
	margin: 0;
	font-size: var(--admin-font-size-2xl);
	font-weight: var(--admin-font-weight-bold);
	color: var(--admin-color-text);
}

.overview-section {
	margin-bottom: var(--admin-spacing-xl);
}

.revenue-section {
	margin-bottom: var(--admin-spacing-xl);
}

.analysis-section {
	margin-bottom: var(--admin-spacing-xl);
}

.chart-card {
	height: 400px;

	:deep(.ant-card-body) {
		height: 100%;
		padding: var(--admin-spacing-lg);
	}
}

.revenue-stats-card {
	height: 400px;
	overflow-y: auto;

	:deep(.ant-card-body) {
		padding: var(--admin-spacing-lg);
	}
}

.section-title {
	margin: 0 0 var(--admin-spacing-md);
	font-size: var(--admin-font-size-lg);
	font-weight: var(--admin-font-weight-bold);
}

.revenue-stats {
	display: flex;
	flex-direction: column;
	gap: var(--admin-spacing-sm);
}

.stat-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--admin-spacing-xs) 0;
}

.stat-label {
	font-size: var(--admin-font-size-sm);
	color: var(--admin-color-text-secondary);
}

.stat-value {
	font-size: var(--admin-font-size-md);
	font-weight: var(--admin-font-weight-bold);
	color: var(--admin-color-text);

	&.primary {
		font-size: var(--admin-font-size-xl);
		color: var(--admin-color-primary);
	}
}

.ranking-card,
.workspaces-card {
	:deep(.ant-card-body) {
		padding: var(--admin-spacing-lg);
	}
}

// 响应式布局
@media (max-width: 768px) {
	.statistics-view {
		padding: var(--admin-spacing-md);
	}

	.view-header {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--admin-spacing-md);
	}

	.page-title {
		font-size: var(--admin-font-size-xl);
	}

	.chart-card,
	.revenue-stats-card {
		height: auto;
		min-height: 300px;
	}
}
</style>
