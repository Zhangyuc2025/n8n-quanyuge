import { defineStore } from 'pinia';
import { adminApiClient } from '@n8n/shared';
import type { PlatformNode, PlatformNodesState } from '@/types/admin.types';

export const usePlatformNodesStore = defineStore('platformNodes', {
	state: (): PlatformNodesState => ({
		nodes: [],
		loading: false,
		currentNode: null,
	}),

	actions: {
		/**
		 * 获取所有节点（管理员视图）
		 */
		async fetchAllNodes(filters?: {
			category?: string;
			nodeType?: 'platform' | 'third_party';
			enabled?: boolean;
			isActive?: boolean;
			submissionStatus?: 'pending' | 'approved' | 'rejected';
		}): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<PlatformNode[]>('/platform-nodes/admin/all', {
					params: filters,
				});

				this.nodes = response.data;
			} catch (error) {
				console.error('Failed to fetch nodes:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取待审核节点列表
		 */
		async fetchSubmissions(): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<PlatformNode[]>(
					'/platform-nodes/admin/submissions',
				);

				this.nodes = response.data;
			} catch (error) {
				console.error('Failed to fetch submissions:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取节点详情
		 */
		async fetchNodeDetail(nodeKey: string): Promise<PlatformNode> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<PlatformNode>(`/platform-nodes/${nodeKey}`);

				this.currentNode = response.data;
				return response.data;
			} catch (error) {
				console.error('Failed to fetch node detail:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 审核通过节点
		 */
		async approveNode(nodeKey: string, reviewNotes?: string): Promise<void> {
			try {
				await adminApiClient.post(`/platform-nodes/${nodeKey}/approve`, { reviewNotes });

				// 更新本地状态
				const node = this.nodes.find((n) => n.nodeKey === nodeKey);
				if (node) {
					node.submissionStatus = 'approved';
				}
			} catch (error) {
				console.error('Failed to approve node:', error);
				throw error;
			}
		},

		/**
		 * 审核拒绝节点
		 */
		async rejectNode(nodeKey: string, reviewNotes?: string): Promise<void> {
			try {
				await adminApiClient.post(`/platform-nodes/${nodeKey}/reject`, { reviewNotes });

				// 更新本地状态
				const node = this.nodes.find((n) => n.nodeKey === nodeKey);
				if (node) {
					node.submissionStatus = 'rejected';
				}
			} catch (error) {
				console.error('Failed to reject node:', error);
				throw error;
			}
		},

		/**
		 * 启用/禁用节点
		 */
		async toggleNode(nodeKey: string, enabled: boolean): Promise<void> {
			try {
				await adminApiClient.patch(`/platform-nodes/${nodeKey}/toggle`, { enabled });

				// 更新本地状态
				const node = this.nodes.find((n) => n.nodeKey === nodeKey);
				if (node) {
					node.enabled = enabled;
				}
			} catch (error) {
				console.error('Failed to toggle node:', error);
				throw error;
			}
		},

		/**
		 * 创建节点
		 */
		async createNode(data: {
			nodeKey: string;
			nodeName: string;
			nodeType: 'platform_official' | 'third_party_approved';
			nodeDefinition: Record<string, unknown>;
			nodeCode?: string;
			category?: string;
			description?: string;
			iconUrl?: string;
			version?: string;
		}): Promise<PlatformNode> {
			try {
				const response = await adminApiClient.post<PlatformNode>(
					'/platform-nodes/admin/create',
					data,
				);

				// 添加到本地状态
				this.nodes.unshift(response.data);

				return response.data;
			} catch (error) {
				console.error('Failed to create node:', error);
				throw error;
			}
		},

		/**
		 * 删除节点
		 */
		async deleteNode(nodeKey: string): Promise<void> {
			try {
				await adminApiClient.delete(`/platform-nodes/admin/${nodeKey}`);

				// 从本地状态移除
				const index = this.nodes.findIndex((n) => n.nodeKey === nodeKey);
				if (index !== -1) {
					this.nodes.splice(index, 1);
				}
			} catch (error) {
				console.error('Failed to delete node:', error);
				throw error;
			}
		},

		/**
		 * 搜索节点
		 */
		async searchNodes(query: string): Promise<void> {
			this.loading = true;
			try {
				const response = await adminApiClient.get<PlatformNode[]>('/platform-nodes/search', {
					params: { q: query },
				});

				this.nodes = response.data;
			} catch (error) {
				console.error('Failed to search nodes:', error);
				throw error;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 清空当前节点
		 */
		clearCurrentNode(): void {
			this.currentNode = null;
		},
	},

	getters: {
		/**
		 * 获取待审核节点数量
		 */
		pendingCount(): number {
			return this.nodes.filter((n) => n.submissionStatus === 'pending').length;
		},

		/**
		 * 获取已批准节点数量
		 */
		approvedCount(): number {
			return this.nodes.filter((n) => n.submissionStatus === 'approved').length;
		},

		/**
		 * 获取已拒绝节点数量
		 */
		rejectedCount(): number {
			return this.nodes.filter((n) => n.submissionStatus === 'rejected').length;
		},

		/**
		 * 获取激活节点数量
		 */
		activeCount(): number {
			return this.nodes.filter((n) => n.isActive).length;
		},
	},
});
