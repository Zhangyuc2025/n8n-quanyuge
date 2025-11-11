<template>
	<a-modal
		:open="open"
		title="添加平台节点"
		:width="900"
		:confirm-loading="loading"
		@ok="handleSubmit"
		@cancel="handleCancel"
	>
		<a-form
			ref="formRef"
			:model="formData"
			:rules="rules"
			layout="vertical"
			style="margin-top: 24px"
		>
			<a-row :gutter="16">
				<a-col :span="12">
					<a-form-item label="节点标识 (nodeKey)" name="nodeKey">
						<a-input v-model:value="formData.nodeKey" placeholder="例如：weather-query" />
						<div class="form-item-hint">唯一标识，只能包含小写字母、数字和连字符</div>
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="节点名称" name="nodeName">
						<a-input v-model:value="formData.nodeName" placeholder="例如：天气查询" />
					</a-form-item>
				</a-col>
			</a-row>

			<a-row :gutter="16">
				<a-col :span="12">
					<a-form-item label="节点类型" name="nodeType">
						<a-select v-model:value="formData.nodeType" placeholder="选择节点类型">
							<a-select-option value="platform_official">平台官方节点</a-select-option>
							<a-select-option value="third_party_approved">第三方节点</a-select-option>
						</a-select>
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="分类" name="category">
						<a-input v-model:value="formData.category" placeholder="例如：数据处理" />
					</a-form-item>
				</a-col>
			</a-row>

			<a-row :gutter="16">
				<a-col :span="12">
					<a-form-item label="版本号" name="version">
						<a-input v-model:value="formData.version" placeholder="1.0.0" />
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="图标 URL" name="iconUrl">
						<a-input v-model:value="formData.iconUrl" placeholder="https://..." />
					</a-form-item>
				</a-col>
			</a-row>

			<a-form-item label="描述" name="description">
				<a-textarea
					v-model:value="formData.description"
					placeholder="节点功能描述"
					:rows="3"
					show-count
					:maxlength="500"
				/>
			</a-form-item>

			<a-form-item label="节点定义 (nodeDefinition)" name="nodeDefinition">
				<a-textarea
					v-model:value="nodeDefinitionText"
					placeholder='{"name": "WeatherQuery", "type": "n8n-nodes-base.weatherQuery", ...}'
					:rows="8"
					style="font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 12px"
				/>
				<div class="form-item-hint">
					JSON 格式，符合 n8n INodeTypeDescription 规范
					<a-button
						type="link"
						size="small"
						@click="showNodeDefinitionHelp = !showNodeDefinitionHelp"
					>
						{{ showNodeDefinitionHelp ? '隐藏' : '查看' }}示例
					</a-button>
				</div>
				<a-alert v-if="showNodeDefinitionHelp" type="info" show-icon style="margin-top: 8px">
					<template #message>
						<pre style="margin: 0; font-size: 11px">{{ nodeDefinitionExample }}</pre>
					</template>
				</a-alert>

				<!-- 验证结果显示 -->
				<a-alert
					v-if="validationResult.errors.length > 0"
					type="error"
					show-icon
					style="margin-top: 8px"
				>
					<template #message>
						<div style="font-weight: 600; margin-bottom: 4px">验证错误</div>
						<ul style="margin: 0; padding-left: 20px">
							<li
								v-for="(error, index) in validationResult.errors"
								:key="index"
								style="font-size: 12px"
							>
								{{ error.message }}
							</li>
						</ul>
					</template>
				</a-alert>

				<a-alert
					v-if="validationResult.errors.length === 0 && validationResult.warnings.length > 0"
					type="warning"
					show-icon
					style="margin-top: 8px"
				>
					<template #message>
						<div style="font-weight: 600; margin-bottom: 4px">验证警告</div>
						<ul style="margin: 0; padding-left: 20px">
							<li
								v-for="(warning, index) in validationResult.warnings"
								:key="index"
								style="font-size: 12px"
							>
								{{ warning.message }}
							</li>
						</ul>
					</template>
				</a-alert>

				<a-alert
					v-if="
						validationResult.valid &&
						validationResult.errors.length === 0 &&
						validationResult.warnings.length === 0 &&
						nodeDefinitionText.trim()
					"
					type="success"
					show-icon
					style="margin-top: 8px"
					message="节点定义结构验证通过 ✓"
				/>
			</a-form-item>

			<a-form-item label="节点代码 (nodeCode)" name="nodeCode">
				<a-textarea
					v-model:value="formData.nodeCode"
					placeholder="class WeatherQuery { ... }"
					:rows="10"
					style="font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 12px"
				/>
				<div class="form-item-hint">
					TypeScript/JavaScript 代码（可选，如果不提供则使用内置实现）
				</div>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance, Rule } from 'ant-design-vue/es/form';

