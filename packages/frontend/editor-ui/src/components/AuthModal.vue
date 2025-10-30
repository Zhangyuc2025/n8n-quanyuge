<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Modal from './Modal.vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nInput, N8nText, N8nIcon, N8nLink } from '@n8n/design-system';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { VIEWS, AUTH_MODAL_KEY } from '@/constants';

const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const toast = useToast();

// Tab状态：'signin' | 'signup'
const activeTab = ref<'signin' | 'signup'>('signin');

// 密码显示/隐藏
const showPassword = ref(false);
const showSignupPassword = ref(false);

// 登录表单
const signinForm = ref({
	email: '',
	password: '',
});

// 注册表单
const signupForm = ref({
	username: '',
	password: '',
	confirmPassword: '',
});

const loading = ref(false);

// 切换 Tab
const switchTab = (tab: 'signin' | 'signup') => {
	activeTab.value = tab;
	loading.value = false;
	showPassword.value = false;
	showSignupPassword.value = false;
};

// 切换到注册
const goToSignup = () => {
	switchTab('signup');
};

// 登录
const handleSignin = async () => {
	if (!signinForm.value.email || !signinForm.value.password) {
		toast.showError(
			new Error(i18n.baseText('authModal.validation.fillAllFields')),
			i18n.baseText('authModal.error.title'),
		);
		return;
	}

	try {
		loading.value = true;
		await usersStore.loginWithCreds({
			emailOrLdapLoginId: signinForm.value.email,
			password: signinForm.value.password,
		});

		// 登录成功后，获取个人项目并重定向到个人项目页面
		await projectsStore.getPersonalProject();

		// 关闭弹窗
		uiStore.closeModal(AUTH_MODAL_KEY);

		// 重定向到个人项目的工作流页面
		if (projectsStore.personalProject?.id) {
			void router.push({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: projectsStore.personalProject.id },
			});
		} else {
			// 如果获取不到个人项目，刷新页面
			window.location.reload();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('authModal.signin.error'));
	} finally {
		loading.value = false;
	}
};

// 注册
const handleSignup = async () => {
	if (
		!signupForm.value.username ||
		!signupForm.value.password ||
		!signupForm.value.confirmPassword
	) {
		toast.showError(
			new Error(i18n.baseText('authModal.validation.fillAllFields')),
			i18n.baseText('authModal.error.title'),
		);
		return;
	}

	// 验证密码匹配
	if (signupForm.value.password !== signupForm.value.confirmPassword) {
		toast.showError(
			new Error(i18n.baseText('authModal.validation.passwordMismatch')),
			i18n.baseText('authModal.error.title'),
		);
		return;
	}

	try {
		loading.value = true;
		await usersStore.registerWithCreds({
			username: signupForm.value.username,
			password: signupForm.value.password,
		});

		// 注册成功后，获取个人项目并重定向到个人项目页面
		await projectsStore.getPersonalProject();

		// 关闭弹窗
		uiStore.closeModal(AUTH_MODAL_KEY);

		// 重定向到个人项目的工作流页面
		if (projectsStore.personalProject?.id) {
			void router.push({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: projectsStore.personalProject.id },
			});
		} else {
			// 如果获取不到个人项目，刷新页面
			window.location.reload();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('authModal.signup.error'));
	} finally {
		loading.value = false;
	}
};

// 忘记密码
const handleForgotPassword = () => {
	uiStore.closeModal(AUTH_MODAL_KEY);
	void router.push({ name: VIEWS.FORGOT_PASSWORD });
};
</script>

