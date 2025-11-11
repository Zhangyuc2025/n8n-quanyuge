import { computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { TemplateCredentialKey } from '../utils/templateTransforms';
import { useCredentialSetupState } from './useCredentialSetupState';

export const useSetupWorkflowCredentialsModalState = () => {
	const workflowsStore = useWorkflowsStore();

	const workflowNodes = computed(() => {
		return workflowsStore.allNodes;
	});

	const {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setSelectedCredentialId,
		unsetSelectedCredential,
	} = useCredentialSetupState(workflowNodes);

	const setInitialCredentialSelection = () => {
		selectedCredentialIdByKey.value = {};
	};

	const setCredential = (credentialKey: TemplateCredentialKey, credentialId: string) => {
		setSelectedCredentialId(credentialKey, credentialId);
		setInitialCredentialSelection();
	};

	const unsetCredential = (credentialKey: TemplateCredentialKey) => {
		unsetSelectedCredential(credentialKey);
		setInitialCredentialSelection();
	};

	return {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setInitialCredentialSelection,
		setCredential,
		unsetCredential,
	};
};
