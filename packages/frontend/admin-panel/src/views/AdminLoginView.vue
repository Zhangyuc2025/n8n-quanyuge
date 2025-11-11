<template>
	<div class="login-container">
		<div class="login-card">
			<h1 class="login-title">{{ $t('adminPanel.login.title') }}</h1>
			<p class="login-subtitle">{{ $t('adminPanel.login.subtitle') }}</p>

			<form @submit.prevent="handleSubmit" class="login-form">
				<div class="form-group">
					<label for="email">{{ $t('adminPanel.login.email') }}</label>
					<input
						id="email"
						v-model="formData.email"
						type="email"
						required
						:placeholder="$t('adminPanel.login.emailPlaceholder')"
						autocomplete="email"
					/>
				</div>

				<div class="form-group">
					<label for="password">{{ $t('adminPanel.login.password') }}</label>
					<input
						id="password"
						v-model="formData.password"
						type="password"
						required
						:placeholder="$t('adminPanel.login.passwordPlaceholder')"
						autocomplete="current-password"
					/>
				</div>

				<button type="submit" class="submit-button" :disabled="loading">
					<span v-if="loading">{{ $t('adminPanel.login.submitting') }}</span>
					<span v-else>{{ $t('adminPanel.login.submit') }}</span>
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
	email: '',
	password: '',
});

const loading = ref(false);
const error = ref('');

const handleSubmit = async () => {
	loading.value = true;
	error.value = '';

	try {
		await systemStore.loginAdmin(formData.value);

		// Redirect to dashboard after successful login
		await router.push({ name: 'TelemetryDashboard' });
	} catch (err) {
		error.value = err instanceof Error ? err.message : t('adminPanel.login.errorMessage');
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped>
.login-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 2rem;
}

.login-card {
	background: white;
	border-radius: 12px;
	padding: 3rem;
	max-width: 420px;
	width: 100%;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-title {
	font-size: 1.875rem;
	font-weight: 700;
	color: #1a202c;
	margin-bottom: 0.5rem;
	text-align: center;
}

.login-subtitle {
	font-size: 0.9375rem;
	color: #718096;
	margin-bottom: 2rem;
	text-align: center;
}

.login-form {
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