<template>
	<Modal name="authModal" width="800px" :center="true" :show-close="true">
		<template #content>
			<div :class="$style.authModal">
				<!-- 主内容区：左右布局 -->
				<div :class="$style.content">
					<!-- 左侧：登录/注册表单 -->
					<div :class="[$style.formSection, { [$style.fullWidth]: activeTab === 'signup' }]">
						<!-- 登录表单 -->
						<div v-if="activeTab === 'signin'" :class="$style.form">
							<!-- 提示文字 -->
							<div :class="$style.hint">
								<N8nText size="small" color="text-light">
									{{ i18n.baseText('authModal.hint.signin') }}
								</N8nText>
							</div>

							<div :class="$style.formGroup">
								<N8nInput
									v-model="signinForm.email"
									:placeholder="i18n.baseText('authModal.email.placeholder')"
									type="email"
									size="large"
								>
									<template #prefix>
										<N8nIcon icon="envelope" size="small" />
									</template>
								</N8nInput>
							</div>

							<div :class="$style.formGroup">
								<N8nInput
									v-model="signinForm.password"
									:placeholder="i18n.baseText('authModal.password.placeholder')"
									:type="showPassword ? 'text' : 'password'"
									size="large"
									@keydown.enter="handleSignin"
								>
									<template #prefix>
										<N8nIcon icon="lock" size="small" />
									</template>
									<template #suffix>
										<N8nIcon
											:icon="showPassword ? 'eye' : 'eye-slash'"
											:class="$style.passwordToggle"
											@click="showPassword = !showPassword"
										/>
									</template>
								</N8nInput>
							</div>

							<!-- 用户协议 -->
							<div :class="$style.agreementText">
								<N8nText size="xsmall" color="text-light">
									{{ i18n.baseText('authModal.agreement.text') }}
									<N8nLink size="xsmall">{{ i18n.baseText('authModal.agreement.terms') }}</N8nLink>
									{{ i18n.baseText('authModal.agreement.and') }}
									<N8nLink size="xsmall">{{
										i18n.baseText('authModal.agreement.privacy')
									}}</N8nLink>
								</N8nText>
							</div>

							<!-- 登录按钮 -->
							<N8nButton
								:class="$style.submitButton"
								:loading="loading"
								:label="i18n.baseText('authModal.signin.button')"
								size="large"
								block
								@click="handleSignin"
							/>

							<!-- 底部链接 -->
							<div :class="$style.formFooter">
								<N8nLink :class="$style.footerLink" size="small" @click="handleForgotPassword">
									{{ i18n.baseText('authModal.forgotPassword') }}
								</N8nLink>
								<N8nLink :class="$style.footerLink" size="small" @click="goToSignup">
									{{ i18n.baseText('authModal.signup.link') }}
								</N8nLink>
							</div>
						</div>

						<!-- 注册表单 -->
						<div v-if="activeTab === 'signup'" :class="$style.form">
							<!-- 提示文字 -->
							<div :class="$style.hint">
								<N8nText size="small" color="text-light">
									{{ i18n.baseText('authModal.hint.signup') }}
								</N8nText>
							</div>

							<!-- 用户名 -->
							<div :class="$style.formGroup">
								<N8nInput
									v-model="signupForm.username"
									:placeholder="i18n.baseText('authModal.username.placeholder')"
									size="large"
								>
									<template #prefix>
										<N8nIcon icon="user" size="small" />
									</template>
								</N8nInput>
							</div>

							<!-- 密码 -->
							<div :class="$style.formGroup">
								<N8nInput
									v-model="signupForm.password"
									:placeholder="i18n.baseText('authModal.password.placeholder')"
									:type="showSignupPassword ? 'text' : 'password'"
									size="large"
								>
									<template #prefix>
										<N8nIcon icon="lock" size="small" />
									</template>
									<template #suffix>
										<N8nIcon
											:icon="showSignupPassword ? 'eye' : 'eye-slash'"
											:class="$style.passwordToggle"
											@click="showSignupPassword = !showSignupPassword"
										/>
									</template>
								</N8nInput>
							</div>

							<!-- 确认密码 -->
							<div :class="$style.formGroup">
								<N8nInput
									v-model="signupForm.confirmPassword"
									:placeholder="i18n.baseText('authModal.confirmPassword.placeholder')"
									:type="showSignupPassword ? 'text' : 'password'"
									size="large"
									@keydown.enter="handleSignup"
								>
									<template #prefix>
										<N8nIcon icon="lock" size="small" />
									</template>
									<template #suffix>
										<N8nIcon
											:icon="showSignupPassword ? 'eye' : 'eye-slash'"
											:class="$style.passwordToggle"
											@click="showSignupPassword = !showSignupPassword"
										/>
									</template>
								</N8nInput>
							</div>

							<!-- 用户协议 -->
							<div :class="$style.agreementText">
								<N8nText size="xsmall" color="text-light">
									{{ i18n.baseText('authModal.agreement.text') }}
									<N8nLink size="xsmall">{{ i18n.baseText('authModal.agreement.terms') }}</N8nLink>
									{{ i18n.baseText('authModal.agreement.and') }}
									<N8nLink size="xsmall">{{
										i18n.baseText('authModal.agreement.privacy')
									}}</N8nLink>
								</N8nText>
							</div>

							<!-- 注册按钮 -->
							<N8nButton
								:class="$style.submitButton"
								:loading="loading"
								:label="i18n.baseText('authModal.signup.button')"
								size="large"
								block
								@click="handleSignup"
							/>

							<!-- 返回登录链接 -->
							<div :class="$style.backToSignin">
								<N8nLink :class="$style.backLink" size="small" @click="switchTab('signin')">
									{{ i18n.baseText('authModal.backToSignin') }}
								</N8nLink>
							</div>
						</div>
					</div>

					<!-- 右侧：二维码扫码登录（仅登录时显示） -->
					<div v-if="activeTab === 'signin'" :class="$style.qrcodeSection">
						<div :class="$style.qrcodeContainer">
							<!-- 二维码占位符 -->
							<div :class="$style.qrcodePlaceholder">
								<N8nIcon icon="qrcode" size="xlarge" color="text-light" />
							</div>
							<N8nText :class="$style.qrcodeHint" size="small" color="text-base" align="center">
								{{ i18n.baseText('authModal.qrcode.hint') }}
							</N8nText>
							<N8nText
								:class="$style.qrcodeComingSoon"
								size="xsmall"
								color="text-light"
								align="center"
							>
								{{ i18n.baseText('authModal.qrcode.comingSoon') }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.authModal {
	padding: var(--spacing--xl) 0;
}

.content {
	display: flex;
	gap: var(--spacing--3xl);
	min-height: 400px;
}

.formSection {
	flex: 1;
	display: flex;
	flex-direction: column;

	&.fullWidth {
		flex: none;
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}
}

.qrcodeSection {
	width: 240px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	padding-left: var(--spacing--2xl);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.hint {
	margin-bottom: var(--spacing--xs);
	color: var(--color--text--tint-2);
}

.formRow {
	display: flex;
	gap: var(--spacing--sm);
}

.formGroup {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.passwordToggle {
	cursor: pointer;
	color: var(--color--text--tint-2);

	&:hover {
		color: var(--color--text);
	}
}

.agreementText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	line-height: var(--line-height--lg);
	margin-top: var(--spacing--xs);
}

.submitButton {
	margin-top: var(--spacing--md);
}

.formFooter {
	display: flex;
	justify-content: space-between;
	margin-top: var(--spacing--md);
	padding-top: var(--spacing--md);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-2);
}

.footerLink {
	cursor: pointer;
	color: var(--color--primary);

	&:hover {
		color: var(--color--primary--shade-1);
	}
}

.qrcodeContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
}

.qrcodePlaceholder {
	width: 180px;
	height: 180px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-2);
}

.qrcodeHint {
	font-weight: var(--font-weight--bold);
}

.qrcodeComingSoon {
	color: var(--color--text--tint-3);
}

.backToSignin {
	margin-top: var(--spacing--md);
	text-align: center;
}

.backLink {
	cursor: pointer;
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);

	&:hover {
		color: var(--color--primary--shade-1);
	}
}
</style>
