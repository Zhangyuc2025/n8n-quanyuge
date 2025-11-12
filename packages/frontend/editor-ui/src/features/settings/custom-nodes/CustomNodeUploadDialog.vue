<script lang="ts" setup>
import { ref, reactive, watch, computed, nextTick } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useCustomNodesStore } from '@/app/stores/customNodes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	ElDialog,
	ElForm,
	ElFormItem,
	ElInput,
	ElSelect,
	ElOption,
	ElCollapse,
	ElCollapseItem,
	ElRow,
	ElCol,
} from 'element-plus';
import { N8nButton, N8nText } from '@n8n/design-system';
import type { CreateCustomNodeRequest } from '@/app/api/custom-nodes';

interface Props {
	open: boolean;
	mode: 'create' | 'edit';
	initialData?: any;
}

const props = withDefaults(defineProps<Props>(), {
	open: false,
	mode: 'create',
	initialData: null,
});

const emit = defineEmits<{
	(e: 'update:open', value: boolean): void;
	(e: 'success'): void;
}>();

const customNodesStore = useCustomNodesStore();
const projectsStore = useProjectsStore();
const { showError, showMessage } = useToast();
const i18n = useI18n();

const formRef = ref();
const loading = ref(false);
const nodeDefinitionText = ref('');
const testResult = ref<any>(null);
const testing = ref(false);
const testInputText = ref('');

const formData = reactive({
	nodeKey: '',
	nodeName: '',
	category: '',
	version: '1.0.0',
	iconUrl: '',
	description: '',
	nodeCode: '',
});

const rules = {
	nodeKey: [
		{ required: true, message: '请输入节点标识', trigger: 'blur' },
		{
			pattern: /^[a-z0-9-]+$/,
			message: '只能包含小写字母、数字和连字符',
			trigger: 'blur',
		},
	],
	nodeName: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
	nodeDefinition: [
		{
			validator: (_rule: any, _value: any, callback: any) => {
				if (!nodeDefinitionText.value.trim()) {
					callback(new Error('请输入节点定义'));
					return;
				}
				try {
					JSON.parse(nodeDefinitionText.value);
					callback();
				} catch {
					callback(new Error('节点定义必须是有效的 JSON 格式'));
				}
			},
			trigger: 'blur',
		},
	],
	version: [
		{
			pattern: /^\d+\.\d+\.\d+$/,
			message: '版本号格式应为 x.y.z',
			trigger: 'blur',
		},
	],
};

const parsedNodeDefinition = computed(() => {
	try {
		return nodeDefinitionText.value ? JSON.parse(nodeDefinitionText.value) : null;
	} catch {
		return null;
	}
});

// 监听 initialData 变化（编辑模式）
watch(
	() => props.initialData,
	(newData) => {
		if (newData && props.mode === 'edit') {
			formData.nodeKey = newData.nodeKey || '';
			formData.nodeName = newData.nodeName || '';
			formData.category = newData.category || '';
			formData.version = newData.version || '1.0.0';
			formData.iconUrl = newData.iconUrl || '';
			formData.description = newData.description || '';
			formData.nodeCode = newData.nodeCode || '';
			nodeDefinitionText.value = newData.nodeDefinition
				? JSON.stringify(newData.nodeDefinition, null, 2)
				: '';
		}
	},
	{ immediate: true },
);

// 监听弹窗关闭
watch(
	() => props.open,
	(newVal) => {
		if (!newVal) {
			resetForm();
		}
	},
);

const handleSubmit = async (): Promise<void> => {
	try {
		await formRef.value?.validate();

		loading.value = true;

		const workspaceId = projectsStore.currentWorkspaceId;
		if (!workspaceId) {
			showError(new Error('未选择工作空间'), '操作失败');
			return;
		}

		// 解析 nodeDefinition
		let nodeDefinition: Record<string, unknown>;
		try {
			nodeDefinition = JSON.parse(nodeDefinitionText.value);
		} catch (error) {
			showError(new Error('节点定义 JSON 格式错误'), '提交失败');
			return;
		}

		if (props.mode === 'create') {
			const createData: CreateCustomNodeRequest = {
				workspaceId,
				nodeKey: formData.nodeKey,
				nodeName: formData.nodeName,
				nodeDefinition,
				nodeCode: formData.nodeCode,
				category: formData.category || undefined,
				description: formData.description || undefined,
				iconUrl: formData.iconUrl || undefined,
				version: formData.version || '1.0.0',
			};

			await customNodesStore.createNode(createData);
		} else {
			const nodeId = props.initialData?.id;
			if (!nodeId) {
				showError(new Error('节点 ID 不存在'), '更新失败');
				return;
			}

			await customNodesStore.updateNode(nodeId, workspaceId, {
				nodeName: formData.nodeName,
				nodeDefinition,
				nodeCode: formData.nodeCode,
				category: formData.category || undefined,
				description: formData.description || undefined,
				iconUrl: formData.iconUrl || undefined,
				version: formData.version,
			});
		}

		emit('success');
		handleCancel();
	} catch (error: any) {
		const errorMessage = error.response?.data?.message || error.message || '操作失败，请稍后重试';
		showError(error, errorMessage);
	} finally {
		loading.value = false;
	}
};

