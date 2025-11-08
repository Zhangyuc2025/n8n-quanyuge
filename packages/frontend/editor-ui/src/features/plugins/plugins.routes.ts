import type { RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/app/constants';

const PluginMarketplace = async () =>
	await import('@/features/plugins/views/PluginMarketplace.vue');

export const pluginsRoutes: RouteRecordRaw[] = [
	{
		path: '/plugins',
		name: VIEWS.PLUGIN_MARKETPLACE,
		component: PluginMarketplace,
		meta: {
			middleware: ['authenticated'],
			telemetry: { pageCategory: 'plugins' },
		},
	},
];
