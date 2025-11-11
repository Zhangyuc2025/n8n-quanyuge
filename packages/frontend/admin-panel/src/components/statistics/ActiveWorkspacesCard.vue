<template>
	<div class="active-workspaces-card">
		<h3 class="card-title">活跃工作空间</h3>
		<a-list :loading="loading" :data-source="workspaces" size="large">
			<template #renderItem="{ item, index }">
				<a-list-item class="workspace-item">
					<div class="workspace-content">
						<div class="workspace-header">
							<div class="workspace-rank">
								<a-tag :color="getRankColor(index)">TOP {{ index + 1 }}</a-tag>
							</div>
							<div class="workspace-name">{{ item.workspaceName }}</div>
						</div>

						<div class="workspace-stats">
							<div class="stat-item">
								<span class="stat-label">总消费</span>
								<span class="stat-value total-spent">¥{{ item.totalSpent.toFixed(2) }}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">当前余额</span>
								<span class="stat-value balance">¥{{ item.currentBalance.toFixed(2) }}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">调用次数</span>
								<span class="stat-value calls">{{ item.totalCalls.toLocaleString('zh-CN') }}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">平均单价</span>
								<span class="stat-value avg">¥{{ item.avgSpentPerCall.toFixed(4) }}</span>
							</div>
						</div>
					</div>
				</a-list-item>
			</template>

			<template #loadMore>
				<div v-if="!loading && workspaces.length === 0" class="empty-state">
					<a-empty description="暂无活跃工作空间数据" />
				</div>
			</template>
		</a-list>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ActiveWorkspace } from '@/types/admin.types';

interface Props {
	data: ActiveWorkspace[];
	loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
});

const workspaces = computed(() => props.data);

const getRankColor = (index: number): string => {
	if (index === 0) return 'gold';
	if (index === 1) return 'silver';
	if (index === 2) return 'bronze';
	return 'blue';
};
</script>

<style scoped lang="scss">
.active-workspaces-card {
	width: 100%;
}

.card-title {
	margin: 0 0 var(--admin-spacing-md);
	font-size: var(--admin-font-size-lg);
	font-weight: var(--admin-font-weight-bold);
}

.workspace-item {
	border-radius: var(--admin-radius);
	transition: all 0.3s ease;

	&:hover {
		background: var(--admin-color-bg-hover);
	}
}

.workspace-content {
	width: 100%;
}

.workspace-header {
	display: flex;
	align-items: center;
	gap: var(--admin-spacing-sm);
	margin-bottom: var(--admin-spacing-md);
}

.workspace-rank {
	flex-shrink: 0;
}

.workspace-name {
	font-size: var(--admin-font-size-lg);
	font-weight: var(--admin-font-weight-bold);
	color: var(--admin-color-text);
}

.workspace-stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: var(--admin-spacing-md);
}

.stat-item {
	display: flex;
	flex-direction: column;
	gap: var(--admin-spacing-3xs);
}

.stat-label {
	font-size: var(--admin-font-size-xs);
	color: var(--admin-color-text-secondary);
}

.stat-value {
	font-size: var(--admin-font-size-md);
	font-weight: var(--admin-font-weight-bold);

	&.total-spent {
		color: var(--admin-color-danger);
	}

	&.balance {
		color: var(--admin-color-success);
	}

	&.calls {
		color: var(--admin-color-primary);
	}

	&.avg {
		color: var(--admin-color-warning);
	}
}

.empty-state {
	padding: var(--admin-spacing-xl) 0;
	text-align: center;
}

:deep(.ant-list-item) {
	padding: var(--admin-spacing-md);
}
</style>
