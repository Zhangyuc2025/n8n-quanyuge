import { defineStore } from 'pinia';
import { adminApiClient } from '@n8n/shared';
import type {
	WorkspacesState,
	Workspace,
	WorkspaceWithDetails,
	UsageRecord,
	RechargeRecord,
	ListWorkspacesParams,
	UsageQueryParams,
	RechargeParams,
} from '@/types/admin.types';

export const useWorkspacesStore = defineStore('workspaces', {
	state: (): WorkspacesState => ({
		workspaces: [],
		loading: false,
		currentWorkspace: null,
		usageRecords: [],
		rechargeRecords: [],
		pagination: null,
	}),

	actions: {
		/**
		 * 获取工作空间列表
		 */
		async fetchWorkspaces(params?: ListWorkspacesParams): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<{
					workspaces: Workspace[];
					pagination: {
						page: number;
						limit: number;
						total: number;
						totalPages: number;
					};
				}>('/admin/workspaces', { params });

				this.workspaces = response.data.workspaces;
				this.pagination = response.data.pagination;
			} catch (error) {
				console.error('Failed to fetch workspaces:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取工作空间详情
		 */
		async getWorkspaceDetail(id: string): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<WorkspaceWithDetails>(`/admin/workspaces/${id}`);
				this.currentWorkspace = response.data;
			} catch (error) {
				console.error('Failed to fetch workspace detail:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 管理员充值
		 */
		async rechargeWorkspace(id: string, params: RechargeParams): Promise<void> {
			try {
				await adminApiClient.post(`/admin/workspaces/${id}/recharge`, params);
				// 充值成功后刷新详情
				if (this.currentWorkspace?.workspace.id === id) {
					await this.getWorkspaceDetail(id);
				}
				// 刷新列表
				if (this.pagination) {
					await this.fetchWorkspaces({
						page: this.pagination.page,
						limit: this.pagination.limit,
					});
				}
			} catch (error) {
				console.error('Failed to recharge workspace:', error);
				throw error;
			}
		},

		/**
		 * 获取消费记录
		 */
		async getUsageRecords(id: string, params?: UsageQueryParams): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<{
					workspaceId: string;
					records: UsageRecord[];
					pagination: {
						page: number;
						limit: number;
						total: number;
						totalPages: number;
					};
				}>(`/admin/workspaces/${id}/usage`, { params });

				this.usageRecords = response.data.records;
			} catch (error) {
				console.error('Failed to fetch usage records:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取充值记录
		 */
		async getRechargeRecords(id: string): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<{
					workspaceId: string;
					records: RechargeRecord[];
					total: number;
				}>(`/admin/workspaces/${id}/recharges`);

				this.rechargeRecords = response.data.records;
			} catch (error) {
				console.error('Failed to fetch recharge records:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 更新工作空间状态
		 */
		async updateWorkspaceStatus(
			id: string,
			status: 'active' | 'suspended',
			reason?: string,
		): Promise<void> {
			try {
				await adminApiClient.patch(`/admin/workspaces/${id}/status`, {
					status,
					reason,
				});

				// 更新本地状态
				const workspace = this.workspaces.find((w) => w.id === id);
				if (workspace) {
					workspace.status = status;
				}

				// 如果是当前工作空间，刷新详情
				if (this.currentWorkspace?.workspace.id === id) {
					await this.getWorkspaceDetail(id);
				}
			} catch (error) {
				console.error('Failed to update workspace status:', error);
				throw error;
			}
		},

		/**
		 * 清空当前工作空间详情
		 */
		clearCurrentWorkspace(): void {
			this.currentWorkspace = null;
			this.usageRecords = [];
			this.rechargeRecords = [];
		},
	},

	getters: {
		/**
		 * 获取余额颜色类
		 */
		getBalanceColorClass: () => (balance: number) => {
			if (balance < 100) return 'danger';
			if (balance < 1000) return 'warning';
			return 'success';
		},

		/**
		 * 获取工作空间类型标签
		 */
		getWorkspaceTypeLabel: () => (type: 'personal' | 'team') => {
			return type === 'personal' ? '个人空间' : '团队空间';
		},

		/**
		 * 获取状态标签
		 */
		getStatusLabel: () => (status: 'active' | 'suspended') => {
			return status === 'active' ? '正常' : '已暂停';
		},
	},
});
