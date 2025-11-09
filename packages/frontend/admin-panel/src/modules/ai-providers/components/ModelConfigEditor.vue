<script setup lang="ts">
import { ref, watch } from 'vue';
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nCard,
	N8nText,
	N8nIcon,
} from '@n8n/design-system';
import { ElCheckbox, ElSelect, ElOption } from 'element-plus';

interface ModelConfig {
	id: string;
	name: string;
	description: string;
	pricePerToken: number;
	currency: string;
	contextWindow: number;
	maxOutputTokens: number;
	supportsFunctions: boolean;
	supportsVision: boolean;
}

interface Props {
	models: ModelConfig[];
	disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
});

const emit = defineEmits<{
	'update:models': [models: ModelConfig[]];
}>();

// Local state
const localModels = ref<ModelConfig[]>([...props.models]);

// Methods
function addModel() {
	const newModel: ModelConfig = {
		id: '',
		name: '',
		description: '',
		pricePerToken: 0,
		currency: 'CNY',
		contextWindow: 4096,
		maxOutputTokens: 2048,
		supportsFunctions: false,
		supportsVision: false,
	};
	localModels.value.push(newModel);
	emitUpdate();
}

function removeModel(index: number) {
	localModels.value.splice(index, 1);
	emitUpdate();
}

function updateModel(index: number, field: keyof ModelConfig, value: unknown) {
	if (localModels.value[index]) {
		(localModels.value[index][field] as typeof value) = value;
		emitUpdate();
	}
}

function emitUpdate() {
	emit('update:models', [...localModels.value]);
}

// Watch props changes
watch(
	() => props.models,
	(newModels) => {
		localModels.value = [...newModels];
	},
);
</script>

<template>
	<div :class="$style.modelConfigEditor">
		<!-- Models List -->
		<div v-if="localModels.length > 0" :class="$style.modelsList">
			<N8nCard
				v-for="(model, index) in localModels"
				:key="index"
				:class="$style.modelCard"
			>
				<div :class="$style.modelHeader">
					<N8nText bold>模型 {{ index + 1 }}</N8nText>
					<N8nButton
						type="tertiary"
						icon="trash"
						size="small"
						:disabled="disabled"
						@click="removeModel(index)"
					>
						删除
					</N8nButton>
				</div>

				<div :class="$style.modelFields">
					<!-- Model ID -->
					<div :class="$style.formField">
						<N8nInputLabel label="模型 ID" required>
							<N8nInput
								:model-value="model.id"
								placeholder="例如: gpt-4, claude-3"
								:disabled="disabled"
								@update:model-value="updateModel(index, 'id', $event)"
							/>
						</N8nInputLabel>
					</div>

					<!-- Model Name -->
					<div :class="$style.formField">
						<N8nInputLabel label="模型名称" required>
							<N8nInput
								:model-value="model.name"
								placeholder="例如: GPT-4, Claude 3"
								:disabled="disabled"
								@update:model-value="updateModel(index, 'name', $event)"
							/>
						</N8nInputLabel>
					</div>

					<!-- Description -->
					<div :class="$style.formField">
						<N8nInputLabel label="描述">
							<N8nInput
								:model-value="model.description"
								placeholder="模型简介"
								:disabled="disabled"
								@update:model-value="updateModel(index, 'description', $event)"
							/>
						</N8nInputLabel>
					</div>

					<!-- Price and Currency -->
					<div :class="$style.formRow">
						<div :class="$style.formField">
							<N8nInputLabel label="每 Token 价格" required>
								<N8nInput
									:model-value="model.pricePerToken"
									type="number"
									step="0.000001"
									placeholder="0.000001"
									:disabled="disabled"
									@update:model-value="updateModel(index, 'pricePerToken', Number($event))"
								/>
							</N8nInputLabel>
						</div>
						<div :class="$style.formField">
							<N8nInputLabel label="货币" required>
								<ElSelect
									:model-value="model.currency"
									:disabled="disabled"
									@update:model-value="updateModel(index, 'currency', $event)"
								>
									<ElOption label="CNY (¥)" value="CNY" />
									<ElOption label="USD ($)" value="USD" />
									<ElOption label="EUR (€)" value="EUR" />
								</ElSelect>
							</N8nInputLabel>
						</div>
					</div>

					<!-- Context Window and Max Output Tokens -->
					<div :class="$style.formRow">
						<div :class="$style.formField">
							<N8nInputLabel label="上下文窗口" required>
								<N8nInput
									:model-value="model.contextWindow"
									type="number"
									placeholder="4096"
									:disabled="disabled"
									@update:model-value="updateModel(index, 'contextWindow', Number($event))"
								/>
							</N8nInputLabel>
						</div>
						<div :class="$style.formField">
							<N8nInputLabel label="最大输出 Tokens">
								<N8nInput
									:model-value="model.maxOutputTokens"
									type="number"
									placeholder="2048"
									:disabled="disabled"
									@update:model-value="updateModel(index, 'maxOutputTokens', Number($event))"
								/>
							</N8nInputLabel>
						</div>
					</div>

					<!-- Features -->
					<div :class="$style.formRow">
						<div :class="$style.formField">
							<ElCheckbox
								:model-value="model.supportsFunctions"
								:disabled="disabled"
								@update:model-value="updateModel(index, 'supportsFunctions', $event)"
							>
								支持函数调用
							</ElCheckbox>
						</div>
						<div :class="$style.formField">
							<ElCheckbox
								:model-value="model.supportsVision"
								:disabled="disabled"
								@update:model-value="updateModel(index, 'supportsVision', $event)"
							>
								支持视觉识别
							</ElCheckbox>
						</div>
					</div>
				</div>
			</N8nCard>
		</div>

		<!-- Empty State -->
		<div v-else :class="$style.emptyState">
			<N8nIcon icon="info-circle" size="large" />
			<N8nText color="text-light">
				暂无模型配置，点击下方按钮添加
			</N8nText>
		</div>

		<!-- Add Model Button -->
		<N8nButton type="secondary" icon="plus" :disabled="disabled" @click="addModel">
			添加模型
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.modelConfigEditor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.modelsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.modelCard {
	padding: var(--spacing--md);
	background-color: var(--color--background--light-2);
}

.modelHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--md);
}

.modelFields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.formField {
	flex: 1;
}

.formRow {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);
}

@media (max-width: 768px) {
	.formRow {
		grid-template-columns: 1fr;
	}
}
</style>
