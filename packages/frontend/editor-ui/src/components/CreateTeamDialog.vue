<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { teamsApi } from '@/features/teams/teams.api';
import { CREATE_TEAM_MODAL_KEY, VIEWS } from '@/constants';
import { N8nButton, N8nFormInput, N8nSelect, N8nOption } from '@n8n/design-system';
import Modal from '@/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const modalBus = createEventBus();

// 表单数据
const formData = ref({
	name: '',
	description: '',
	billingMode: 'owner_pays' as 'owner_pays' | 'member_pays',
});

const isLoading = ref(false);
const isValid = ref(false);

// 表单验证
const nameError = computed(() => {
	if (!formData.value.name.trim()) {
		return i18n.baseText('createTeam.name.required');
	}
	if (formData.value.name.length > 255) {
		return i18n.baseText('createTeam.name.tooLong');
	}
	return '';
});

const descriptionError = computed(() => {
	if (formData.value.description && formData.value.description.length > 512) {
		return i18n.baseText('createTeam.description.tooLong');
	}
	return '';
});

const hasErrors = computed(() => {
	return !!nameError.value || !!descriptionError.value;
});

// 关闭弹窗
const onClose = () => {
	uiStore.closeModal(CREATE_TEAM_MODAL_KEY);
	// 重置表单
	formData.value = {
		name: '',
		description: '',
		billingMode: 'owner_pays',
	};
};

// 提交表单
const onSubmit = async () => {
	if (hasErrors.value || isLoading.value) {
		return;
	}

	isLoading.value = true;
	try {
		const newTeam = await teamsApi.createTeam(rootStore.restApiContext, {
			name: formData.value.name.trim(),
			description: formData.value.description.trim() || undefined,
			billingMode: formData.value.billingMode,
		});

		// 重新加载项目列表，获取后端自动创建的默认项目
		await projectsStore.getAllProjects();

		// 查找新创建团队的默认项目（通过teamId匹配）
		const teamProject = projectsStore.teamProjects.find((p) => p.teamId === newTeam.id);

		toast.showMessage({
			title: i18n.baseText('createTeam.success.title'),
			message: i18n.baseText('createTeam.success.message', {
				interpolate: { teamName: newTeam.name },
			}),
			type: 'success',
		});

		onClose();

		// 导航到新创建的团队项目首页
		if (teamProject) {
			await router.push({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: teamProject.id },
			});
		} else {
			// 如果找不到项目，导航到首页
			await router.push({ name: VIEWS.HOMEPAGE });
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('createTeam.error.title'));
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
	<Modal
		:name="CREATE_TEAM_MODAL_KEY"
		:title="i18n.baseText('createTeam.title')"
		:center="true"
		width="540px"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<div :class="$style.content">
				<div :class="$style.formGroup">
					<label :class="$style.label" for="team-name">
						{{ i18n.baseText('createTeam.name.label') }}
						<span :class="$style.required">*</span>
					</label>
					<N8nFormInput
						id="team-name"
						v-model="formData.name"
						:placeholder="i18n.baseText('createTeam.name.placeholder')"
						:maxlength="255"
						required
						data-test-id="create-team-name-input"
						@validate="isValid = $event"
					/>
					<small v-if="nameError" :class="$style.error">{{ nameError }}</small>
				</div>

				<div :class="$style.formGroup">
					<label :class="$style.label" for="team-description">
						{{ i18n.baseText('createTeam.description.label') }}
					</label>
					<N8nFormInput
						id="team-description"
						v-model="formData.description"
						type="textarea"
						:placeholder="i18n.baseText('createTeam.description.placeholder')"
						:maxlength="512"
						:rows="3"
						data-test-id="create-team-description-input"
					/>
					<small v-if="descriptionError" :class="$style.error">{{ descriptionError }}</small>
				</div>

				<div :class="$style.formGroup">
					<label :class="$style.label" for="team-billing-mode">
						{{ i18n.baseText('createTeam.billingMode.label') }}
					</label>
					<N8nSelect
						id="team-billing-mode"
						v-model="formData.billingMode"
						data-test-id="create-team-billing-mode-select"
					>
						<N8nOption
							value="owner_pays"
							:label="i18n.baseText('createTeam.billingMode.ownerPays')"
						/>
						<N8nOption
							value="member_pays"
							:label="i18n.baseText('createTeam.billingMode.memberPays')"
						/>
					</N8nSelect>
					<small :class="$style.hint">
						{{ i18n.baseText('createTeam.billingMode.hint') }}
					</small>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					:disabled="isLoading"
					data-test-id="create-team-cancel-button"
					@click="onClose"
				>
					{{ i18n.baseText('createTeam.cancel') }}
				</N8nButton>
				<N8nButton
					type="primary"
					:loading="isLoading"
					:disabled="hasErrors || !formData.name.trim()"
					data-test-id="create-team-submit-button"
					@click="onSubmit"
				>
					{{ i18n.baseText('createTeam.create') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	padding: var(--spacing--md) 0;
}

.formGroup {
	margin-bottom: var(--spacing--lg);

	&:last-child {
		margin-bottom: 0;
	}
}

.label {
	display: block;
	margin-bottom: var(--spacing--xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.required {
	color: var(--color--danger);
}

.error {
	display: block;
	margin-top: var(--spacing--2xs);
	color: var(--color--danger);
	font-size: var(--font-size--2xs);
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
