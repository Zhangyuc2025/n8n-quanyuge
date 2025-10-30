<script setup lang="ts">
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useToast } from '@/composables/useToast';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { onMounted } from 'vue';

const usersStore = useUsersStore();
const toast = useToast();
const router = useRouter();
const i18n = useI18n();

const logout = async () => {
	try {
		await usersStore.logout();
		// [多租户改造] 退出登录后跳转到首页并自动弹出登录弹窗（不再跳转到 /signin 页面）
		window.location.href = router.resolve({
			name: VIEWS.HOMEPAGE,
			query: { requireAuth: 'true' },
		}).href;
	} catch (e) {
		toast.showError(e, i18n.baseText('auth.signout.error'));
	}
};

onMounted(() => {
	void logout();
});
</script>

<template>
	<div />
</template>
