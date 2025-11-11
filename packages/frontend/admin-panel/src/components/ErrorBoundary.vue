<template>
	<div v-if="hasError" class="error-boundary">
		<a-result status="error" :title="$t('admin.error.boundaryTitle')" :sub-title="errorMessage">
			<template #extra>
				<a-space>
					<a-button type="primary" @click="handleRetry">
						{{ $t('admin.error.retry') }}
					</a-button>
					<a-button @click="handleReload">
						{{ $t('admin.error.reload') }}
					</a-button>
					<a-button v-if="showDetails" type="link" @click="toggleDetails">
						{{ detailsVisible ? $t('admin.error.hideDetails') : $t('admin.error.showDetails') }}
					</a-button>
				</a-space>
			</template>
		</a-result>

		<!-- 错误详情（仅开发环境显示） -->
		<a-card v-if="detailsVisible && errorStack" class="error-details">
			<template #title>
				<ExclamationCircleOutlined />
				{{ $t('admin.error.details') }}
			</template>
			<pre class="error-stack">{{ errorStack }}</pre>
		</a-card>
	</div>
	<slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 错误状态
const hasError = ref(false);
const errorMessage = ref('');
const errorStack = ref('');
const detailsVisible = ref(false);

// 是否显示详情按钮（仅开发环境）
const showDetails = computed(() => {
	return import.meta.env.DEV;
});

// 捕获子组件错误
onErrorCaptured((err: Error, instance, info) => {
	console.error('[ErrorBoundary] Captured error:', err);
	console.error('[ErrorBoundary] Component:', instance);
	console.error('[ErrorBoundary] Error info:', info);

	// 设置错误状态
	hasError.value = true;
	errorMessage.value = err.message || t('admin.error.unknownError');
	errorStack.value = err.stack || '';

	// 阻止错误继续传播
	return false;
});

// 重试（重置错误状态）
const handleRetry = () => {
	hasError.value = false;
	errorMessage.value = '';
	errorStack.value = '';
	detailsVisible.value = false;
};

// 重新加载页面
const handleReload = () => {
	window.location.reload();
};

// 切换详情显示
const toggleDetails = () => {
	detailsVisible.value = !detailsVisible.value;
};
</script>

<style lang="scss" scoped>
.error-boundary {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--admin-spacing-2xl);
	background: var(--admin-bg-primary);

	:deep(.ant-result) {
		padding: var(--admin-spacing-2xl);
		background: var(--admin-bg-secondary);
		border-radius: var(--admin-border-radius-lg);
		box-shadow: var(--admin-shadow-lg);
	}

	:deep(.ant-result-title) {
		color: var(--admin-text-primary);
		font-size: 24px;
		font-weight: 600;
	}

	:deep(.ant-result-subtitle) {
		color: var(--admin-text-secondary);
		font-size: 16px;
		max-width: 600px;
		word-break: break-word;
	}

	:deep(.ant-result-icon) {
		.anticon {
			color: var(--admin-error);
			font-size: 72px;
		}
	}
}

.error-details {
	margin-top: var(--admin-spacing-xl);
	max-width: 800px;
	width: 100%;
	background: var(--admin-bg-secondary);
	border-color: var(--admin-border-color);

	:deep(.ant-card-head) {
		background: var(--admin-bg-tertiary);
		border-color: var(--admin-border-color);
		color: var(--admin-text-primary);

		.anticon {
			color: var(--admin-error);
			margin-right: var(--admin-spacing-sm);
		}
	}

	:deep(.ant-card-body) {
		padding: 0;
	}
}

.error-stack {
	margin: 0;
	padding: var(--admin-spacing-md);
	background: var(--admin-bg-primary);
	color: var(--admin-error);
	font-family: 'Courier New', monospace;
	font-size: 12px;
	line-height: 1.6;
	overflow-x: auto;
	white-space: pre-wrap;
	word-wrap: break-word;
	border-radius: var(--admin-border-radius-sm);
	border: 1px solid var(--admin-border-color);
}

// 响应式适配
@media (max-width: 768px) {
	.error-boundary {
		padding: var(--admin-spacing-md);

		:deep(.ant-result) {
			padding: var(--admin-spacing-lg);
		}

		:deep(.ant-result-title) {
			font-size: 20px;
		}

		:deep(.ant-result-subtitle) {
			font-size: 14px;
		}

		:deep(.ant-result-icon) {
			.anticon {
				font-size: 56px;
			}
		}
	}

	.error-details {
		max-width: 100%;
	}

	.error-stack {
		font-size: 11px;
		padding: var(--admin-spacing-sm);
	}
}
</style>
