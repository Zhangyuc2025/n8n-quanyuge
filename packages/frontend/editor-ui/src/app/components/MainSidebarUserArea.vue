<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import {
	type IMenuItem,
	N8nAvatar,
	N8nMenuItem,
	N8nPopoverReka,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

defineProps<{ fullyExpanded: boolean; isCollapsed: boolean }>();

const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();

const userMenuItems = ref<IMenuItem[]>([
	{
		id: 'settings',
		icon: 'cog',
		label: i18n.baseText('settings'),
	},
	{
		id: 'logout',
		icon: 'user',
		label: i18n.baseText('auth.signout'),
	},
]);

const userIdentifier = computed(() => {
	return usersStore.currentUser?.email || '';
});

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};

const onUserActionToggle = (action: string) => {
	switch (action) {
		case 'logout':
			onLogout();
			break;
		case 'settings':
			void router.push({ name: VIEWS.SETTINGS });
			break;
		default:
			break;
	}
};
</script>

<template>
	<div ref="user" :class="$style.userArea">
		<N8nPopoverReka side="right" align="end" :side-offset="16">
			<template #content>
				<div :class="$style.popover">
					<!-- User info header -->
					<div :class="$style.userInfoHeader">
						<N8nAvatar
							:first-name="usersStore.currentUser?.firstName"
							:last-name="usersStore.currentUser?.lastName"
							size="medium"
						/>
						<div :class="$style.userInfoText">
							<N8nText bold size="small">
								{{ usersStore.currentUser?.fullName }}
							</N8nText>
							<N8nText size="xsmall" color="text-light">
								{{ userIdentifier }}
							</N8nText>
						</div>
					</div>

					<!-- Divider -->
					<div :class="$style.divider"></div>

					<!-- Menu items -->
					<N8nMenuItem
						v-for="action in userMenuItems"
						:key="action.id"
						:item="action"
						:data-test-id="`user-menu-item-${action.id}`"
						@click="() => onUserActionToggle(action.id)"
					/>
				</div>
			</template>
			<template #trigger>
				<div :class="$style.trigger" data-test-id="main-sidebar-user-menu">
					<N8nAvatar
						:first-name="usersStore.currentUser?.firstName"
						:last-name="usersStore.currentUser?.lastName"
						size="small"
					/>
					<div v-if="!isCollapsed" :class="$style.userInfo">
						<N8nText bold size="small" :class="$style.userName">
							{{ usersStore.currentUser?.fullName }}
						</N8nText>
						<N8nText size="xsmall" color="text-light" :class="$style.userEmail">
							{{ userIdentifier }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" module>
.userArea {
	padding: var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.userInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.userName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.userEmail {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.popover {
	padding: var(--spacing--xs);
	min-width: 250px;
}

.userInfoHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
}

.userInfoText {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.divider {
	height: 1px;
	background-color: var(--color--foreground);
	margin: var(--spacing--2xs) 0;
}
</style>
