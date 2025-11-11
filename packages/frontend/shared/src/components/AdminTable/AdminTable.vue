<template>
	<div class="admin-table">
		<div v-if="showSearch || showActions" class="admin-table__header">
			<div v-if="showSearch" class="admin-table__search">
				<a-input-search
					v-model:value="searchQuery"
					:placeholder="searchPlaceholder"
					:loading="loading"
					@search="handleSearch"
				/>
			</div>
			<div v-if="showActions" class="admin-table__actions">
				<slot name="actions" />
			</div>
		</div>

		<a-table
			:columns="columns"
			:data-source="dataSource"
			:loading="loading"
			:pagination="paginationConfig"
			:row-key="rowKey"
			:scroll="scroll"
			@change="handleTableChange"
		>
			<template
				v-for="column in columns"
				:key="column.key"
				#[`bodyCell`]="{ column: col, record, index }"
			>
				<slot
					v-if="col.key === column.key && column.customRender"
					:name="`cell-${column.key as string}`"
					:record="record"
					:value="record[(column.dataIndex as string) || (column.key as string)]"
					:index="index"
				/>
			</template>
		</a-table>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TableProps, TableColumnType } from 'ant-design-vue';

interface Props {
	columns: TableColumnType[];
	dataSource: any[];
	loading?: boolean;
	pagination?:
		| {
				current: number;
				pageSize: number;
				total: number;
		  }
		| false;
	rowKey?: string | ((record: any) => string);
	scroll?: { x?: number | string; y?: number | string };
	showSearch?: boolean;
	searchPlaceholder?: string;
	showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
	pagination: () => ({ current: 1, pageSize: 10, total: 0 }),
	rowKey: 'id',
	scroll: undefined,
	showSearch: false,
	searchPlaceholder: '搜索...',
	showActions: false,
});

const emit = defineEmits<{
	search: [query: string];
	change: [pagination: any, filters: any, sorter: any];
}>();

const searchQuery = ref('');

const paginationConfig = computed(() => {
	if (props.pagination === false) return false;

	return {
		current: props.pagination.current,
		pageSize: props.pagination.pageSize,
		total: props.pagination.total,
		showSizeChanger: true,
		showQuickJumper: true,
		showTotal: (total: number) => `共 ${total} 条`,
		pageSizeOptions: ['10', '20', '50', '100'],
	};
});

const handleSearch = (): void => {
	emit('search', searchQuery.value);
};

const handleTableChange: TableProps['onChange'] = (pagination, filters, sorter): void => {
	emit('change', pagination, filters, sorter);
};

// Auto-search on input change (debounced)
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
	if (searchTimeout) clearTimeout(searchTimeout);
	searchTimeout = setTimeout(() => {
		handleSearch();
	}, 500);
});
</script>

<style scoped lang="scss">
.admin-table {
	width: 100%;

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		gap: 16px;
	}

	&__search {
		flex: 1;
		max-width: 400px;
	}

	&__actions {
		display: flex;
		gap: 8px;
	}
}
</style>
