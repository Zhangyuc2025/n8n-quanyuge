<template>
	<ErrorBoundary>
		<router-view v-slot="{ Component }">
			<component :is="Component" v-if="Component" />
			<div v-else style="padding: 20px; color: white">Loading...</div>
		</router-view>
	</ErrorBoundary>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ErrorBoundary from './components/ErrorBoundary.vue';

console.log('[App.vue] App 组件已加载');

onMounted(() => {
	console.log('[App.vue] App 组件已挂载');
	console.log('[App.vue] 当前路由:', window.location.pathname);
});
</script>

<style lang="scss">
@use './styles/theme.scss';
</style>
