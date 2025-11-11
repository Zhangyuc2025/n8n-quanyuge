<template>
	<a-card :bordered="false" class="statistics-card" :class="gradientClass">
		<div class="card-content">
			<div class="card-header">
				<component :is="iconComponent" class="card-icon" />
				<span class="card-title">{{ title }}</span>
			</div>
			<div class="card-value">{{ displayValue }}</div>
			<div v-if="trend !== undefined" class="card-trend" :class="trendClass">
				<ArrowUpOutlined v-if="trend > 0" />
				<ArrowDownOutlined v-if="trend < 0" />
				<span>{{ trendText }}</span>
			</div>
		</div>
	</a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
	TeamOutlined,
	UserOutlined,
	WalletOutlined,
	DollarOutlined,
	ArrowUpOutlined,
	ArrowDownOutlined,
} from '@ant-design/icons-vue';

interface Props {
	title: string;
	value: number | string;
	icon?: 'team' | 'user' | 'wallet' | 'dollar';
	trend?: number; // 百分比，正数表示上升，负数表示下降
	format?: 'number' | 'currency';
	gradient?: 'blue' | 'green' | 'orange' | 'purple';
}

const props = withDefaults(defineProps<Props>(), {
	icon: 'dollar',
	format: 'number',
	gradient: 'blue',
});

const iconComponent = computed(() => {
	const iconMap = {
		team: TeamOutlined,
		user: UserOutlined,
		wallet: WalletOutlined,
		dollar: DollarOutlined,
	};
	return iconMap[props.icon];
});

const displayValue = computed(() => {
	if (typeof props.value === 'string') return props.value;

	if (props.format === 'currency') {
		return `¥${props.value.toFixed(2)}`;
	}

	// 格式化数字，添加千位分隔符
	return props.value.toLocaleString('zh-CN');
});

const trendText = computed(() => {
	if (props.trend === undefined) return '';
	const absValue = Math.abs(props.trend);
	return `${props.trend > 0 ? '+' : ''}${absValue.toFixed(1)}%`;
});

const trendClass = computed(() => {
	if (props.trend === undefined) return '';
	return props.trend > 0 ? 'trend-up' : 'trend-down';
});

const gradientClass = computed(() => `gradient-${props.gradient}`);
</script>

<style scoped lang="scss">
.statistics-card {
	border-radius: var(--radius-lg);
	overflow: hidden;
	transition: all 0.3s ease;

	&:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	&.gradient-blue {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	&.gradient-green {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	}

	&.gradient-orange {
		background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
	}

	&.gradient-purple {
		background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
	}

	:deep(.ant-card-body) {
		padding: var(--admin-spacing-lg);
	}
}

.card-content {
	color: white;
}

.card-header {
	display: flex;
	align-items: center;
	gap: var(--admin-spacing-xs);
	margin-bottom: var(--admin-spacing-md);
}

.card-icon {
	font-size: 24px;
	opacity: 0.9;
}

.card-title {
	font-size: var(--admin-font-size-md);
	font-weight: var(--admin-font-weight-regular);
	opacity: 0.9;
}

.card-value {
	font-size: var(--admin-font-size-2xl);
	font-weight: var(--admin-font-weight-bold);
	margin-bottom: var(--admin-spacing-sm);
	line-height: 1.2;
}

.card-trend {
	display: flex;
	align-items: center;
	gap: var(--admin-spacing-3xs);
	font-size: var(--admin-font-size-sm);
	font-weight: var(--admin-font-weight-bold);

	&.trend-up {
		color: #52c41a;
	}

	&.trend-down {
		color: #ff4d4f;
	}
}
</style>
