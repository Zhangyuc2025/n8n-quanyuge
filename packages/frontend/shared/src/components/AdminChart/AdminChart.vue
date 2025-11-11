<template>
	<div ref="chartRef" :style="{ width, height }" class="admin-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';

interface Props {
	option: EChartsOption;
	width?: string;
	height?: string;
	theme?: 'light' | 'dark';
}

const props = withDefaults(defineProps<Props>(), {
	width: '100%',
	height: '400px',
	theme: 'dark',
});

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: ECharts | null = null;

const initChart = (): void => {
	if (!chartRef.value) return;

	// Initialize chart instance
	chartInstance = echarts.init(chartRef.value, props.theme);

	// Set option
	chartInstance.setOption(props.option);

	// Handle resize
	window.addEventListener('resize', handleResize);
};

const handleResize = (): void => {
	chartInstance?.resize();
};

const updateChart = (): void => {
	if (chartInstance) {
		chartInstance.setOption(props.option, { notMerge: true });
	}
};

// Watch for option changes
watch(
	() => props.option,
	() => {
		nextTick(() => {
			updateChart();
		});
	},
	{ deep: true },
);

onMounted(() => {
	nextTick(() => {
		initChart();
	});
});

onBeforeUnmount(() => {
	if (chartInstance) {
		window.removeEventListener('resize', handleResize);
		chartInstance.dispose();
		chartInstance = null;
	}
});

// Expose methods
defineExpose({
	getInstance: () => chartInstance,
	resize: handleResize,
});
</script>

<style scoped lang="scss">
.admin-chart {
	min-height: 300px;
}
</style>
