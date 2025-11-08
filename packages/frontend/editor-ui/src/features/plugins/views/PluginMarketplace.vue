<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { usePluginsStore } from '../plugins.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nCard,
	N8nButton,
	N8nText,
	N8nTabs,
	N8nHeading,
	N8nInput,
	N8nLoading,
	N8nIcon,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import PluginCard from '../components/PluginCard.vue';
import PluginCredentialsDialog from '../components/PluginCredentialsDialog.vue';
import PluginUploadDialog from '../components/PluginUploadDialog.vue';
import type { Plugin } from '../plugins.api';
import { PLUGIN_CREDENTIALS_MODAL_KEY, PLUGIN_UPLOAD_MODAL_KEY } from '../plugins.constants';

const i18n = useI18n();
const projectsStore = useProjectsStore();
const pluginsStore = usePluginsStore();
const uiStore = useUIStore();

// State
const activeTab = ref<'platform' | 'thirdParty' | 'custom'>('platform');
const searchQuery = ref('');
const selectedPlugin = ref<Plugin | null>(null);

// Computed
const currentWorkspaceId = computed(() => projectsStore.currentWorkspaceId);

const tabs = computed(() => [
	{
		label: i18n.baseText('plugins.tabs.platform'),
		value: 'platform',
		badge: pluginsStore.platformPlugins.length,
	},
	{
		label: i18n.baseText('plugins.tabs.thirdParty'),
		value: 'thirdParty',
		badge: pluginsStore.thirdPartyPlugins.length,
	},
	{
		label: i18n.baseText('plugins.tabs.custom'),
		value: 'custom',
		badge: pluginsStore.customPlugins.length,
	},
]);

const displayedPlugins = computed(() => {
	let plugins: Plugin[] = [];

	if (activeTab.value === 'platform') {
		plugins = pluginsStore.platformPlugins;
	} else if (activeTab.value === 'thirdParty') {
		plugins = pluginsStore.thirdPartyPlugins;
	} else {
		plugins = pluginsStore.customPlugins;
	}

	// Apply search filter
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase();
		plugins = plugins.filter(
			(plugin) =>
				plugin.name.toLowerCase().includes(query) ||
				plugin.description?.toLowerCase().includes(query) ||
				plugin.category?.toLowerCase().includes(query),
		);
	}

	return plugins;
});

const isLoading = computed(() => pluginsStore.loading);

// Methods
const loadPlugins = async () => {
	if (!currentWorkspaceId.value) return;

	await Promise.all([
		pluginsStore.fetchAllPlugins(),
		pluginsStore.fetchAvailablePlugins(currentWorkspaceId.value),
		pluginsStore.fetchMyPlugins(currentWorkspaceId.value),
	]);
};

const onTabChange = (tab: string) => {
	activeTab.value = tab as 'platform' | 'thirdParty' | 'custom';
	searchQuery.value = '';
};

const onConfigurePlugin = (plugin: Plugin) => {
	selectedPlugin.value = plugin;
	uiStore.openModal(PLUGIN_CREDENTIALS_MODAL_KEY);
};

const onEditPlugin = (plugin: Plugin) => {
	// TODO: Implement plugin edit functionality
	console.log('Edit plugin:', plugin);
};

const onDeletePlugin = async (plugin: Plugin) => {
	if (!currentWorkspaceId.value) return;

	// TODO: Add confirmation dialog
	const confirmed = window.confirm(
		i18n.baseText('plugins.deleteConfirm', { interpolate: { name: plugin.name } }),
	);

	if (confirmed) {
		await pluginsStore.deletePlugin(currentWorkspaceId.value, plugin.serviceKey);
		await loadPlugins();
	}
};

const onUploadPlugin = () => {
	uiStore.openModal(PLUGIN_UPLOAD_MODAL_KEY);
};

const onCredentialsSaved = async () => {
	await loadPlugins();
};

const onPluginUploaded = async () => {
	await loadPlugins();
};

