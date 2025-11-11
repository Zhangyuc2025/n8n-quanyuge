<template>
	<AdminLayout :admin-store="adminAuthStore" @logout="handleLogout" @settings="handleSettings">
		<router-view v-slot="{ Component }">
			<template v-if="Component">
				<component :is="Component" />
			</template>
			<div v-else style="padding: 20px; color: #fff">
				No component to render (router-view empty)
			</div>
		</router-view>
	</AdminLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { AdminLayout } from '@n8n/shared';
import { useAdminAuthStore } from '@/stores/adminAuth.store';
import { useRouter } from 'vue-router';

console.log('[MainLayout] 组件已加载');

const adminAuthStore = useAdminAuthStore();
const router = useRouter();

onMounted(() => {
	console.log('[MainLayout] 组件已挂载');
	console.log('[MainLayout] 管理员:', adminAuthStore.admin);
});

const handleLogout = async () => {
	console.log('[MainLayout] 退出登录');
	await adminAuthStore.logout();
	router.push('/admin/login');
};

const handleSettings = () => {
	console.log('[MainLayout] 设置按钮点击');
};
</script>
