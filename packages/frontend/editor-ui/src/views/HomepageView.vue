<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';

const locale = useI18n();
const usersStore = useUsersStore();
const router = useRouter();

const currentUser = usersStore.currentUser;

const goToWorkflows = () => {
	void router.push({ name: VIEWS.WORKFLOWS });
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<h1 :class="$style.title">
				{{ locale.baseText('homepage.welcome')
				}}{{ currentUser?.firstName ? `, ${currentUser.firstName}` : '' }}
			</h1>
			<p :class="$style.description">
				{{ locale.baseText('homepage.description') }}
			</p>
			<div :class="$style.actions">
				<button :class="$style.primaryButton" @click="goToWorkflows">
					{{ locale.baseText('homepage.goToWorkflows') }}
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	background-color: var(--color--background--light-2);
}

.content {
	text-align: center;
	max-width: 600px;
	padding: var(--spacing--2xl);
}

.title {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin-bottom: var(--spacing--lg);
}

.description {
	font-size: var(--font-size--lg);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--2xl);
}

.actions {
	display: flex;
	gap: var(--spacing--md);
	justify-content: center;
}

.primaryButton {
	padding: var(--spacing--sm) var(--spacing--xl);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: white;
	background-color: var(--color--primary);
	border: none;
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--primary--shade-1);
	}
}
</style>
