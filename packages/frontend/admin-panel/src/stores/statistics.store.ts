import { defineStore } from 'pinia';
import { adminApiClient } from '@n8n/shared';
import type {
	StatisticsState,
	StatisticsOverview,
	RevenueData,
	PopularService,
	ActiveWorkspace,
} from '@/types/admin.types';

export const useStatisticsStore = defineStore('statistics', {
	state: (): StatisticsState => ({
		overview: null,
		revenueData: null,
		popularServices: [],
		activeWorkspaces: [],
		loading: false,
	}),

	actions: {
		/**
		 * 获取平台概览统计
		 */
		async fetchOverview(): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<StatisticsOverview>('/admin/stats/overview');
				this.overview = response.data;
			} catch (error) {
				console.error('Failed to fetch overview:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取营收统计
		 * @param dateRange - 日期范围 { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
		 */
		async fetchRevenue(dateRange: { startDate: string; endDate: string }): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<RevenueData>('/admin/stats/revenue', {
					params: {
						startDate: dateRange.startDate,
						endDate: dateRange.endDate,
					},
				});
				this.revenueData = response.data;
			} catch (error) {
				console.error('Failed to fetch revenue data:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取热门服务排行
		 * @param options - 查询选项 { startDate?, endDate?, limit? }
		 */
		async fetchPopularServices(options?: {
			startDate?: string;
			endDate?: string;
			limit?: number;
		}): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<PopularService[]>(
					'/admin/stats/popular-services',
					{
						params: {
							startDate: options?.startDate,
							endDate: options?.endDate,
							limit: options?.limit ?? 10,
						},
					},
				);
				this.popularServices = response.data;
			} catch (error) {
				console.error('Failed to fetch popular services:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取活跃工作空间排行
		 * @param options - 查询选项 { startDate?, endDate?, limit? }
		 */
		async fetchActiveWorkspaces(options?: {
			startDate?: string;
			endDate?: string;
			limit?: number;
		}): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<ActiveWorkspace[]>(
					'/admin/stats/active-workspaces',
					{
						params: {
							startDate: options?.startDate,
							endDate: options?.endDate,
							limit: options?.limit ?? 10,
						},
					},
				);
				this.activeWorkspaces = response.data;
			} catch (error) {
				console.error('Failed to fetch active workspaces:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 刷新所有统计数据
		 */
		async refreshAll(): Promise<void> {
			const promises = [
				this.fetchOverview(),
				this.fetchPopularServices(),
				this.fetchActiveWorkspaces(),
			];

			// 默认获取最近 30 天营收数据
			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 30);

			promises.push(
				this.fetchRevenue({
					startDate: startDate.toISOString().split('T')[0],
					endDate: endDate.toISOString().split('T')[0],
				}),
			);

			await Promise.all(promises);
		},
	},

	getters: {
		/**
		 * 是否正在加载
		 */
		isLoading(): boolean {
			return this.loading;
		},

		/**
		 * 格式化余额（CNY）
		 */
		formattedBalance(): string {
			if (!this.overview) return '¥0.00';
			return `¥${this.overview.totalBalance.toFixed(2)}`;
		},

		/**
		 * 格式化营收（CNY）
		 */
		formattedRevenue(): string {
			if (!this.overview) return '¥0.00';
			return `¥${this.overview.totalRevenue.toFixed(2)}`;
		},

		/**
		 * 格式化今日营收（CNY）
		 */
		formattedTodayRevenue(): string {
			if (!this.overview) return '¥0.00';
			return `¥${this.overview.todayRevenue.toFixed(2)}`;
		},
	},
});
