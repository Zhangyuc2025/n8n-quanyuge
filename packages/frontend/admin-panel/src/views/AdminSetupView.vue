<template>
	<div class="setup-container">
		<a-card class="setup-card" :bordered="false">
			<div class="setup-header">
				<h1>平台管理员初始化</h1>
				<p>欢迎使用 全域阁A 平台管理后台，请创建管理员账号</p>
			</div>

			<a-form
				:model="formData"
				:rules="rules"
				layout="vertical"
				@finish="handleSubmit"
				class="setup-form"
			>
				<a-form-item label="管理员邮箱" name="email">
					<a-input
						v-model:value="formData.email"
						size="large"
						placeholder="admin@example.com"
						:disabled="loading"
					/>
				</a-form-item>

				<a-form-item label="管理员密码" name="password">
					<a-input-password
						v-model:value="formData.password"
						size="large"
						placeholder="请输入密码（至少8位）"
						:disabled="loading"
					/>
				</a-form-item>

				<a-form-item label="确认密码" name="confirmPassword">
					<a-input-password
						v-model:value="formData.confirmPassword"
						size="large"
						placeholder="请再次输入密码"
						:disabled="loading"
					/>
				</a-form-item>

				<a-form-item>
					<a-button type="primary" html-type="submit" size="large" block :loading="loading">
						创建管理员账号
					</a-button>
				</a-form-item>
			</a-form>
		</a-card>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import type { Rule } from 'ant-design-vue/es/form';

const router = useRouter();
const loading = ref(false);

const formData = ref({
	email: '',
	password: '',
	confirmPassword: '',
});

const rules: Record<string, Rule[]> = {
	email: [
		{ required: true, message: '请输入管理员邮箱', trigger: 'blur' },
		{ type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
	],
	password: [
		{ required: true, message: '请输入密码', trigger: 'blur' },
		{ min: 8, message: '密码长度至少为8位', trigger: 'blur' },
	],
	confirmPassword: [
		{ required: true, message: '请确认密码', trigger: 'blur' },
		{
			validator: (_rule, value) => {
				if (value !== formData.value.password) {
					return Promise.reject('两次输入的密码不一致');
				}
				return Promise.resolve();
			},
			trigger: 'blur',
		},
	],
};

async function handleSubmit() {
	loading.value = true;
	try {
		const response = await fetch('/rest/admin/setup', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({
				email: formData.value.email,
				password: formData.value.password,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || '创建管理员失败');
		}

		message.success('管理员账号创建成功');
		router.push('/login');
	} catch (error) {
		console.error('Setup error:', error);
		message.error(error instanceof Error ? error.message : '创建管理员失败');
	} finally {
		loading.value = false;
	}
}
</script>

<style scoped lang="scss">
.setup-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 20px;
}

.setup-card {
	width: 100%;
	max-width: 500px;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
	border-radius: 8px;
}

.setup-header {
	text-align: center;
	margin-bottom: 32px;

	h1 {
		font-size: 28px;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 8px;
	}

	p {
		font-size: 14px;
		color: #666;
	}
}

.setup-form {
	margin-top: 24px;
}
</style>