const handleCancel = (): void => {
	emit('update:open', false);
};

const resetForm = (): void => {
	formRef.value?.resetFields();
	nodeDefinitionText.value = '';
	testResult.value = null;
	testInputText.value = '';
	Object.assign(formData, {
		nodeKey: '',
		nodeName: '',
		category: '',
		version: '1.0.0',
		iconUrl: '',
		description: '',
		nodeCode: '',
	});
};

const handleTest = async (): Promise<void> => {
	if (!parsedNodeDefinition.value) {
		showMessage({
			title: '请先填写有效的节点定义',
			type: 'warning',
		});
		return;
	}

	testing.value = true;
	testResult.value = null;

	try {
		let testInput: any[] | undefined;
		if (testInputText.value.trim()) {
			try {
				testInput = JSON.parse(testInputText.value);
				if (!Array.isArray(testInput)) {
					showMessage({
						title: '测试输入必须是数组格式',
						type: 'warning',
					});
					testing.value = false;
					return;
				}
			} catch {
				showMessage({
					title: '测试输入 JSON 格式错误',
					type: 'warning',
				});
				testing.value = false;
				return;
			}
		}

		const result = await customNodesStore.testNode({
			nodeDefinition: parsedNodeDefinition.value,
			nodeCode: formData.nodeCode || undefined,
			testInput,
		});

		testResult.value = result;

		if (result.success) {
			showMessage({
				title: '节点测试通过 ✅',
				type: 'success',
			});
		} else {
			showError(new Error(result.message || '测试失败'), '节点测试失败 ❌');
		}
	} catch (error: any) {
		const errorMessage = error.response?.data?.message || error.message || '测试失败';
		testResult.value = {
			success: false,
			message: errorMessage,
			error: error.response?.data?.error || error.stack || String(error),
		};
		showError(error, errorMessage);
	} finally {
		testing.value = false;
	}
};

const clearTestResult = (): void => {
	testResult.value = null;
};
</script>

