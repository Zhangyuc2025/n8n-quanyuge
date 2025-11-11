<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import type {
	AdminPlatformNode,
	CreatePlatformNodeRequest,
	UpdatePlatformNodeRequest,
	NodeType,
	BillingMode,
	BillingConfig,
	ConfigMode,
} from '../stores/platform-nodes.store';
import { usePlatformNodesStore } from '../stores/platform-nodes.store';

interface Props {
	mode: 'create' | 'edit';
	node?: AdminPlatformNode | null;
}

const props = withDefaults(defineProps<Props>(), {
	node: null,
});

const emit = defineEmits<{
	close: [];
	save: [];
}>();

const platformNodesStore = usePlatformNodesStore();

// Form data
const formData = ref({
	nodeKey: '',
	nodeName: '',
	nodeType: 'platform' as NodeType,
	nodeDefinition: '{}',
	nodeCode: '',
	configMode: '' as string,
	configSchema: '{}',
	category: '',
	description: '',
	iconUrl: '',
	version: '1.0.0',
	billingMode: 'free' as BillingMode,
	billingConfig: {
		pricePerToken: 0,
		pricePerExecution: 0,
		pricePerSecond: 0,
		currency: 'CNY',
	} as BillingConfig,
});

const saving = ref(false);

// Computed
const dialogTitle = computed(() => {
	return props.mode === 'create' ? '创建平台节点' : '编辑平台节点';
});

const nodeTypeOptions = computed(() => [
	{ label: '平台管理节点', value: 'platform' },
	{ label: '第三方节点', value: 'third-party' },
]);

const billingModeOptions = computed(() => [
	{ label: '免费', value: 'free' },
	{ label: 'Token计费（适合AI节点）', value: 'token-based' },
	{ label: '按次计费（适合API调用）', value: 'per-execution' },
	{ label: '时长计费（适合计算密集型）', value: 'duration-based' },
]);

const isFormValid = computed(() => {
	if (props.mode === 'create') {
		return (
			formData.value.nodeKey.trim() !== '' &&
			formData.value.nodeName.trim() !== '' &&
			formData.value.nodeDefinition.trim() !== '' &&
			isValidJSON(formData.value.nodeDefinition)
		);
	} else {
		return (
			formData.value.nodeName.trim() !== '' &&
			formData.value.nodeDefinition.trim() !== '' &&
			isValidJSON(formData.value.nodeDefinition)
		);
	}
});

// Methods
function isValidJSON(str: string): boolean {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}

function loadNodeData() {
	if (props.node && props.mode === 'edit') {
		formData.value.nodeKey = props.node.nodeKey;
		formData.value.nodeName = props.node.nodeName;
		formData.value.nodeType = props.node.nodeType;
		formData.value.nodeDefinition = JSON.stringify(props.node.nodeDefinition, null, 2);
		formData.value.nodeCode = props.node.nodeCode || '';
		formData.value.configMode = props.node.configMode || '';
		formData.value.configSchema = props.node.configSchema
			? JSON.stringify(props.node.configSchema, null, 2)
			: '{}';
		formData.value.category = props.node.category || '';
		formData.value.description = props.node.description || '';
		formData.value.iconUrl = props.node.iconUrl || '';
		formData.value.version = props.node.version || '1.0.0';

		// Load billing config
		formData.value.billingMode = props.node.billingMode || 'free';
		formData.value.billingConfig = props.node.billingConfig || {
			pricePerToken: 0,
			pricePerExecution: 0,
			pricePerSecond: 0,
			currency: 'CNY',
		};
	}
}

function onClose() {
	emit('close');
}

async function onSave() {
	if (!isFormValid.value) {
		message.error('请填写所有必填项');
		return;
	}

	// Validate JSON fields
	if (!isValidJSON(formData.value.nodeDefinition)) {
		message.error('节点定义 JSON 格式无效');
		return;
	}

	if (formData.value.configSchema && !isValidJSON(formData.value.configSchema)) {
		message.error('配置 Schema JSON 格式无效');
		return;
	}

	saving.value = true;
	try {
		if (props.mode === 'create') {
			const createData: CreatePlatformNodeRequest = {
				nodeKey: formData.value.nodeKey,
				nodeName: formData.value.nodeName,
				nodeType: formData.value.nodeType,
				nodeDefinition: JSON.parse(formData.value.nodeDefinition),
				nodeCode: formData.value.nodeCode || undefined,
				configMode: (formData.value.configMode as ConfigMode) || undefined,
				configSchema: formData.value.configSchema
					? JSON.parse(formData.value.configSchema)
					: undefined,
				category: formData.value.category || undefined,
				description: formData.value.description || undefined,
				iconUrl: formData.value.iconUrl || undefined,
				version: formData.value.version || undefined,
				billingMode: formData.value.billingMode,
				billingConfig:
					formData.value.billingMode !== 'free' ? formData.value.billingConfig : undefined,
			};
			await platformNodesStore.createPlatformNode(createData);
			message.success('创建成功');
		} else {
			const updateData: UpdatePlatformNodeRequest = {
				nodeName: formData.value.nodeName,
				nodeDefinition: JSON.parse(formData.value.nodeDefinition),
				nodeCode: formData.value.nodeCode || undefined,
				configMode: (formData.value.configMode as ConfigMode) || undefined,
				configSchema: formData.value.configSchema
					? JSON.parse(formData.value.configSchema)
					: undefined,
				category: formData.value.category || undefined,
				description: formData.value.description || undefined,
				iconUrl: formData.value.iconUrl || undefined,
				version: formData.value.version || undefined,
				billingMode: formData.value.billingMode,
				billingConfig:
					formData.value.billingMode !== 'free' ? formData.value.billingConfig : undefined,
			};
			await platformNodesStore.updatePlatformNode(formData.value.nodeKey, updateData);
			message.success('更新成功');
		}
		emit('save');
	} catch (error) {
		message.error(props.mode === 'create' ? '创建失败' : '更新失败');
		console.error('Failed to save node:', error);
	} finally {
		saving.value = false;
	}
}

