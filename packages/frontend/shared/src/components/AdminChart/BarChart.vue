<template>
	<AdminChart :option="chartOption" :width="width" :height="height" :theme="theme" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AdminChart from './AdminChart.vue';
import type { EChartsOption } from 'echarts';

interface Props {
	data: Array<{ name: string; value: number }>;
	title?: string;
	xAxisLabel?: string;
	yAxisLabel?: string;
	width?: string;
	height?: string;
	theme?: 'light' | 'dark';
	horizontal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	xAxisLabel: '',
	yAxisLabel: '',
	width: '100%',
	height: '400px',
	theme: 'dark',
	horizontal: false,
});

const chartOption = computed<EChartsOption>(() => {
	const config: EChartsOption = {
		title: {
			text: props.title,
			left: 'center',
			textStyle: {
				color: '#fff',
			},
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow',
			},
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '3%',
			containLabel: true,
		},
		series: [
			{
				type: 'bar',
				data: props.data.map((item) => item.value),
				itemStyle: {
					borderRadius: [5, 5, 0, 0],
				},
			},
		],
	};

	if (props.horizontal) {
		// Horizontal bar chart
		config.xAxis = {
			type: 'value',
			name: props.xAxisLabel,
		};
		config.yAxis = {
			type: 'category',
			data: props.data.map((item) => item.name),
			name: props.yAxisLabel,
		};
	} else {
		// Vertical bar chart
		config.xAxis = {
			type: 'category',
			data: props.data.map((item) => item.name),
			name: props.xAxisLabel,
		};
		config.yAxis = {
			type: 'value',
			name: props.yAxisLabel,
		};
	}

	return config;
});
</script>
