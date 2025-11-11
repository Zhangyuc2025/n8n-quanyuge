<template>
	<div class="setup-container">
		<div class="setup-card">
			<h1 class="setup-title">{{ $t('adminPanel.setup.title') }}</h1>
			<p class="setup-subtitle">{{ $t('adminPanel.setup.subtitle') }}</p>

			<form @submit.prevent="handleSubmit" class="setup-form">
				<div class="form-group">
					<label for="name">{{ $t('adminPanel.setup.fullName') }}</label>
					<input
						id="name"
						v-model="formData.name"
						type="text"
						required
						:placeholder="$t('adminPanel.setup.fullNamePlaceholder')"
						autocomplete="name"
					/>
				</div>

				<div class="form-group">
					<label for="email">{{ $t('adminPanel.setup.email') }}</label>
					<input
						id="email"
						v-model="formData.email"
						type="email"
						required
						:placeholder="$t('adminPanel.setup.emailPlaceholder')"
						autocomplete="email"
					/>
				</div>

				<div class="form-group">
					<label for="password">{{ $t('adminPanel.setup.password') }}</label>
					<input
						id="password"
						v-model="formData.password"
						type="password"
						required
						:placeholder="$t('adminPanel.setup.passwordPlaceholder')"
						autocomplete="new-password"
					/>
					<small class="form-hint">
						{{ $t('adminPanel.setup.passwordHint') }}
					</small>
				</div>

				<button type="submit" class="submit-button" :disabled="loading">
					<span v-if="loading">{{ $t('adminPanel.setup.submitting') }}</span>
					<span v-else>{{ $t('adminPanel.setup.submit') }}</span>
				</button>

				<p v-if="error" class="error-message">{{ error }}</p>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSystemStore } from '@/stores/system.store';

const router = useRouter();
const systemStore = useSystemStore();
const { t } = useI18n();

const formData = ref({
	name: '',
	email: '',
	password: '',
});

const loading = ref(false);
const error = ref('');

const handleSubmit = async () => {
	loading.value = true;
	error.value = '';

	try {
		await systemStore.setupAdmin(formData.value);

		// Redirect to login page after successful setup
		alert(t('adminPanel.setup.successMessage'));
		await router.push({ name: 'AdminLogin' });
	} catch (err) {
		error.value = err instanceof Error ? err.message : t('adminPanel.setup.errorMessage');
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped>
.setup-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 2rem;
}

.setup-card {
	background: white;
	border-radius: 12px;
	padding: 3rem;
	max-width: 480px;
	width: 100%;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.setup-title {
	font-size: 1.875rem;
	font-weight: 700;
	color: #1a202c;
	margin-bottom: 0.5rem;
	text-align: center;
}

.setup-subtitle {
	font-size: 0.9375rem;
	color: #718096;
	margin-bottom: 2rem;
	text-align: center;
}

.setup-form {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.form-group label {
	font-size: 0.875rem;
	font-weight: 600;
	color: #4a5568;
}

.form-group input {
	padding: 0.75rem 1rem;
	border: 1px solid #e2e8f0;
	border-radius: 6px;
	font-size: 0.9375rem;
	transition: all 0.2s;
}

.form-group input:focus {
	outline: none;
	border-color: #667eea;
	box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
	font-size: 0.8125rem;
	color: #a0aec0;
}

.submit-button {
	padding: 0.875rem 1.5rem;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	border: none;
	border-radius: 6px;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition:
		transform 0.2s,
		box-shadow 0.2s;
}

.submit-button:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.submit-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.error-message {
	color: #e53e3e;
	font-size: 0.875rem;
	text-align: center;
	margin-top: 0.5rem;
}
</style>
