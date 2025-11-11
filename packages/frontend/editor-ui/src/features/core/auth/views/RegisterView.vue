<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import AuthView from './AuthView.vue';

import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';

import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';

import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/app/constants';

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const router = useRouter();

const toast = useToast();
const locale = useI18n();
const telemetry = useTelemetry();

const loading = ref(false);

const formConfig: IFormBoxConfig = {
	title: locale.baseText('auth.register.createAccount'),
	buttonText: locale.baseText('auth.register'),
	secondaryButtonText: locale.baseText('auth.register.alreadyHaveAccount'),
	inputs: [
		{
			name: 'email',
			properties: {
				label: locale.baseText('auth.email'),
				type: 'email',
				required: true,
				validationRules: [{ name: 'VALID_EMAIL' }],
				showRequiredAsterisk: false,
				validateOnBlur: false,
				autocomplete: 'email',
				capitalize: true,
				focusInitially: true,
			},
		},
		{
			name: 'firstName',
			properties: {
				label: locale.baseText('auth.firstName'),
				maxlength: 32,
				required: true,
				autocomplete: 'given-name',
				capitalize: true,
			},
		},
		{
			name: 'lastName',
			properties: {
				label: locale.baseText('auth.lastName'),
				maxlength: 32,
				required: true,
				autocomplete: 'family-name',
				capitalize: true,
			},
		},
		{
			name: 'password',
			properties: {
				label: locale.baseText('auth.password'),
				type: 'password',
				validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
				required: true,
				infoText: locale.baseText('auth.defaultPasswordRequirements'),
				autocomplete: 'new-password',
				capitalize: true,
			},
		},
	],
};

async function onSubmit(values: { [key: string]: string | boolean }) {
	try {
		loading.value = true;

		await usersStore.registerWithCreds({
			email: values.email as string,
			firstName: values.firstName as string,
			lastName: values.lastName as string,
			password: values.password as string,
		});

		await settingsStore.getSettings();

		telemetry.track('User registered', {
			method: 'email',
		});

		toast.showMessage({
			title: locale.baseText('auth.register.success'),
			type: 'success',
		});

		// Redirect to homepage (same as login)
		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		toast.showError(error, locale.baseText('auth.register.error'));
	} finally {
		loading.value = false;
	}
}

const onSecondaryClick = () => {
	void router.push({ name: VIEWS.SIGNIN });
};
</script>

<template>
	<AuthView
		:form="formConfig"
		:form-loading="loading"
		@submit="onSubmit"
		@secondary-click="onSecondaryClick"
	/>
</template>
