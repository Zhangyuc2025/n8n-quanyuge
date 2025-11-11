<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<div :class="$style.contentContainer">
			<div :class="$style.notice">
				<N8nIcon icon="triangle-alert" :class="$style.icon" size="xlarge" />
				<N8nHeading tag="h2" size="large" :class="$style.title">
					{{ locale.baseText('platformNotReady.title') }}
				</N8nHeading>
				<N8nText tag="p" :class="$style.description">
					{{ locale.baseText('platformNotReady.description') }}
				</N8nText>
				<N8nButton
					:loading="checking"
					:label="locale.baseText('platformNotReady.checkAgain')"
					size="large"
					@click="checkStatus"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import { N8nButton, N8nIcon, N8nText, N8nHeading, N8nLogo } from '@n8n/design-system';

import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useSystemStore } from '@/app/stores/system.store';
import { useSettingsStore } from '@/app/stores/settings.store';

import { VIEWS } from '@/app/constants';

const router = useRouter();
const locale = useI18n();
const toast = useToast();
const systemStore = useSystemStore();
const settingsStore = useSettingsStore();

const checking = ref(false);

const releaseChannel = computed(() => settingsStore.settings?.releaseChannel || 'stable');

const checkStatus = async () => {
	checking.value = true;
	try {
		await systemStore.checkSystemStatus();

		if (systemStore.isPlatformInitialized) {
			// Platform is now initialized, redirect to home or signin
			await router.push({ name: VIEWS.HOMEPAGE });
		} else {
			toast.showMessage({
				title: locale.baseText('platformNotReady.stillNotReady'),
				message: locale.baseText('platformNotReady.pleaseWait'),
				type: 'info',
			});
		}
	} catch (error) {
		toast.showError(error, locale.baseText('platformNotReady.checkFailed'));
	} finally {
		checking.value = false;
	}
};
</script>

<style module lang="scss">
body {
	background-color: var(--color--background--light-2);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing--2xl);

	> * {
		width: 352px;
	}
}

.contentContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing--xl);
}

.notice {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--l);
	padding: var(--spacing--2xl);
	background-color: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
}

.icon {
	color: var(--color--warning);
}

.title {
	margin: 0;
}

.description {
	margin: 0;
	max-width: 400px;
	line-height: 1.6;
}
</style>
