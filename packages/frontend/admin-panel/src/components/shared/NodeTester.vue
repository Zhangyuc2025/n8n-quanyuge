<template>
	<div class="node-tester">
		<a-form layout="vertical">
			<a-form-item label="测试输入数据 (可选)">
				<CodeEditor
					v-model="testInputText"
					language="json"
					:rows="6"
					placeholder='[{"json": {"name": "测试数据"}}]'
				/>
				<div class="form-item-hint">
					提供测试输入数据（n8n 格式），格式为：<code>[{ "json": {...} }]</code>
				</div>
			</a-form-item>

			<a-form-item>
				<a-space>
					<a-button type="primary" :loading="testing" @click="handleTest">
						<template #icon>
							<ExperimentOutlined />
						</template>
						运行测试
					</a-button>
					<a-button v-if="testResult" @click="clearResult">清除结果</a-button>
				</a-space>
			</a-form-item>
		</a-form>

		<!-- 测试结果显示 -->
		<div v-if="testResult" class="test-result">
			<a-alert
				:type="testResult.success ? 'success' : 'error'"
				:message="testResult.success ? '✅ 测试通过' : '❌ 测试失败'"
				show-icon
				style="margin-bottom: 16px"
			>
				<template v-if="testResult.message" #description>
					{{ testResult.message }}
				</template>
			</a-alert>

			<!-- 执行时间 -->
			<div v-if="testResult.executionTime" class="result-meta">
				<span>执行时间: {{ testResult.executionTime }}ms</span>
			</div>

			<!-- 输出数据 -->
			<div v-if="testResult.output" class="result-section">
				<h4>输出数据</h4>
				<CodeEditor
					v-model="outputText"
					language="json"
					:rows="10"
					:readonly="true"
					:show-footer="false"
				/>
			</div>

			<!-- 错误详情 -->
			<div v-if="testResult.error" class="result-section">
				<h4>错误详情</h4>
				<pre class="error-details">{{ testResult.error }}</pre>
			</div>

			<!-- 验证结果 -->
			<div v-if="testResult.validation" class="result-section">
				<h4>验证结果</h4>
				<a-alert
					v-for="(issue, index) in testResult.validation.issues"
					:key="index"
					:type="issue.severity === 'error' ? 'error' : 'warning'"
					:message="issue.message"
					show-icon
					style="margin-bottom: 8px"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { ExperimentOutlined } from '@ant-design/icons-vue';
import CodeEditor from './CodeEditor.vue';
import { adminApiClient } from '@n8n/shared';

interface TestResult {
	success: boolean;
	message?: string;
	output?: any;
	error?: string;
	executionTime?: number;
	validation?: {
		valid: boolean;
		issues: Array<{
			severity: 'error' | 'warning';
			message: string;
		}>;
	};
}

interface Props {
	nodeDefinition: Record<string, unknown> | null;
	nodeCode?: string;
	apiEndpoint: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(e: 'test-result', result: TestResult): void;
}>();

const testing = ref(false);
const testInputText = ref('');
const testResult = ref<TestResult | null>(null);
const outputText = ref('');

watch(
	() => testResult.value?.output,
	(newOutput) => {
		if (newOutput) {
			outputText.value = JSON.stringify(newOutput, null, 2);
		}
	},
);

const handleTest = async (): Promise<void> => {
	if (!props.nodeDefinition) {
		message.error('请先填写节点定义');
		return;
	}

	testing.value = true;
	testResult.value = null;

	try {
		// 解析测试输入
		let testInput: any[] | undefined;
		if (testInputText.value.trim()) {
			try {
				testInput = JSON.parse(testInputText.value);
				if (!Array.isArray(testInput)) {
					message.error('测试输入必须是数组格式');
					testing.value = false;
					return;
				}
			} catch {
				message.error('测试输入 JSON 格式错误');
				testing.value = false;
				return;
			}
		}

		// 调用测试 API
		const response = await adminApiClient.post<TestResult>(props.apiEndpoint, {
			nodeDefinition: props.nodeDefinition,
			nodeCode: props.nodeCode || undefined,
			testInput: testInput,
		});

		testResult.value = response.data;
		emit('test-result', response.data);

		if (response.data.success) {
			message.success('节点测试通过');
		} else {
			message.error('节点测试失败');
		}
	} catch (error: any) {
		const errorMessage = error.response?.data?.message || error.message || '测试失败，请稍后重试';
		testResult.value = {
			success: false,
			message: errorMessage,
			error: error.response?.data?.error || error.stack || String(error),
		};
		emit('test-result', testResult.value);
		message.error(errorMessage);
	} finally {
		testing.value = false;
	}
};

const clearResult = (): void => {
	testResult.value = null;
	outputText.value = '';
};
</script>

<style scoped lang="scss">
.node-tester {
	.form-item-hint {
		margin-top: 4px;
		font-size: 12px;
		color: var(--color--text--tint-2);

		code {
			padding: 2px 6px;
			background-color: var(--color--background--shade-1);
			border-radius: 3px;
			font-family: monospace;
			font-size: 11px;
		}
	}

	.test-result {
		margin-top: 24px;
		padding-top: 24px;
		border-top: 1px solid var(--color--foreground);

		.result-meta {
			margin-bottom: 16px;
			font-size: 13px;
			color: var(--color--text--tint-1);

			span {
				padding: 4px 12px;
				background-color: var(--color--background--shade-1);
				border-radius: var(--radius);
			}
		}

		.result-section {
			margin-top: 16px;

			h4 {
				margin-bottom: 8px;
				font-size: 14px;
				font-weight: 600;
				color: var(--color--text);
			}

			.error-details {
				padding: 12px;
				background-color: var(--color--background--shade-1);
				border: 1px solid var(--color--danger--tint-3);
				border-radius: var(--radius);
				font-family: monospace;
				font-size: 12px;
				color: var(--color--danger);
				overflow-x: auto;
				white-space: pre-wrap;
				word-wrap: break-word;
			}
		}
	}
}
</style>
