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
	width?: string;
	height?: string;
	theme?: 'light' | 'dark';
	showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	width: '100%',
	height: '400px',
	theme: 'dark',
	showLabel: true,
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
		trigger: 'item',
		formatter: '{a} <br/>{b}: {c} ({d}%)',
	},
	legend: {
		orient: 'vertical',
		left: 'left',
		textStyle: {
			color: '#fff',
		},
	},
	series: [
		{
			name: props.title,
			type: 'pie',
			radius: ['40%', '70%'],
			avoidLabelOverlap: false,
			itemStyle: {
				borderRadius: 10,
				borderColor: '#1f1f1f',
				borderWidth: 2,
			},
			label: {
				show: props.showLabel,
				formatter: '{b}: {d}%',
			},
			emphasis: {
				label: {
					show: true,
					fontSize: 16,
					fontWeight: 'bold',
				},
			},
			labelLine: {
				show: props.showLabel,
			},
			data: props.data,
		},
	],
}));
</script>
