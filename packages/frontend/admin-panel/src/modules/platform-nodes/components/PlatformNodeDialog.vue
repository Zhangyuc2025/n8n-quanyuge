<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nCard,
	N8nHeading,
	N8nIcon,
} from '@n8n/design-system';
import { ElMessage, ElSelect, ElOption, ElSwitch } from 'element-plus';
import type {
	AdminPlatformNode,
	CreatePlatformNodeRequest,
	UpdatePlatformNodeRequest,
	NodeType,
	BillingMode,
	BillingConfig,
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
	configMode: '',
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
		ElMessage.error('请填写所有必填项');
		return;
	}

	// Validate JSON fields
	if (!isValidJSON(formData.value.nodeDefinition)) {
		ElMessage.error('节点定义 JSON 格式无效');
		return;
	}

	if (formData.value.configSchema && !isValidJSON(formData.value.configSchema)) {
		ElMessage.error('配置 Schema JSON 格式无效');
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
				configMode: formData.value.configMode || undefined,
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
			ElMessage.success('创建成功');
		} else {
			const updateData: UpdatePlatformNodeRequest = {
				nodeName: formData.value.nodeName,
				nodeDefinition: JSON.parse(formData.value.nodeDefinition),
				nodeCode: formData.value.nodeCode || undefined,
				configMode: formData.value.configMode || undefined,
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
			ElMessage.success('更新成功');
		}
		emit('save');
	} catch (error) {
		ElMessage.error(props.mode === 'create' ? '创建失败' : '更新失败');
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
	<div :class="$style.overlay" @click.self="onClose">
		<div :class="$style.dialog">
			<N8nCard :class="$style.dialogCard">
				<!-- Header -->
				<div :class="$style.dialogHeader">
					<N8nHeading tag="h2" size="large">{{ dialogTitle }}</N8nHeading>
					<N8nButton type="tertiary" icon="times" size="small" @click="onClose" />
				</div>

				<!-- Content -->
				<div :class="$style.dialogContent">
					<!-- Node Key (only for create mode) -->
					<div v-if="mode === 'create'" :class="$style.formGroup">
						<N8nInputLabel label="节点标识" required>
							<N8nInput
								v-model="formData.nodeKey"
								placeholder="例如: myNode, customAction"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Node Name -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="节点名称" required>
							<N8nInput
								v-model="formData.nodeName"
								placeholder="例如: 我的节点, 自定义操作"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Node Type -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="节点类型" required>
							<ElSelect
								v-model="formData.nodeType"
								:disabled="mode === 'edit' || saving"
								placeholder="请选择节点类型"
								style="width: 100%"
							>
								<ElOption
									v-for="option in nodeTypeOptions"
									:key="option.value"
									:label="option.label"
									:value="option.value"
								/>
							</ElSelect>
						</N8nInputLabel>
					</div>

					<!-- Category -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="分类">
							<N8nInput
								v-model="formData.category"
								placeholder="例如: 数据处理, AI, 通信"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Description -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="描述">
							<N8nInput
								v-model="formData.description"
								type="textarea"
								:rows="3"
								placeholder="节点功能描述"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Icon URL -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="图标 URL">
							<N8nInput
								v-model="formData.iconUrl"
								placeholder="https://example.com/icon.png"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Version -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="版本">
							<N8nInput v-model="formData.version" placeholder="1.0.0" :disabled="saving" />
						</N8nInputLabel>
					</div>

					<!-- Node Definition (JSON) -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="节点定义 (JSON)" required>
							<N8nInput
								v-model="formData.nodeDefinition"
								type="textarea"
								:rows="10"
								placeholder='{"displayName": "节点名称", "properties": []}'
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Node Code (Optional) -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="节点代码 (可选)">
							<N8nInput
								v-model="formData.nodeCode"
								type="textarea"
								:rows="6"
								placeholder="节点执行代码..."
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Config Mode -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="配置模式">
							<N8nInput
								v-model="formData.configMode"
								placeholder="none, user, team"
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Config Schema (JSON) -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="配置 Schema (JSON)">
							<N8nInput
								v-model="formData.configSchema"
								type="textarea"
								:rows="6"
								placeholder='{"properties": {}}'
								:disabled="saving"
							/>
						</N8nInputLabel>
					</div>

					<!-- Billing Configuration -->
					<div :class="$style.sectionDivider">
						<N8nHeading tag="h3" size="medium">计费配置</N8nHeading>
					</div>

					<!-- Billing Mode -->
					<div :class="$style.formGroup">
						<N8nInputLabel label="计费模式" required>
							<ElSelect
								v-model="formData.billingMode"
								:disabled="saving"
								placeholder="选择计费模式"
								style="width: 100%"
							>
								<ElOption label="免费" value="free" />
								<ElOption label="Token计费（适合AI节点）" value="token-based" />
								<ElOption label="按次计费（适合API调用）" value="per-execution" />
								<ElOption label="时长计费（适合计算密集型）" value="duration-based" />
							</ElSelect>
						</N8nInputLabel>
					</div>

					<!-- Token-based Price -->
					<div v-if="formData.billingMode === 'token-based'" :class="$style.formGroup">
						<N8nInputLabel label="每Token价格（元）">
							<N8nInput
								v-model.number="formData.billingConfig.pricePerToken"
								type="number"
								step="0.00001"
								placeholder="0.00001"
								:disabled="saving"
							/>
							<template #hint> 例如：0.00001 元/token（相当于 ¥0.01/1K tokens） </template>
						</N8nInputLabel>
					</div>

					<!-- Per-execution Price -->
					<div v-if="formData.billingMode === 'per-execution'" :class="$style.formGroup">
						<N8nInputLabel label="每次执行价格（元）">
							<N8nInput
								v-model.number="formData.billingConfig.pricePerExecution"
								type="number"
								step="0.001"
								placeholder="0.01"
								:disabled="saving"
							/>
							<template #hint> 例如：0.01 元/次 </template>
						</N8nInputLabel>
					</div>

					<!-- Duration-based Price -->
					<div v-if="formData.billingMode === 'duration-based'" :class="$style.formGroup">
						<N8nInputLabel label="每秒价格（元）">
							<N8nInput
								v-model.number="formData.billingConfig.pricePerSecond"
								type="number"
								step="0.0001"
								placeholder="0.001"
								:disabled="saving"
							/>
							<template #hint> 例如：0.001 元/秒 </template>
						</N8nInputLabel>
					</div>

					<!-- Currency (readonly, always CNY) -->
					<div v-if="formData.billingMode !== 'free'" :class="$style.formGroup">
						<N8nInputLabel label="货币">
							<N8nInput
								v-model="formData.billingConfig.currency"
								:disabled="true"
								placeholder="CNY"
							/>
						</N8nInputLabel>
					</div>
				</div>

				<!-- Footer -->
				<div :class="$style.dialogFooter">
					<N8nButton type="secondary" :disabled="saving" @click="onClose"> 取消 </N8nButton>
					<N8nButton type="primary" :loading="saving" :disabled="!isFormValid" @click="onSave">
						保存
					</N8nButton>
				</div>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: var(--spacing--md);
}

.dialog {
	width: 100%;
	max-width: 900px;
	max-height: 90vh;
	overflow: hidden;
}

.dialogCard {
	display: flex;
	flex-direction: column;
	max-height: 90vh;
}

.dialogHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--lg);
	border-bottom: var(--border);
}

.dialogContent {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--lg);
}

.formGroup {
	margin-bottom: var(--spacing--md);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionDivider {
	margin: var(--spacing--lg) 0 var(--spacing--md) 0;
	padding-top: var(--spacing--md);
	border-top: var(--border);
}

.dialogFooter {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	border-top: var(--border);
}

@media (max-width: 768px) {
	.overlay {
		padding: 0;
	}

	.dialog {
		max-width: 100%;
		max-height: 100vh;
	}

	.dialogCard {
		max-height: 100vh;
		border-radius: 0;
	}
}
</style>
