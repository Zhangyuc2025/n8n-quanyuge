import { defineStore } from 'pinia';
import { adminApiClient } from '@n8n/shared';
import type { AIProvider, AIProviderFormData } from '@/types/admin.types';

interface AIProvidersState {
	providers: AIProvider[];
	currentProvider: AIProvider | null;
	loading: boolean;
	error: string | null;
}

export const useAIProvidersStore = defineStore('aiProviders', {
	state: (): AIProvidersState => ({
		providers: [],
		currentProvider: null,
		loading: false,
		error: null,
	}),

	actions: {
		/**
		 * 获取所有 AI 服务提供商
		 */
		async fetchProviders(filters?: { isActive?: boolean; enabled?: boolean }): Promise<void> {
			this.loading = true;
			this.error = null;
			try {
				const params = new URLSearchParams();
				if (filters?.isActive !== undefined) {
					params.append('isActive', String(filters.isActive));
				}
				if (filters?.enabled !== undefined) {
					params.append('enabled', String(filters.enabled));
				}

				const queryString = params.toString();
				const url = queryString
					? `/admin/platform-ai-providers?${queryString}`
					: '/admin/platform-ai-providers';

				const response = await adminApiClient.get<AIProvider[]>(url);
				this.providers = response.data;
			} catch (error) {
				this.error = error instanceof Error ? error.message : '获取服务商列表失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取单个 AI 服务提供商详情
		 */
		async getProvider(providerKey: string): Promise<AIProvider> {
			this.loading = true;
			this.error = null;
			try {
				const response = await adminApiClient.get<AIProvider>(
					`/admin/platform-ai-providers/${providerKey}`,
				);
				this.currentProvider = response.data;
				return response.data;
			} catch (error) {
				this.error = error instanceof Error ? error.message : '获取服务商详情失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 创建 AI 服务提供商
		 */
		async createProvider(data: AIProviderFormData): Promise<AIProvider> {
			this.loading = true;
			this.error = null;
			try {
				const response = await adminApiClient.post<AIProvider>(
					'/admin/platform-ai-providers',
					data,
				);
				await this.fetchProviders();
				return response.data;
			} catch (error) {
				this.error = error instanceof Error ? error.message : '创建服务商失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 更新 AI 服务提供商
		 */
		async updateProvider(
			providerKey: string,
			data: Partial<AIProviderFormData>,
		): Promise<AIProvider> {
			this.loading = true;
			this.error = null;
			try {
				const response = await adminApiClient.patch<AIProvider>(
					`/admin/platform-ai-providers/${providerKey}`,
					data,
				);
				await this.fetchProviders();
				return response.data;
			} catch (error) {
				this.error = error instanceof Error ? error.message : '更新服务商失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 停用 AI 服务提供商（软删除）
		 */
		async disableProvider(providerKey: string): Promise<void> {
			this.loading = true;
			this.error = null;
			try {
				await adminApiClient.patch(`/admin/platform-ai-providers/${providerKey}/disable`);
				await this.fetchProviders();
			} catch (error) {
				this.error = error instanceof Error ? error.message : '停用服务商失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 删除 AI 服务提供商（硬删除）
		 */
		async deleteProvider(providerKey: string): Promise<void> {
			this.loading = true;
			this.error = null;
			try {
				await adminApiClient.delete(`/admin/platform-ai-providers/${providerKey}`);
				await this.fetchProviders();
			} catch (error) {
				this.error = error instanceof Error ? error.message : '删除服务商失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 启用/禁用 AI 服务提供商
		 */
		async toggleProvider(providerKey: string, enabled: boolean): Promise<void> {
			this.loading = true;
			this.error = null;
			try {
				await adminApiClient.patch(`/admin/platform-ai-providers/${providerKey}/toggle`, {
					enabled,
				});
				await this.fetchProviders();
			} catch (error) {
				this.error = error instanceof Error ? error.message : '切换服务商状态失败';
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 清除当前选中的 Provider
		 */
		clearCurrentProvider(): void {
			this.currentProvider = null;
		},

		/**
		 * 清除错误状态
		 */
		clearError(): void {
			this.error = null;
		},
	},

	getters: {
		/**
		 * 获取启用的服务商列表
		 */
		enabledProviders(): AIProvider[] {
			return this.providers.filter((p) => p.enabled);
		},

		/**
		 * 获取禁用的服务商列表
		 */
		disabledProviders(): AIProvider[] {
			return this.providers.filter((p) => !p.enabled);
		},

		/**
		 * 按 providerKey 查找服务商
		 */
		getProviderByKey: (state) => (providerKey: string) => {
			return state.providers.find((p) => p.providerKey === providerKey);
		},

		/**
		 * 获取服务商总数
		 */
		totalProviders(): number {
			return this.providers.length;
		},

		/**
		 * 获取启用的服务商总数
		 */
		enabledProvidersCount(): number {
			return this.enabledProviders.length;
		},
	},
});
