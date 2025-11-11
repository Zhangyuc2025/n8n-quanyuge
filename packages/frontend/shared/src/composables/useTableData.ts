/**
 * Table data management composable
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { PaginationParams } from '../types/admin.types';

export interface UseTableDataOptions {
	defaultPage?: number;
	defaultLimit?: number;
	defaultSortBy?: string;
	defaultSortOrder?: 'ASC' | 'DESC';
}

export interface UseTableDataReturn {
	page: Ref<number>;
	limit: Ref<number>;
	sortBy: Ref<string>;
	sortOrder: Ref<'ASC' | 'DESC'>;
	search: Ref<string>;
	params: ComputedRef<PaginationParams>;
	setPage: (newPage: number) => void;
	setLimit: (newLimit: number) => void;
	setSort: (field: string, order: 'ASC' | 'DESC') => void;
	setSearch: (query: string) => void;
	reset: () => void;
}

export function useTableData(options: UseTableDataOptions = {}): UseTableDataReturn {
	const {
		defaultPage = 1,
		defaultLimit = 10,
		defaultSortBy = 'createdAt',
		defaultSortOrder = 'DESC',
	} = options;

	const page = ref(defaultPage);
	const limit = ref(defaultLimit);
	const sortBy = ref(defaultSortBy);
	const sortOrder = ref<'ASC' | 'DESC'>(defaultSortOrder);
	const search = ref('');

	const params = computed<PaginationParams>(() => ({
		page: page.value,
		limit: limit.value,
		sortBy: sortBy.value,
		sortOrder: sortOrder.value,
		...(search.value ? { search: search.value } : {}),
	}));

	const setPage = (newPage: number): void => {
		page.value = newPage;
	};

	const setLimit = (newLimit: number): void => {
		limit.value = newLimit;
		page.value = 1; // Reset to first page
	};

	const setSort = (field: string, order: 'ASC' | 'DESC'): void => {
		sortBy.value = field;
		sortOrder.value = order;
		page.value = 1; // Reset to first page
	};

	const setSearch = (query: string): void => {
		search.value = query;
		page.value = 1; // Reset to first page
	};

	const reset = (): void => {
		page.value = defaultPage;
		limit.value = defaultLimit;
		sortBy.value = defaultSortBy;
		sortOrder.value = defaultSortOrder;
		search.value = '';
	};

	return {
		page,
		limit,
		sortBy,
		sortOrder,
		search,
		params,
		setPage,
		setLimit,
		setSort,
		setSearch,
		reset,
	};
}
