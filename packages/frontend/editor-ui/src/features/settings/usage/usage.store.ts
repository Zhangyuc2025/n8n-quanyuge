import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { UsageState } from '@n8n/api-types';
import { useSettingsStore } from '@/app/stores/settings.store';

const DEFAULT_STATE: UsageState = {
	loading: true,
	data: {
		usage: {
			activeWorkflowTriggers: {
				limit: -1, // -1 表示无限制
				value: 0,
				warningThreshold: 0.8,
			},
			workflowsHavingEvaluations: {
				value: 0,
				limit: -1, // -1 表示无限制（许可证系统已移除）
			},
		},
		license: {
			planId: '',
			planName: 'Community',
		},
	},
};

export const useUsageStore = defineStore('usage', () => {
	const settingsStore = useSettingsStore();

	const state = reactive<UsageState>({ ...DEFAULT_STATE });

	// Active workflow triggers - still used in UI
	const activeWorkflowTriggersLimit = computed(() => state.data.usage.activeWorkflowTriggers.limit);
	const activeWorkflowTriggersCount = computed(() => state.data.usage.activeWorkflowTriggers.value);
	const executionPercentage = computed(
		() => (activeWorkflowTriggersCount.value / activeWorkflowTriggersLimit.value) * 100,
	);
	const instanceId = computed(() => settingsStore.settings.instanceId);
	// License system has been removed

	const setLoading = (loading: boolean) => {
		state.loading = loading;
	};

	const setData = (data: UsageState['data']) => {
		state.data = data;
	};

	// License system has been removed - no API calls needed
	// System now uses default values only

	return {
		setLoading,
		setData,
		activeWorkflowTriggersLimit,
		activeWorkflowTriggersCount,
		executionPercentage,
		instanceId,
		isCloseToLimit: computed(() =>
			state.data.usage.activeWorkflowTriggers.limit < 0
				? false
				: activeWorkflowTriggersCount.value / activeWorkflowTriggersLimit.value >=
					state.data.usage.activeWorkflowTriggers.warningThreshold,
		),
		isLoading: computed(() => state.loading),
	};
});
