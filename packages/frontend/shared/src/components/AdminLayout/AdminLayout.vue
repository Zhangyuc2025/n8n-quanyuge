<template>
	<a-layout class="admin-layout">
		<a-layout-sider
			v-model:collapsed="collapsed"
			:trigger="null"
			collapsible
			:width="240"
			class="admin-layout__sider"
		>
			<div class="admin-layout__logo">
				<img v-if="!collapsed" :src="logoUrl" alt="Logo" />
				<img v-else :src="logoMiniUrl" alt="Logo" />
			</div>

			<a-menu
				v-model:selectedKeys="selectedKeys"
				theme="dark"
				mode="inline"
				:items="menuItems"
				@click="handleMenuClick"
			/>
		</a-layout-sider>

		<a-layout :class="{ 'admin-layout__main--collapsed': collapsed }" class="admin-layout__main">
			<a-layout-header class="admin-layout__header">
				<div class="admin-layout__header-left">
					<menu-unfold-outlined
						v-if="collapsed"
						class="trigger"
						@click="() => (collapsed = !collapsed)"
					/>
					<menu-fold-outlined v-else class="trigger" @click="() => (collapsed = !collapsed)" />

					<a-breadcrumb :items="breadcrumbItems" class="admin-layout__breadcrumb" />
				</div>

				<div class="admin-layout__header-right">
					<slot name="header-actions" />

					<a-dropdown>
						<div class="admin-layout__user">
							<a-avatar :size="32">
								{{ displayAdminName?.[0] || 'A' }}
							</a-avatar>
							<span v-if="displayAdminName" class="admin-layout__user-name">{{
								displayAdminName
							}}</span>
						</div>

						<template #overlay>
							<a-menu>
								<a-menu-item key="settings" @click="$emit('settings')">
									<setting-outlined />
									设置
								</a-menu-item>
								<a-menu-divider />
								<a-menu-item key="logout" @click="$emit('logout')">
									<logout-outlined />
									退出登录
								</a-menu-item>
							</a-menu>
						</template>
					</a-dropdown>
				</div>
			</a-layout-header>

			<a-layout-content class="admin-layout__content">
				<slot />
			</a-layout-content>

			<a-layout-footer class="admin-layout__footer">
				<slot name="footer">
					<span>SASA 平台管理后台 © {{ new Date().getFullYear() }}</span>
				</slot>
			</a-layout-footer>
		</a-layout>
	</a-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
	MenuUnfoldOutlined,
	MenuFoldOutlined,
	SettingOutlined,
	LogoutOutlined,
	DashboardOutlined,
	ApiOutlined,
	CloudOutlined,
	TeamOutlined,
	BarChartOutlined,
} from '@ant-design/icons-vue';
import type { MenuProps } from 'ant-design-vue';

// Logo URLs - 使用环境变量构建路径，开发和生产环境都能正确访问
// 在 admin-panel 项目中，base 为 '/admin/'，这些资源在 public 目录下
const logoUrl = 'logo.svg';
const logoMiniUrl = 'logo-mini.svg';

interface Props {
	adminName?: string;
	adminStore?: any; // Pinia store instance for accessing admin data
}

const props = defineProps<Props>();

defineEmits<{
	logout: [];
	settings: [];
}>();

// Computed admin name - use prop if provided, otherwise try to get from store
const displayAdminName = computed(() => {
	if (props.adminName) {
		return props.adminName;
	}
	if (props.adminStore && props.adminStore.admin) {
		return props.adminStore.admin.name || props.adminStore.admin.email;
	}
	return '';
});

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);
const selectedKeys = ref<string[]>([]);

// Menu items
const menuItems: MenuProps['items'] = [
	{
		key: '/dashboard',
		icon: () => h(DashboardOutlined),
		label: '仪表板',
		title: '仪表板',
	},
	{
		key: '/platform-nodes',
		icon: () => h(ApiOutlined),
		label: '平台节点',
		title: '平台节点',
	},
	{
		key: '/ai-providers',
		icon: () => h(CloudOutlined),
		label: 'AI 服务商',
		title: 'AI 服务商',
	},
	{
		key: '/workspaces',
		icon: () => h(TeamOutlined),
		label: '工作空间',
		title: '工作空间',
	},
	{
		key: '/statistics',
		icon: () => h(BarChartOutlined),
		label: '系统统计',
		title: '系统统计',
	},
];

// Breadcrumb items
const breadcrumbItems = computed(() => {
	const path = route.path;
	const items: Array<{ title: string }> = [{ title: '首页' }];

	const routeMap: Record<string, string> = {
		'/dashboard': '仪表板',
		'/platform-nodes': '平台节点',
		'/ai-providers': 'AI 服务商',
		'/workspaces': '工作空间',
		'/statistics': '系统统计',
	};

	if (routeMap[path]) {
		items.push({ title: routeMap[path] });
	}

	return items;
});

// Handle menu click
const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
	router.push(key as string);
};

// Update selected keys when route changes
watch(
	() => route.path,
	(newPath) => {
		selectedKeys.value = [newPath];
	},
	{ immediate: true },
);

// Import h helper for rendering icons
import { h } from 'vue';
</script>

<style scoped lang="scss">
.admin-layout {
	min-height: 100vh;

	&__main {
		margin-left: 240px;
		transition: margin-left 0.2s;

		&--collapsed {
			margin-left: 80px;
		}
	}

	&__sider {
		background: #001529;
		overflow: auto;
		height: 100vh;
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
	}

	&__logo {
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;

		img {
			height: 32px;
			width: auto;
		}
	}

	&__header {
		background: var(--admin-bg-secondary);
		padding: 0 16px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: var(--admin-shadow-sm);

		.trigger {
			font-size: 18px;
			cursor: pointer;
			transition: color 0.3s;

			&:hover {
				color: var(--admin-primary);
			}
		}
	}

	&__header-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	&__header-right {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	&__breadcrumb {
		margin-left: 16px;
	}

	&__user {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: background-color 0.3s;

		&:hover {
			background-color: var(--admin-bg-tertiary);
		}
	}

	&__user-name {
		font-size: 14px;
		color: var(--admin-text-primary);
	}

	&__content {
		margin: 24px 16px;
		padding: 24px;
		background: var(--admin-bg-secondary);
		min-height: calc(100vh - 64px - 70px - 48px);
		border-radius: var(--admin-border-radius-sm);
	}

	&__footer {
		text-align: center;
		background: var(--admin-bg-primary);
		color: var(--admin-text-secondary);
		padding: 16px 50px;
	}
}
</style>
