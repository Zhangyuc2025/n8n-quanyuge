<template>
	<div class="service-ranking-table">
		<h3 class="table-title">热门服务排行</h3>
		<a-table
			:columns="columns"
			:data-source="dataSource"
			:loading="loading"
			:pagination="false"
			size="middle"
			:scroll="{ x: 'max-content' }"
		>
			<template #bodyCell="{ column, record, index }">
				<template v-if="column.key === 'rank'">
					<a-tag :color="getRankColor(index)">{{ index + 1 }}</a-tag>
				</template>

				<template v-else-if="column.key === 'serviceKey'">
					<div class="service-info">
						<span class="service-name">{{ record.serviceKey }}</span>
						<span class="service-type">{{ formatServiceType(record.serviceType) }}</span>
					</div>
				</template>

				<template v-else-if="column.key === 'calls'">
					<span class="number-cell">{{ record.calls.toLocaleString('zh-CN') }}</span>
				</template>

				<template v-else-if="column.key === 'revenue'">
					<span class="currency-cell">¥{{ record.revenue.toFixed(2) }}</span>
				</template>

				<template v-else-if="column.key === 'avgRevenuePerCall'">
					<span class="currency-cell">¥{{ record.avgRevenuePerCall.toFixed(4) }}</span>
				</template>
			</template>
		</a-table>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PopularService } from '@/types/admin.types';

interface Props {
	data: PopularService[];
	loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
});

const columns = [
	{
		title: '排名',
		key: 'rank',
		width: 80,
		align: 'center' as const,
	},
	{
		title: '服务名称',
		key: 'serviceKey',
		width: 200,
	},
	{
		title: '调用次数',
		key: 'calls',
		width: 120,
		align: 'right' as const,
		sorter: (a: PopularService, b: PopularService) => a.calls - b.calls,
	},
	{
		title: '总营收',
		key: 'revenue',
		width: 120,
		align: 'right' as const,
		sorter: (a: PopularService, b: PopularService) => a.revenue - b.revenue,
	},
	{
		title: '平均单价',
		key: 'avgRevenuePerCall',
		width: 120,
		align: 'right' as const,
		sorter: (a: PopularService, b: PopularService) => a.avgRevenuePerCall - b.avgRevenuePerCall,
	},
];

const dataSource = computed(() =>
	props.data.map((item, index) => ({
		...item,
		key: `${item.serviceKey}-${index}`,
	})),
);

const getRankColor = (index: number): string => {
	if (index === 0) return 'gold';
	if (index === 1) return 'silver';
	if (index === 2) return 'bronze';
	return 'default';
};

const formatServiceType = (type: string): string => {
	const typeMap: Record<string, string> = {
		llm: 'AI 模型',
		embedding: '向量化',
		tts: '语音合成',
		stt: '语音识别',
		vision: '图像识别',
		rag: 'RAG 服务',
	};
	return typeMap[type] ?? type;
};
</script>

<style scoped lang="scss">
.service-ranking-table {
	width: 100%;
}

.table-title {
	margin: 0 0 var(--admin-spacing-md);
	font-size: var(--admin-font-size-lg);
	font-weight: var(--admin-font-weight-bold);
}

.service-info {
	display: flex;
	flex-direction: column;
	gap: var(--admin-spacing-3xs);
}

.service-name {
	font-weight: var(--admin-font-weight-bold);
	color: var(--admin-color-text);
}

.service-type {
	font-size: var(--admin-font-size-xs);
	color: var(--admin-color-text-secondary);
}

.number-cell {
	font-weight: var(--admin-font-weight-bold);
	color: var(--admin-color-primary);
}

.currency-cell {
	font-weight: var(--admin-font-weight-bold);
	color: var(--admin-color-success);
}

:deep(.ant-table) {
	background: var(--admin-color-bg-container);

	.ant-table-thead > tr > th {
		background: var(--admin-color-bg-elevated);
		font-weight: var(--admin-font-weight-bold);
	}

	.ant-table-tbody > tr:hover > td {
		background: var(--admin-color-bg-hover);
	}
}
</style>