// 验证结果接口
interface ValidationError {
	code: string;
	message: string;
	field?: string;
}

interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	(e: 'update:open', value: boolean): void;
	(
		e: 'success',
		data: {
			nodeKey: string;
			nodeName: string;
			nodeType: 'platform_official' | 'third_party_approved';
			nodeDefinition: Record<string, unknown>;
			category?: string;
			version?: string;
			iconUrl?: string;
			description?: string;
			nodeCode?: string;
		},
	): void;
}>();

const formRef = ref<FormInstance>();
const loading = ref(false);
const showNodeDefinitionHelp = ref(false);
const validationResult = ref<ValidationResult>({
	valid: true,
	errors: [],
	warnings: [],
});

const formData = reactive({
	nodeKey: '',
	nodeName: '',
	nodeType: 'platform_official' as 'platform_official' | 'third_party_approved',
	category: '',
	version: '1.0.0',
	iconUrl: '',
	description: '',
	nodeCode: '',
});

const nodeDefinitionText = ref('');

const nodeDefinitionExample = `{
  "name": "WeatherQuery",
  "displayName": "天气查询",
  "description": "查询指定城市的天气信息",
  "version": 1,
  "defaults": {
    "name": "天气查询"
  },
  "inputs": ["main"],
  "outputs": ["main"],
  "properties": [
    {
      "displayName": "城市",
      "name": "city",
      "type": "string",
      "default": "",
      "required": true,
      "description": "要查询的城市名称"
    }
  ]
}`;