<template>
	<ElDialog
		:model-value="open"
		:title="mode === 'create' ? '上传自定义节点' : '编辑自定义节点'"
		width="900px"
		:close-on-click-modal="false"
		@close="handleCancel"
	>
		<ElForm
			ref="formRef"
			:model="formData"
			:rules="rules"
			label-position="top"
			style="margin-top: 16px"
		>
			<ElRow :gutter="16">
				<ElCol :span="12">
					<ElFormItem label="节点标识 (nodeKey)" prop="nodeKey">
						<ElInput
							v-model="formData.nodeKey"
							placeholder="例如：weather-query"
							:disabled="mode === 'edit'"
						/>
						<N8nText size="small" color="text-light">
							唯一标识，只能包含小写字母、数字和连字符
						</N8nText>
					</ElFormItem>
				</ElCol>

				<ElCol :span="12">
					<ElFormItem label="节点名称" prop="nodeName">
						<ElInput v-model="formData.nodeName" placeholder="例如：天气查询" />
					</ElFormItem>
				</ElCol>
			</ElRow>

			<ElRow :gutter="16">
				<ElCol :span="12">
					<ElFormItem label="分类" prop="category">
						<ElInput v-model="formData.category" placeholder="例如：数据处理" />
					</ElFormItem>
				</ElCol>

				<ElCol :span="12">
					<ElFormItem label="版本号" prop="version">
						<ElInput v-model="formData.version" placeholder="1.0.0" />
					</ElFormItem>
				</ElCol>
			</ElRow>

			<ElFormItem label="图标 URL" prop="iconUrl">
				<ElInput v-model="formData.iconUrl" placeholder="https://..." />
			</ElFormItem>

			<ElFormItem label="描述" prop="description">
				<ElInput
					v-model="formData.description"
					type="textarea"
					placeholder="节点功能描述"
					:rows="3"
					maxlength="500"
					show-word-limit
				/>
			</ElFormItem>

			<ElFormItem label="节点定义 (nodeDefinition)" prop="nodeDefinition">
				<ElInput
					v-model="nodeDefinitionText"
					type="textarea"
					placeholder='{"name": "WeatherQuery", "displayName": "天气查询", ...}'
					:rows="8"
					:style="{ fontFamily: 'monospace', fontSize: '13px' }"
				/>
				<N8nText size="small" color="text-light">
					JSON 格式，符合 n8n INodeTypeDescription 规范
				</N8nText>
			</ElFormItem>

			<ElFormItem label="节点代码 (nodeCode)" prop="nodeCode">
				<ElInput
					v-model="formData.nodeCode"
					type="textarea"
					placeholder="class WeatherQuery { ... }"
					:rows="10"
					:style="{ fontFamily: 'monospace', fontSize: '13px' }"
				/>
				<N8nText size="small" color="text-light"> TypeScript/JavaScript 代码（可选） </N8nText>
			</ElFormItem>

			<!-- 测试功能区域 -->
			<ElCollapse style="margin-top: 16px">
				<ElCollapseItem title="🧪 测试节点" name="test">
					<ElFormItem label="测试输入数据（可选）">
						<ElInput
							v-model="testInputText"
							type="textarea"
							placeholder='[{"json": {"name": "测试数据"}}]'
							:rows="6"
							:style="{ fontFamily: 'monospace', fontSize: '13px' }"
						/>
						<N8nText size="small" color="text-light"> 提供测试输入数据（n8n 格式） </N8nText>
					</ElFormItem>

					<div style="margin-bottom: 16px">
						<N8nButton type="primary" :loading="testing" @click="handleTest"> 运行测试 </N8nButton>
						<N8nButton v-if="testResult" style="margin-left: 8px" @click="clearTestResult">
							清除结果
						</N8nButton>
					</div>

					<!-- 测试结果 -->
					<div v-if="testResult" style="margin-top: 16px">
						<div
							:style="{
								padding: '12px',
								borderRadius: '4px',
								backgroundColor: testResult.success ? '#f0f9ff' : '#fff1f0',
								border: testResult.success ? '1px solid #91d5ff' : '1px solid #ffccc7',
								marginBottom: '16px',
							}"
						>
							<N8nText :color="testResult.success ? 'success' : 'danger'" bold>
								{{ testResult.success ? '✅ 测试通过' : '❌ 测试失败' }}
							</N8nText>
							<N8nText
								v-if="testResult.message"
								size="small"
								style="display: block; margin-top: 4px"
							>
								{{ testResult.message }}
							</N8nText>
						</div>

						<div v-if="testResult.output">
							<N8nText bold style="margin-bottom: 8px; display: block">输出数据</N8nText>
							<pre
								:style="{
									padding: '12px',
									backgroundColor: '#f5f5f5',
									borderRadius: '4px',
									overflow: 'auto',
									fontSize: '12px',
									fontFamily: 'monospace',
								}"
								>{{ JSON.stringify(testResult.output, null, 2) }}</pre
							>
						</div>

						<div v-if="testResult.error">
							<N8nText bold style="margin-bottom: 8px; display: block">错误详情</N8nText>
							<pre
								:style="{
									padding: '12px',
									backgroundColor: '#fff1f0',
									borderRadius: '4px',
									overflow: 'auto',
									fontSize: '12px',
									fontFamily: 'monospace',
									color: '#ff4d4f',
								}"
								>{{ testResult.error }}</pre
							>
						</div>
					</div>
				</ElCollapseItem>
			</ElCollapse>
		</ElForm>

		<template #footer>
			<N8nButton @click="handleCancel">取消</N8nButton>
			<N8nButton type="primary" :loading="loading" @click="handleSubmit">
				{{ mode === 'create' ? '创建' : '更新' }}
			</N8nButton>
		</template>
	</ElDialog>
</template>

<style lang="scss" scoped>
:deep(.el-form-item__label) {
	font-weight: 600;
}

:deep(.el-textarea__inner),
:deep(.el-input__inner) {
	font-size: 14px;
}
</style>
