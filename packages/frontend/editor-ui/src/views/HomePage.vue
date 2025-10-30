<template>
	<PageViewLayout>
		<div :class="$style.content">
			<N8nHeading tag="h1" size="2xlarge" :class="$style.title">
				{{ i18n.baseText('homePage.welcome') }}
			</N8nHeading>
			<N8nText size="large" color="text-base">
				{{ i18n.baseText('homePage.subtitle') }}
			</N8nText>
		</div>
	</PageViewLayout>
</template>

<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nText } from '@n8n/design-system';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import { useUIStore } from '@/stores/ui.store';
import { AUTH_MODAL_KEY } from '@/constants';
import { useRoute, useRouter } from 'vue-router';
import { onMounted, watch } from 'vue';
import { useUsersStore } from '@/features/settings/users/users.store';

const i18n = useI18n();
const uiStore = useUIStore();
const route = useRoute();
const router = useRouter();
const usersStore = useUsersStore();

// [多租户改造] 检测 requireAuth 参数，自动打开登录弹窗
onMounted(() => {
	if (route.query.requireAuth === 'true' && !usersStore.currentUser) {
		// 打开登录弹窗
		uiStore.openModal(AUTH_MODAL_KEY);

		// 清除 requireAuth 参数（保留 redirect 参数）
		const query = { ...route.query };
		delete query.requireAuth;
		void router.replace({ query });
	}
});

// [多租户改造] 监听登录状态变化，登录成功后跳转到目标页面
watch(
	() => usersStore.currentUser,
	(newUser, oldUser) => {
		if (!oldUser && newUser && route.query.redirect) {
			// 用户刚刚登录成功，且有 redirect 参数
			const redirectPath = decodeURIComponent(route.query.redirect as string);
			void router.push(redirectPath);
		}
	},
);
</script>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xl);
}

.title {
	color: var(--color--text--shade-1);
}
</style>
