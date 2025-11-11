<template>
	<a-card :bordered="false" class="statistics-card">
		<div class="card-content">
			<div class="card-icon" :style="{ backgroundColor: iconBgColor }">
				<component :is="icon" :style="{ color: iconColor, fontSize: '24px' }" />
			</div>
			<div class="card-info">
				<div class="card-title">{{ title }}</div>
				<div class="card-value">
					<span v-if="prefix" class="value-prefix">{{ prefix }}</span>
					<a-statistic
						:value="value"
						:precision="precision"
						:valueStyle="{ fontSize: '28px', fontWeight: 600, color: 'var(--admin-text-primary)' }"
					/>
					<span v-if="suffix" class="value-suffix">{{ suffix }}</span>
				</div>
				<div v-if="trend !== undefined" class="card-trend">
					<span :class="['trend-indicator', trendClass]">
						<ArrowUpOutlined v-if="trend > 0" />
						<ArrowDownOutlined v-if="trend < 0" />
						{{ Math.abs(trend) }}%
					</span>
					<span class="trend-label">较昨日</span>
				</div>
			</div>
		</div>
	</a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons-vue';

interface Props {
	title: string;
	value: number;
	prefix?: string;
	suffix?: string;
	trend?: number;
	icon: any;
	iconColor?: string;
	iconBgColor?: string;
	precision?: number;
}

const props = withDefaults(defineProps<Props>(), {
	prefix: '',
	suffix: '',
	iconColor: '#1890ff',
	iconBgColor: '#e6f7ff',
	precision: 0,
});

const trendClass = computed(() => {
	if (props.trend === undefined) return '';
	return props.trend > 0 ? 'trend-up' : props.trend < 0 ? 'trend-down' : '';
});
</script>

<style scoped lang="scss">
.statistics-card {
	height: 100%;

	:deep(.ant-card-body) {
		padding: var(--admin-spacing-lg);
	}
}

.card-content {
	display: flex;
	align-items: flex-start;
	gap: var(--admin-spacing-md);
}

.card-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56px;
	height: 56px;
	border-radius: var(--admin-border-radius);
	flex-shrink: 0;
}

.card-info {
	flex: 1;
	min-width: 0;
}

.card-title {
	font-size: 14px;
	color: var(--admin-text-secondary);
	margin-bottom: var(--admin-spacing-xs);
}

.card-value {
	display: flex;
	align-items: baseline;
	gap: var(--admin-spacing-2xs);
	margin-bottom: var(--admin-spacing-xs);

	.value-prefix,
	.value-suffix {
		font-size: 20px;
		font-weight: 600;
		color: var(--admin-text-primary);
	}
}

.card-trend {
	display: flex;
	align-items: center;
	gap: var(--admin-spacing-xs);
	font-size: 13px;

	.trend-indicator {
		display: flex;
		align-items: center;
		gap: 4px;
		font-weight: 500;

		&.trend-up {
			color: #52c41a;
		}

		&.trend-down {
			color: #ff4d4f;
		}
	}

	.trend-label {
		color: var(--admin-text-secondary);
	}
}
</style>
