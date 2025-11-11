/**
 * Admin API composable
 * Provides reactive state management for API requests
 */

import { ref, type Ref } from 'vue';
import { adminApiClient } from '../utils/adminApiClient';
import type { AxiosRequestConfig } from 'axios';

export interface UseAdminApiReturn<T> {
	data: Ref<T | null>;
	loading: Ref<boolean>;
	error: Ref<Error | null>;
	fetchData: (params?: Record<string, any>) => Promise<T>;
	refetch: () => Promise<T>;
}

export function useAdminApi<T = any>(
	endpoint: string,
	options: AxiosRequestConfig = {},
): UseAdminApiReturn<T> {
	const data = ref<T | null>(null) as Ref<T | null>;
	const loading = ref(false);
	const error = ref<Error | null>(null);
	let lastParams: Record<string, any> | undefined;

	const fetchData = async (params?: Record<string, any>): Promise<T> => {
		loading.value = true;
		error.value = null;
		lastParams = params;

		try {
			const response = await adminApiClient.get<T>(endpoint, {
				...options,
				params: {
					...options.params,
					...params,
				},
			});

			data.value = response.data;
			return response.data;
		} catch (e) {
			error.value = e as Error;
			throw e;
		} finally {
			loading.value = false;
		}
	};

	const refetch = (): Promise<T> => {
		return fetchData(lastParams);
	};

	return {
		data,
		loading,
		error,
		fetchData,
		refetch,
	};
}

/**
 * POST request
 */
export function useAdminPost<T = any, D = any>(endpoint: string) {
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const postData = async (data: D): Promise<T> => {
		loading.value = true;
		error.value = null;

		try {
			const response = await adminApiClient.post<T>(endpoint, data);
			return response.data;
		} catch (e) {
			error.value = e as Error;
			throw e;
		} finally {
			loading.value = false;
		}
	};

	return {
		loading,
		error,
		postData,
	};
}

/**
 * PATCH request
 */
export function useAdminPatch<T = any, D = any>(endpoint: string) {
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const patchData = async (data: D): Promise<T> => {
		loading.value = true;
		error.value = null;

		try {
			const response = await adminApiClient.patch<T>(endpoint, data);
			return response.data;
		} catch (e) {
			error.value = e as Error;
			throw e;
		} finally {
			loading.value = false;
		}
	};

	return {
		loading,
		error,
		patchData,
	};
}

/**
 * DELETE request
 */
export function useAdminDelete<T = any>(endpoint: string) {
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const deleteData = async (): Promise<T> => {
		loading.value = true;
		error.value = null;

		try {
			const response = await adminApiClient.delete<T>(endpoint);
			return response.data;
		} catch (e) {
			error.value = e as Error;
			throw e;
		} finally {
			loading.value = false;
		}
	};

	return {
		loading,
		error,
		deleteData,
	};
}
