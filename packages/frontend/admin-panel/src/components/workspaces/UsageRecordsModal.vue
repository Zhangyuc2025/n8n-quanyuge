<template>
	<a-modal
		:open="open"
		:title="`消费记录 - ${workspaceName}`"
		:width="1000"
		:footer="null"
		@cancel="handleClose"
	>
		<div class="usage-records-modal">
			<!-- 日期筛选 -->
			<div class="filter-section">
				<a-space>
					<a-range-picker
						v-model:value="dateRange"
						:placeholder="['开始日期', '结束日期']"
						format="YYYY-MM-DD"
						@change="handleDateRangeChange"
					/>
					<a-button @click="handleResetFilters">重置</a-button>
				</a-space>
			</div>

			<!-- 数据表格 -->
			<a-table
				:columns="columns"
				:data-source="records"
				:loading="loading"
				:pagination="paginationConfig"
				:scroll="{ x: 800 }"
				@change="handleTableChange"
				row-key="id"
			>
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'timestamp'">
						{{ formatDate(record.timestamp) }}
					</template>
					<template v-else-if="column.key === 'serviceType'">
						<a-tag color="blue">{{ record.serviceType }}</a-tag>
					</template>
					<template v-else-if="column.key === 'amountCny'">
						<span :style="{ color: '#f5222d', fontWeight: 600 }">
							{{ formatCurrency(record.amountCny) }}
						</span>
					</template>
					<template v-else-if="column.key === 'tokens'">
						{{ formatNumber(record.tokens || 0) }}
					</template>
					<template v-else-if="column.key === 'calls'">
						{{ formatNumber(record.calls || 0) }}
					</template>
				</template>
			</a-table>

			<!-- 统计信息 -->
			<div v-if="records.length > 0" class="summary-section">
				<a-statistic-group>
					<a-row :gutter="16">
						<a-col :span="8">
							<a-statistic
								title="总消费金额"
								:value="getTotalAmount()"
								:precision="2"
								suffix="元"
								:value-style="{ color: '#f5222d' }"
							/>
						</a-col>
						<a-col :span="8">
							<a-statistic title="总消费次数" :value="records.length" suffix="次" />
						</a-col>
						<a-col :span="8">
							<a-statistic
								title="平均单次消费"
								:value="getAverageAmount()"
								:precision="2"
								suffix="元"
							/>
						</a-col>
					</a-row>
				</a-statistic-group>
			</div>
		</div>
	</a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Dayjs } from 'dayjs';
import { formatDate, formatCurrency, formatNumber } from '@n8n/shared';
import { useWorkspacesStore } from '@/stores/workspaces.store';
import type { TableColumnType } from 'ant-design-vue';

interface Props {
	open: boolean;
	workspaceId: string;
	workspaceName: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const workspacesStore = useWorkspacesStore();
const loading = ref(false);
const dateRange = ref<[Dayjs, Dayjs] | null>(null);
const currentPage = ref(1);
const pageSize = ref(20);

const records = computed(() => workspacesStore.usageRecords);

const columns: TableColumnType[] = [
	{
		title: '时间',
		dataIndex: 'timestamp',
		key: 'timestamp',
		width: 180,
		sorter: true,
	},
	{
		title: '服务类型',
		dataIndex: 'serviceType',
		key: 'serviceType',
		width: 120,
	},
	{
		title: '服务 Key',
		dataIndex: 'serviceKey',
		key: 'serviceKey',
		width: 200,
		ellipsis: true,
	},
	{
		title: '消费金额',
		dataIndex: 'amountCny',
		key: 'amountCny',
		width: 120,
		sorter: true,
		align: 'right',
	},
	{
		title: 'Tokens',
		dataIndex: 'tokens',
		key: 'tokens',
		width: 100,
		align: 'right',
	},
	{
		title: '调用次数',
		dataIndex: 'calls',
		key: 'calls',
		width: 100,
		align: 'right',
	},
];

const paginationConfig = computed(() => ({
	current: currentPage.value,
	pageSize: pageSize.value,
	total: records.value.length,
	showSizeChanger: true,
	showQuickJumper: true,
	showTotal: (total: number) => `共 ${total} 条`,
	pageSizeOptions: ['10', '20', '50', '100'],
}));

const getTotalAmount = (): number => {
	return records.value.reduce((sum, record) => sum + record.amountCny, 0);
};

const getAverageAmount = (): number => {
	if (records.value.length === 0) return 0;
	return getTotalAmount() / records.value.length;
};

const handleDateRangeChange = async (): Promise<void> => {
	await loadUsageRecords();
};

const handleResetFilters = async (): Promise<void> => {
	dateRange.value = null;
	currentPage.value = 1;
	await loadUsageRecords();
};

const handleTableChange = async (pagination: any): Promise<void> => {
	currentPage.value = pagination.current;
	pageSize.value = pagination.pageSize;
	await loadUsageRecords();
};

const handleClose = (): void => {
	emit('update:open', false);
};

const loadUsageRecords = async (): Promise<void> => {
	if (!props.workspaceId) return;

	loading.value = true;
	try {
		const params: any = {
			page: currentPage.value,
			limit: pageSize.value,
		};

		if (dateRange.value && dateRange.value.length === 2) {
			params.startDate = dateRange.value[0].startOf('day').toISOString();
			params.endDate = dateRange.value[1].endOf('day').toISOString();
		}

		await workspacesStore.getUsageRecords(props.workspaceId, params);
	} catch (error) {
		console.error('Failed to load usage records:', error);
	} finally {
		loading.value = false;
	}
};

// 当弹窗打开时加载数据
watch(
	() => props.open,
	async (newValue) => {
		if (newValue) {
			currentPage.value = 1;
			dateRange.value = null;
			await loadUsageRecords();
		}
	},
	{ immediate: true },
);
</script>

<style scoped lang="scss">
.usage-records-modal {
	.filter-section {
		margin-bottom: 16px;
	}

	.summary-section {
		margin-top: 16px;
		padding: 16px;
		background-color: var(--admin-bg-secondary);
		border-radius: 4px;
	}
}
</style>
