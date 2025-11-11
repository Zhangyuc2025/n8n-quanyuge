<template>
	<a-modal
		:open="open"
		title="工作空间充值"
		:confirm-loading="loading"
		@ok="handleSubmit"
		@cancel="handleCancel"
		width="500px"
	>
		<a-form ref="formRef" :model="formState" :rules="rules" layout="vertical" class="recharge-form">
			<a-alert
				:message="`工作空间：${workspaceName}`"
				type="info"
				show-icon
				style="margin-bottom: 16px"
			/>

			<a-alert
				v-if="currentBalance !== undefined"
				:message="`当前余额：${formatCurrency(currentBalance)}`"
				:type="getBalanceAlertType(currentBalance)"
				show-icon
				style="margin-bottom: 16px"
			/>

			<a-form-item label="充值金额（元）" name="amount">
				<a-input-number
					v-model:value="formState.amount"
					:min="1"
					:step="100"
					:precision="2"
					placeholder="请输入充值金额"
					style="width: 100%"
				>
					<template #addonAfter>元</template>
				</a-input-number>
			</a-form-item>

			<div class="quick-amount-buttons">
				<a-button
					v-for="amount in quickAmounts"
					:key="amount"
					:type="formState.amount === amount ? 'primary' : 'default'"
					@click="formState.amount = amount"
				>
					{{ amount }} 元
				</a-button>
			</div>

			<a-form-item label="充值原因" name="reason">
				<a-textarea
					v-model:value="formState.reason"
					:rows="4"
					placeholder="请输入充值原因（必填）"
					show-count
					:maxlength="200"
				/>
			</a-form-item>

			<a-alert
				v-if="formState.amount"
				:message="`充值后余额：${formatCurrency((currentBalance || 0) + formState.amount)}`"
				type="success"
				show-icon
			/>
		</a-form>
	</a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import { formatCurrency } from '@n8n/shared';
import { useWorkspacesStore } from '@/stores/workspaces.store';
import type { FormInstance } from 'ant-design-vue';

interface Props {
	open: boolean;
	workspaceId: string;
	workspaceName: string;
	currentBalance?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	'update:open': [value: boolean];
	success: [];
}>();

const workspacesStore = useWorkspacesStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

const quickAmounts = [100, 500, 1000, 5000];

const formState = reactive({
	amount: 100,
	reason: '',
});

const rules = {
	amount: [
		{ required: true, message: '请输入充值金额', trigger: 'change' },
		{
			type: 'number',
			min: 1,
			message: '充值金额不能小于 1 元',
			trigger: 'change',
		},
	],
	reason: [
		{ required: true, message: '请输入充值原因', trigger: 'blur' },
		{ min: 5, message: '充值原因至少 5 个字符', trigger: 'blur' },
	],
};

const getBalanceAlertType = (balance: number): string => {
	if (balance < 100) return 'error';
	if (balance < 1000) return 'warning';
	return 'info';
};

const handleSubmit = async (): Promise<void> => {
	try {
		await formRef.value?.validate();

		loading.value = true;

		await workspacesStore.rechargeWorkspace(props.workspaceId, {
			amount: formState.amount,
			reason: formState.reason,
		});

		message.success('充值成功');
		emit('success');
		handleCancel();
	} catch (error: any) {
		if (error.errorFields) {
			// 表单验证错误
			return;
		}

		console.error('Recharge error:', error);
		const errorMessage = error.response?.data?.message || error.message || '充值失败，请稍后重试';
		message.error(errorMessage);
	} finally {
		loading.value = false;
	}
};

const handleCancel = (): void => {
	formRef.value?.resetFields();
	formState.amount = 100;
	formState.reason = '';
	emit('update:open', false);
};

// Reset form when dialog opens
watch(
	() => props.open,
	(newValue) => {
		if (newValue) {
			formRef.value?.resetFields();
			formState.amount = 100;
			formState.reason = '';
		}
	},
);
</script>

<style scoped lang="scss">
.recharge-form {
	margin-top: 16px;
}

.quick-amount-buttons {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}
</style>
