import type { RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/app/constants';

const BillingPage = async () => await import('@/features/billing/views/BillingPage.vue');

export const billingRoutes: RouteRecordRaw[] = [
	{
		path: '/billing',
		name: VIEWS.BILLING,
		component: BillingPage,
		meta: {
			middleware: ['authenticated'],
			telemetry: { pageCategory: 'billing' },
		},
	},
];
