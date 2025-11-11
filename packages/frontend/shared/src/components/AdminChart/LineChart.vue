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
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	xAxisLabel: '',
	yAxisLabel: '',
	width: '100%',
	height: '400px',
	theme: 'dark',
});

const chartOption = computed<EChartsOption>(() => ({
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
			type: 'cross',
		},
	},
	grid: {
		left: '3%',
		right: '4%',
		bottom: '3%',
		containLabel: true,
	},
	xAxis: {
		type: 'category',
		boundaryGap: false,
		data: props.data.map((item) => item.name),
		name: props.xAxisLabel,
	},
	yAxis: {
		type: 'value',
		name: props.yAxisLabel,
	},
	series: [
		{
			type: 'line',
			smooth: true,
			data: props.data.map((item) => item.value),
			areaStyle: {
				opacity: 0.3,
			},
			lineStyle: {
				width: 2,
			},
		},
	],
}));
</script>
