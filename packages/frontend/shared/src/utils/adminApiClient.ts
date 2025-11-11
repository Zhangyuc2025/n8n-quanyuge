/**
 * Admin API Client
 * Axios instance for admin panel requests
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

class AdminApiClient {
	private instance: AxiosInstance;

	constructor() {
		this.instance = axios.create({
			baseURL: '/rest',
			timeout: 30000,
			withCredentials: true,
			headers: {
				'Content-Type': 'application/json',
				'X-Admin-Request': 'true', // Mark as admin request
			},
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		// Request interceptor
		this.instance.interceptors.request.use(
			(config) => {
				// Add timestamp to prevent caching
				if (config.method === 'get') {
					config.params = {
						...config.params,
						_t: Date.now(),
					};
				}
				return config;
			},
			(error) => Promise.reject(error),
		);

		// Response interceptor
		this.instance.interceptors.response.use(
			(response: AxiosResponse) => {
				// Backend wraps responses in {data: actualData} format
				// Automatically unwrap for convenience
				if (response.data && typeof response.data === 'object' && 'data' in response.data) {
					response.data = response.data.data;
				}
				return response;
			},
			(error) => {
				// Handle 403 - Redirect to login
				if (error.response?.status === 403) {
					window.location.href = '/admin/login';
				}

				// Handle 401 - Session expired
				if (error.response?.status === 401) {
					window.location.href = '/admin/login?reason=expired';
				}

				return Promise.reject(error);
			},
		);
	}

	async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.instance.get<T>(url, config);
	}

	async post<T = any>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig,
	): Promise<AxiosResponse<T>> {
		return this.instance.post<T>(url, data, config);
	}

	async put<T = any>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig,
	): Promise<AxiosResponse<T>> {
		return this.instance.put<T>(url, data, config);
	}

	async patch<T = any>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig,
	): Promise<AxiosResponse<T>> {
		return this.instance.patch<T>(url, data, config);
	}

	async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.instance.delete<T>(url, config);
	}
}

export const adminApiClient = new AdminApiClient();