// Lifecycle
onMounted(async () => {
	await loadPlugins();
});

// Watch workspace changes
watch(currentWorkspaceId, async (newId) => {
	if (newId) {
		await loadPlugins();
	}
});
</script>

<template>
	<div :class="$style.pluginMarketplace">
		<!-- Page Header -->
		<div :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nHeading tag="h1" size="2xlarge">
					<N8nIcon icon="box" />
					{{ i18n.baseText('plugins.title') }}
				</N8nHeading>
				<N8nText size="medium" color="text-light">
					{{ i18n.baseText('plugins.description') }}
				</N8nText>
			</div>
			<N8nButton v-if="activeTab === 'custom'" type="primary" icon="plus" @click="onUploadPlugin">
				{{ i18n.baseText('plugins.uploadCustomPlugin') }}
			</N8nButton>
		</div>

		<!-- Tabs and Search -->
		<N8nCard :class="$style.controlsCard">
			<div :class="$style.controls">
				<N8nTabs :model-value="activeTab" :options="tabs" @update:model-value="onTabChange" />
				<N8nInput
					v-model="searchQuery"
					:placeholder="i18n.baseText('plugins.searchPlaceholder')"
					type="text"
					size="medium"
					:class="$style.search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
			</div>
		</N8nCard>

		<!-- Plugin Grid -->
		<div :class="$style.content">
			<N8nLoading v-if="isLoading" :loading="true" :class="$style.loading" />

			<div v-else-if="displayedPlugins.length > 0" :class="$style.pluginGrid">
				<PluginCard
					v-for="plugin in displayedPlugins"
					:key="plugin.serviceKey"
					:plugin="plugin"
					:is-configured="pluginsStore.isPluginConfigured(plugin.serviceKey)"
					@configure="onConfigurePlugin"
					@edit="onEditPlugin"
					@delete="onDeletePlugin"
				/>
			</div>

			<div v-else :class="$style.emptyState">
				<N8nIcon icon="box" size="xlarge" :class="$style.emptyIcon" />
				<N8nHeading tag="h3" size="large">
					{{ i18n.baseText('plugins.noPlugins') }}
				</N8nHeading>
				<N8nText color="text-light">
					{{
						searchQuery
							? i18n.baseText('plugins.noSearchResults')
							: i18n.baseText('plugins.noPluginsDescription')
					}}
				</N8nText>
				<N8nButton
					v-if="activeTab === 'custom' && !searchQuery"
					type="primary"
					icon="plus"
					@click="onUploadPlugin"
				>
					{{ i18n.baseText('plugins.uploadCustomPlugin') }}
				</N8nButton>
			</div>
		</div>

		<!-- Dialogs -->
		<PluginCredentialsDialog
			v-if="currentWorkspaceId"
			:plugin="selectedPlugin"
			:workspace-id="currentWorkspaceId"
			:modal-name="PLUGIN_CREDENTIALS_MODAL_KEY"
			@saved="onCredentialsSaved"
		/>

		<PluginUploadDialog
			v-if="currentWorkspaceId"
			:workspace-id="currentWorkspaceId"
			:modal-name="PLUGIN_UPLOAD_MODAL_KEY"
			@uploaded="onPluginUploaded"
		/>
	</div>
</template>

<style lang="scss" module>
.pluginMarketplace {
	padding: var(--spacing--lg);
	max-width: 1600px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--lg);
	gap: var(--spacing--lg);
}

.headerLeft {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.controlsCard {
	margin-bottom: var(--spacing--lg);
}

.controls {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--md);
	flex-wrap: wrap;
}

.search {
	min-width: 300px;
	max-width: 400px;
}

.content {
	min-height: 400px;
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 400px;
}

.pluginGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: var(--spacing--lg);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--md);
	padding: var(--spacing--3xl) var(--spacing--lg);
	text-align: center;
}

.emptyIcon {
	color: var(--color--text--tint-2);
}
</style>
