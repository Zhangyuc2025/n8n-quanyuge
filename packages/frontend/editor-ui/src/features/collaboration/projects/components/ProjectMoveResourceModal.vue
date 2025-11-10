<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import ProjectMoveSuccessToastMessage from './ProjectMoveSuccessToastMessage.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '../projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { ProjectTypes } from '../projects.types';
import {
	getTruncatedProjectName,
	MAX_NAME_LENGTH,
	ResourceType,
	splitName,
} from '../projects.utils';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { sortByProperty } from '@n8n/utils/sort/sortByProperty';
import { truncate } from '@n8n/utils/string/truncate';
import { computed, h, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { N8nButton, N8nHeading, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb;
		resourceType: ResourceType;
		resourceTypeLabel: string;
		eventBus?: EventBus;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const toast = useToast();
const router = useRouter();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();

const filter = ref('');
const projectId = ref<string | null>(null);
const loading = ref(false);
const homeProjectName = computed(
	() => processProjectName(props.data.resource.homeProject?.name ?? '') ?? '',
);
const availableProjects = computed(() =>
	sortByProperty(
		'name',
		projectsStore.availableProjects.filter(
			(p) =>
				p.id !== props.data.resource.homeProject?.id &&
				(!p.scopes || getResourcePermissions(p.scopes)[props.data.resourceType].create),
		),
	),
);
const filteredProjects = computed(() =>
	availableProjects.value.filter((p) => p.name?.toLowerCase().includes(filter.value.toLowerCase())),
);
const selectedProject = computed(() =>
	availableProjects.value.find((p) => p.id === projectId.value),
);
const isResourceInTeamProject = computed(() => isHomeProjectTeam(props.data.resource));
const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);
const targetProjectName = computed(() => {
	return getTruncatedProjectName(selectedProject.value?.name);
});
const resourceName = computed(() => truncate(props.data.resource.name, MAX_NAME_LENGTH));

const isHomeProjectTeam = (resource: IWorkflowDb) =>
	resource.homeProject?.type === ProjectTypes.Team;

const processProjectName = (projectName: string) => {
	const { name, email } = splitName(projectName);
	return name ?? email;
};

const updateProject = (value: string) => {
	projectId.value = value;
};

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const setFilter = (query: string) => {
	filter.value = query;
};

const moveResource = async () => {
	if (!selectedProject.value || loading.value) return;

	loading.value = true;
	try {
		await projectsStore.moveResourceToProject(
			props.data.resourceType,
			props.data.resource.id,
			selectedProject.value.id,
			undefined,
			undefined,
		);
		closeModal();
		telemetry.track(`User successfully moved ${props.data.resourceType}`, {
			[`${props.data.resourceType}_id`]: props.data.resource.id,
			project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
		});
		toast.showToast({
			title: i18n.baseText('projects.move.resource.success.title', {
				interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: resourceName.value,
					targetProjectName: targetProjectName.value,
				},
			}),
			message: h(ProjectMoveSuccessToastMessage, {
				routeName: VIEWS.PROJECTS_WORKFLOWS,
				resourceType: props.data.resourceType,
				targetProject: selectedProject.value,
				isShareCredentialsChecked: false,
				areAllUsedCredentialsShareable: false,
			}),
			onClick: (event: MouseEvent | undefined) => {
				if (event?.target instanceof HTMLAnchorElement && selectedProject.value) {
					event.preventDefault();
					void router.push({
						name: VIEWS.PROJECTS_WORKFLOWS,
						params: { projectId: selectedProject.value.id },
					});
				}
			},
			type: 'success',
			duration: 8000,
		});
		if (props.data.eventBus) {
			props.data.eventBus.emit('resource-moved', {
				resourceId: props.data.resource.id,
				resourceType: props.data.resourceType,
				targetProjectId: selectedProject.value.id,
			});
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('projects.move.resource.error.title', {
				interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: resourceName.value,
				},
			}),
		);
	} finally {
		loading.value = false;
	}
};

onMounted(async () => {
	telemetry.track(`User clicked to move a ${props.data.resourceType}`, {
		[`${props.data.resourceType}_id`]: props.data.resource.id,
		project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
	});

	await projectsStore.getAvailableProjects();
});
</script>
<template>
	<Modal width="500px" :name="props.modalName" data-test-id="project-move-resource-modal">
		<template #header>
			<N8nHeading tag="h2" size="xlarge" class="mb-m pr-s">
				{{
					i18n.baseText('projects.move.resource.modal.title', {
						interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
					})
				}}
			</N8nHeading>
			<N8nText>
				<I18nT keypath="projects.move.resource.modal.message" scope="global">
					<template #resourceName
						><strong>{{ resourceName }}</strong></template
					>
					<template v-if="isResourceInTeamProject" #inTeamProject>
						<I18nT keypath="projects.move.resource.modal.message.team" scope="global">
							<template #resourceHomeProjectName
								><strong>{{ homeProjectName }}</strong></template
							>
						</I18nT>
					</template>
					<template v-else #inPersonalProject>
						<I18nT keypath="projects.move.resource.modal.message.personal" scope="global">
							<template #resourceHomeProjectName
								><strong>{{ homeProjectName }}</strong></template
							>
						</I18nT>
					</template>
				</I18nT>
			</N8nText>
		</template>
		<template #content>
			<div v-if="availableProjects.length">
				<N8nSelect
					class="mr-2xs mb-xs"
					:model-value="projectId"
					:filterable="true"
					:filter-method="setFilter"
					:placeholder="i18n.baseText('projects.move.resource.modal.selectPlaceholder')"
					data-test-id="project-move-resource-modal-select"
					@update:model-value="updateProject"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
					<N8nOption
						v-for="p in filteredProjects"
						:key="p.id"
						:value="p.id"
						:label="p.name ?? ''"
					></N8nOption>
				</N8nSelect>
				<N8nText>
					<I18nT keypath="projects.move.resource.modal.message.sharingNote" scope="global">
						<template #note
							><strong>{{
								i18n.baseText('projects.move.resource.modal.message.note')
							}}</strong></template
						>
						<template #resourceTypeLabel>{{ props.data.resourceTypeLabel }}</template>
					</I18nT>
					<span
						v-if="props.data.resource.sharedWithProjects?.length ?? 0 > 0"
						:class="$style.textBlock"
					>
						{{
							i18n.baseText('projects.move.resource.modal.message.sharingInfo', {
								adjustToNumber: props.data.resource.sharedWithProjects?.length,
								interpolate: {
									count: props.data.resource.sharedWithProjects?.length ?? 0,
								},
							})
						}}</span
					>
				</N8nText>
			</div>
			<N8nText v-else>{{
				i18n.baseText('projects.move.resource.modal.message.noProjects', {
					interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
				})
			}}</N8nText>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton type="secondary" text class="mr-2xs" :disabled="loading" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					:loading="loading"
					:disabled="!projectId || loading"
					type="primary"
					data-test-id="project-move-resource-modal-button"
					@click="moveResource"
				>
					{{
						i18n.baseText('projects.move.resource.modal.button', {
							interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
						})
					}}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	justify-content: flex-end;
}

.textBlock {
	display: block;
	margin-top: var(--spacing--sm);
}
</style>