const rules: Record<string, Rule[]> = {
	nodeKey: [
		{ required: true, message: '请输入节点标识', trigger: 'blur' },
		{
			pattern: /^[a-z0-9-]+$/,
			message: '只能包含小写字母、数字和连字符',
			trigger: 'blur',
		},
	],
	nodeName: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
	nodeType: [{ required: true, message: '请选择节点类型', trigger: 'change' }],
	nodeDefinition: [
		{
			validator: (_rule: Rule, _value: string) => {
				if (!nodeDefinitionText.value.trim()) {
					return Promise.reject('请输入节点定义');
				}
				try {
					JSON.parse(nodeDefinitionText.value);
					return Promise.resolve();
				} catch {
					return Promise.reject('节点定义必须是有效的 JSON 格式');
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

const handleSubmit = async (): Promise<void> => {
	try {
		await formRef.value?.validate();

		loading.value = true;

		// 解析 nodeDefinition
		let nodeDefinition: Record<string, unknown>;
		try {
			nodeDefinition = JSON.parse(nodeDefinitionText.value);
		} catch (error) {
			message.error('节点定义 JSON 格式错误');
			return;
		}

		// 构造提交数据
		const submitData = {
			nodeKey: formData.nodeKey,
			nodeName: formData.nodeName,
			nodeType: formData.nodeType,
			nodeDefinition,
			category: formData.category || undefined,
			version: formData.version || '1.0.0',
			iconUrl: formData.iconUrl || undefined,
			description: formData.description || undefined,
			nodeCode: formData.nodeCode || undefined,
		};

		// 触发成功事件（由父组件调用 store）
		emit('success', submitData);
		message.success('节点创建成功');
		handleCancel();
	} catch (error: any) {
		if (error.errorFields) {
			// 表单验证错误
			return;
		}

		console.error('Create node error:', error);
		const errorMessage =
			error.response?.data?.message || error.message || '创建节点失败，请稍后重试';
		message.error(errorMessage);
	} finally {
		loading.value = false;
	}
};

const handleCancel = (): void => {
	formRef.value?.resetFields();
	nodeDefinitionText.value = '';
	formData.nodeKey = '';
	formData.nodeName = '';
	formData.nodeType = 'platform_official';
	formData.category = '';
	formData.version = '1.0.0';
	formData.iconUrl = '';
	formData.description = '';
	formData.nodeCode = '';
	validationResult.value = { valid: true, errors: [], warnings: [] };
	emit('update:open', false);
};

/**
 * 验证节点定义结构
 */
function validateNodeDefinitionStructure(nodeDefText: string): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// 1. JSON 格式检查
	if (!nodeDefText.trim()) {
		return { valid: true, errors: [], warnings: [] };
	}

	let def: any;
	try {
		def = JSON.parse(nodeDefText);
	} catch {
		return {
			valid: false,
			errors: [{ code: 'INVALID_JSON', message: 'JSON 格式错误' }],
			warnings: [],
		};
	}

	// 2. 必需字段检查
	const requiredFields = ['name', 'displayName', 'version', 'properties'];
	for (const field of requiredFields) {
		if (!def[field]) {
			errors.push({
				code: 'MISSING_REQUIRED_FIELD',
				message: `缺少必需字段: ${field}`,
				field,
			});
		}
	}

	// 3. 字段类型检查
	if (def.name && typeof def.name !== 'string') {
		errors.push({
			code: 'INVALID_FIELD_TYPE',
			message: 'name 必须是字符串',
			field: 'name',
		});
	}

	if (def.displayName && typeof def.displayName !== 'string') {
		errors.push({
			code: 'INVALID_FIELD_TYPE',
			message: 'displayName 必须是字符串',
			field: 'displayName',
		});
	}

	if (
		def.version &&
		typeof def.version !== 'number' &&
		!(Array.isArray(def.version) && def.version.every((v: any) => typeof v === 'number'))
	) {
		errors.push({
			code: 'INVALID_FIELD_TYPE',
			message: 'version 必须是数字或数字数组',
			field: 'version',
		});
	}

	if (def.properties && !Array.isArray(def.properties)) {
		errors.push({
			code: 'INVALID_FIELD_TYPE',
			message: 'properties 必须是数组',
			field: 'properties',
		});
	} else if (Array.isArray(def.properties)) {
		// 验证每个 property
		def.properties.forEach((prop: any, index: number) => {
			if (!prop.name) {
				errors.push({
					code: 'INVALID_PROPERTY',
					message: `properties[${index}] 缺少 name 字段`,
					field: `properties[${index}].name`,
				});
			}
			if (!prop.displayName) {
				warnings.push({
					code: 'MISSING_DISPLAY_NAME',
					message: `properties[${index}] 建议提供 displayName`,
					field: `properties[${index}].displayName`,
				});
			}
		});
	}

	// 4. 可选字段建议
	if (!def.inputs) {
		warnings.push({
			code: 'MISSING_OPTIONAL_FIELD',
			message: '建议提供 inputs 字段',
			field: 'inputs',
		});
	}

	if (!def.outputs) {
		warnings.push({
			code: 'MISSING_OPTIONAL_FIELD',
			message: '建议提供 outputs 字段',
			field: 'outputs',
		});
	}

	if (!def.description) {
		warnings.push({
			code: 'MISSING_DESCRIPTION',
			message: '建议提供 description 字段',
			field: 'description',
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

// 监听 nodeDefinitionText 变化，实时验证
watch(nodeDefinitionText, (newValue) => {
	validationResult.value = validateNodeDefinitionStructure(newValue);
});
</script>

<style scoped lang="scss">
.form-item-hint {
	margin-top: 4px;
	font-size: 12px;
	color: var(--color--text--tint-2);
}
</style>
