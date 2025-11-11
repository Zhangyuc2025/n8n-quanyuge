import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useSystemStore } from '@/stores/system.store';
import MainLayout from '@/layouts/MainLayout.vue';

const routes: RouteRecordRaw[] = [
	// Admin authentication routes (no layout)
	{
		path: '/setup',
		name: 'AdminSetup',
		component: () => import('@/views/AdminSetupView.vue'),
		meta: {
			title: 'Platform Setup',
			public: true,
		},
	},
	{
		path: '/login',
		name: 'AdminLogin',
		component: () => import('@/views/AdminLoginView.vue'),
		meta: {
			title: 'Admin Login',
			public: true,
		},
	},
	{
		path: '/',
		redirect: '/dashboard',
	},
	{
		path: '/',
		component: MainLayout,
		meta: {
			requiresAuth: true,
		},
		children: [
			// Dashboard
			{
				path: 'dashboard',
				name: 'Dashboard',
				component: () => import('@/views/AdminDashboard.vue'),
				meta: {
					title: '仪表板',
				},
			},
			// Statistics
			{
				path: 'statistics',
				name: 'Statistics',
				component: () => import('@/views/StatisticsView.vue'),
				meta: {
					title: '统计分析',
				},
			},
			// Workspaces
			{
				path: 'workspaces',
				name: 'Workspaces',
				component: () => import('@/views/WorkspacesView.vue'),
				meta: {
					title: '工作空间管理',
				},
			},
			// AI Providers
			{
				path: 'ai-providers',
				name: 'AIProviders',
				component: () => import('@/views/AiProvidersView.vue'),
				meta: {
					title: 'AI 服务提供商',
				},
			},
			// Platform Nodes
			{
				path: 'platform-nodes',
				name: 'PlatformNodes',
				component: () => import('@/views/PlatformNodesView.vue'),
				meta: {
					title: '平台节点管理',
				},
			},
		],
	},
	// 错误页面（无布局）
	{
		path: '/forbidden',
		name: 'Forbidden',
		component: () => import('@/views/ForbiddenView.vue'),
		meta: {
			title: '访问被拒绝',
		},
	},
	{
		path: '/:pathMatch(.*)*',
		name: 'NotFound',
		component: () => import('@/views/NotFoundView.vue'),
		meta: {
			title: '页面未找到',
		},
	},
];

const router = createRouter({
	history: createWebHistory('/admin/'),
	routes,
});

/**
 * Router Guard: System initialization and authentication check
 */
router.beforeEach(async (to, _from, next) => {
	// Update page title
	document.title = (to.meta.title as string) || 'n8n Admin Panel';

	const systemStore = useSystemStore();

	// Allow access to public routes
	if (to.meta.public) {
		return next();
	}

	try {
		// Check system initialization status
		if (!systemStore.initializationStatus) {
			await systemStore.checkSystemStatus();
		}

		// If system needs setup, redirect to setup page
		if (systemStore.needsSetup) {
			if (to.name !== 'AdminSetup') {
				return next({ name: 'AdminSetup' });
			}
			return next();
		}

		// System is initialized, check authentication by testing an API call
		// Use a lightweight endpoint that requires authentication
		try {
			const testResponse = await fetch('/rest/platform-admin/me', {
				credentials: 'include',
			});

			if (testResponse.status === 401) {
				// Not authenticated (401 Unauthorized), redirect to login
				console.log('[Router] Not authenticated, redirecting to login');
				if (to.name !== 'AdminLogin') {
					return next({ name: 'AdminLogin' });
				}
				return next();
			}

			// Authenticated successfully or other status (proceed)
			next();
		} catch (authError) {
			// Network error, allow access anyway (fail-open for development)
			console.warn('[Router] Auth check error:', authError);
			next();
		}
	} catch (error) {
		console.error('[Router] Guard error:', error);
		// On error, redirect to login
		if (to.name !== 'AdminLogin' && to.name !== 'AdminSetup') {
			next({ name: 'AdminLogin' });
		} else {
			next();
		}
	}
});

export default router;