// Lifecycle
onMounted(() => {
	loadNodeData();
});

watch(
	() => props.node,
	() => {
		loadNodeData();
	},
);
</script>

<template>
	<a-modal
		:open="true"
		:title="dialogTitle"
		:width="900"
		:confirm-loading="saving"
		:ok-button-props="{ disabled: !isFormValid }"
		ok-text="保存"
		cancel-text="取消"
		@ok="onSave"
		@cancel="onClose"
	>
		<a-form :model="formData" layout="vertical" style="max-height: 70vh; overflow-y: auto">
			<!-- Node Key (only for create mode) -->
			<a-form-item v-if="mode === 'create'" label="节点标识" required>
				<a-input
					v-model:value="formData.nodeKey"
					placeholder="例如: myNode, customAction"
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Node Name -->
			<a-form-item label="节点名称" required>
				<a-input
					v-model:value="formData.nodeName"
					placeholder="例如: 我的节点, 自定义操作"
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Node Type -->
			<a-form-item label="节点类型" required>
				<a-select
					v-model:value="formData.nodeType"
					:disabled="mode === 'edit' || saving"
					placeholder="请选择节点类型"
					:options="nodeTypeOptions"
				/>
			</a-form-item>

			<!-- Category -->
			<a-form-item label="分类">
				<a-input
					v-model:value="formData.category"
					placeholder="例如: 数据处理, AI, 通信"
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Description -->
			<a-form-item label="描述">
				<a-textarea
					v-model:value="formData.description"
					:rows="3"
					placeholder="节点功能描述"
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Icon URL -->
			<a-form-item label="图标 URL">
				<a-input
					v-model:value="formData.iconUrl"
					placeholder="https://example.com/icon.png"
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Version -->
			<a-form-item label="版本">
				<a-input v-model:value="formData.version" placeholder="1.0.0" :disabled="saving" />
			</a-form-item>

			<!-- Node Definition (JSON) -->
			<a-form-item label="节点定义 (JSON)" required>
				<a-textarea
					v-model:value="formData.nodeDefinition"
					:rows="10"
					placeholder='{"displayName": "节点名称", "properties": []}'
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Node Code (Optional) -->
			<a-form-item label="节点代码 (可选)">
				<a-textarea
					v-model:value="formData.nodeCode"
					:rows="6"
					placeholder="节点执行代码..."
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Config Mode -->
			<a-form-item label="配置模式">
				<a-input
					v-model:value="formData.configMode"
					placeholder="none, user, team"
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Config Schema (JSON) -->
			<a-form-item label="配置 Schema (JSON)">
				<a-textarea
					v-model:value="formData.configSchema"
					:rows="6"
					placeholder='{"properties": {}}'
					:disabled="saving"
				/>
			</a-form-item>

			<!-- Billing Configuration Section -->
			<a-divider orientation="left">计费配置</a-divider>

			<!-- Billing Mode -->
			<a-form-item label="计费模式" required>
				<a-select
					v-model:value="formData.billingMode"
					:disabled="saving"
					placeholder="选择计费模式"
					:options="billingModeOptions"
				/>
			</a-form-item>

			<!-- Token-based Price -->
			<a-form-item v-if="formData.billingMode === 'token-based'" label="每Token价格（元）">
				<a-input-number
					v-model:value="formData.billingConfig.pricePerToken"
					:step="0.00001"
					:min="0"
					placeholder="0.00001"
					:disabled="saving"
					style="width: 100%"
				/>
				<template #extra> 例如：0.00001 元/token（相当于 ¥0.01/1K tokens） </template>
			</a-form-item>

			<!-- Per-execution Price -->
			<a-form-item v-if="formData.billingMode === 'per-execution'" label="每次执行价格（元）">
				<a-input-number
					v-model:value="formData.billingConfig.pricePerExecution"
					:step="0.001"
					:min="0"
					placeholder="0.01"
					:disabled="saving"
					style="width: 100%"
				/>
				<template #extra> 例如：0.01 元/次 </template>
			</a-form-item>

			<!-- Duration-based Price -->
			<a-form-item v-if="formData.billingMode === 'duration-based'" label="每秒价格（元）">
				<a-input-number
					v-model:value="formData.billingConfig.pricePerSecond"
					:step="0.0001"
					:min="0"
					placeholder="0.001"
					:disabled="saving"
					style="width: 100%"
				/>
				<template #extra> 例如：0.001 元/秒 </template>
			</a-form-item>

			<!-- Currency (readonly, always CNY) -->
			<a-form-item v-if="formData.billingMode !== 'free'" label="货币">
				<a-input v-model:value="formData.billingConfig.currency" disabled placeholder="CNY" />
			</a-form-item>
		</a-form>
	</a-modal>
</template>
