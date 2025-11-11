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
		redirect: '/telemetry/dashboard',
	},
	{
		path: '/',
		component: MainLayout,
		meta: {
			requiresAuth: true,
		},
		children: [
			// Telemetry 模块
			{
				path: 'telemetry',
				redirect: '/telemetry/dashboard',
			},
			{
				path: 'telemetry/dashboard',
				name: 'TelemetryDashboard',
				component: () => import('@/modules/telemetry/views/DashboardView.vue'),
				meta: {
					title: 'Telemetry 仪表板',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/events',
				name: 'TelemetryEvents',
				component: () => import('@/modules/telemetry/views/EventsView.vue'),
				meta: {
					title: '事件列表',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/events/:id',
				name: 'TelemetryEventDetail',
				component: () => import('@/modules/telemetry/views/EventDetailView.vue'),
				meta: {
					title: '事件详情',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/analytics',
				name: 'TelemetryAnalytics',
				component: () => import('@/modules/telemetry/views/AnalyticsView.vue'),
				meta: {
					title: '数据分析',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/users',
				name: 'TelemetryUsers',
				component: () => import('@/modules/telemetry/views/UsersView.vue'),
				meta: {
					title: '用户统计',
					module: 'telemetry',
				},
			},
			// AI Providers 模块
			{
				path: 'ai-providers',
				name: 'AIProviders',
				component: () => import('@/modules/ai-providers/views/AIProvidersView.vue'),
				meta: {
					title: 'AI 服务提供商',
					module: 'ai-providers',
				},
			},
			// Platform Nodes 模块
			{
				path: 'platform-nodes',
				name: 'PlatformNodes',
				component: () => import('@/modules/platform-nodes/views/PlatformNodesView.vue'),
				meta: {
					title: '平台节点管理',
					module: 'platform-nodes',
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

		// If system is initialized but not logged in, redirect to login
		const token = localStorage.getItem('platform_admin_token');
		if (!token) {
			if (to.name !== 'AdminLogin') {
				return next({ name: 'AdminLogin' });
			}
			return next();
		}

		// All checks passed
		next();
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
