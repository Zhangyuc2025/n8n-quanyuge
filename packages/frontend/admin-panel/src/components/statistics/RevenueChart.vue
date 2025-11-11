<template>
	<div class="revenue-chart">
		<div class="chart-header">
			<h3 class="chart-title">营收趋势</h3>
			<a-range-picker
				v-model:value="dateRange"
				:presets="rangePresets"
				format="YYYY-MM-DD"
				@change="handleDateChange"
			/>
		</div>
		<div ref="chartRef" class="chart-container"></div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import * as echarts from 'echarts';
import dayjs, { type Dayjs } from 'dayjs';
import type { RevenueData } from '@/types/admin.types';

interface Props {
	data?: RevenueData | null;
	loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	data: null,
	loading: false,
});

const emit = defineEmits<{
	(e: 'date-change', value: { startDate: string; endDate: string }): void;
}>();

const chartRef = ref<HTMLElement>();
const chartInstance = ref<echarts.ECharts>();
const dateRange = ref<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);

// 快捷日期选项
const rangePresets = computed(() => [
	{ label: '最近7天', value: [dayjs().subtract(7, 'day'), dayjs()] as [Dayjs, Dayjs] },
	{ label: '最近30天', value: [dayjs().subtract(30, 'day'), dayjs()] as [Dayjs, Dayjs] },
	{ label: '本月', value: [dayjs().startOf('month'), dayjs()] as [Dayjs, Dayjs] },
	{
		label: '上月',
		value: [
			dayjs().subtract(1, 'month').startOf('month'),
			dayjs().subtract(1, 'month').endOf('month'),
		] as [Dayjs, Dayjs],
	},
]);

const handleDateChange = () => {
	if (!dateRange.value || dateRange.value.length !== 2) return;

	const [start, end] = dateRange.value;
	emit('date-change', {
		startDate: start.format('YYYY-MM-DD'),
		endDate: end.format('YYYY-MM-DD'),
	});
};

const initChart = () => {
	if (!chartRef.value) return;

	chartInstance.value = echarts.init(chartRef.value, 'dark');

	const option: echarts.EChartsOption = {
		tooltip: {
			trigger: 'axis',
			backgroundColor: 'rgba(0, 0, 0, 0.8)',
			borderWidth: 0,
			textStyle: {
				color: '#fff',
			},
			formatter: (params: any) => {
				const data = params[0];
				return `
					<div style="padding: 8px;">
						<div style="margin-bottom: 4px;">${data.name}</div>
						<div style="color: #52c41a;">营收: ¥${data.value.toFixed(2)}</div>
					</div>
				`;
			},
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '3%',
			top: '10%',
			containLabel: true,
		},
		xAxis: {
			type: 'category',
			data: [],
			boundaryGap: false,
			axisLine: {
				lineStyle: {
					color: '#555',
				},
			},
			axisLabel: {
				color: '#999',
			},
		},
		yAxis: {
			type: 'value',
			name: '营收 (¥)',
			axisLine: {
				show: false,
			},
			axisTick: {
				show: false,
			},
			axisLabel: {
				color: '#999',
				formatter: (value: number) => `¥${value.toFixed(0)}`,
			},
			splitLine: {
				lineStyle: {
					color: '#333',
				},
			},
		},
		series: [
			{
				name: '营收',
				type: 'line',
				smooth: true,
				symbol: 'circle',
				symbolSize: 8,
				data: [],
				itemStyle: {
					color: '#52c41a',
				},
				lineStyle: {
					width: 3,
					color: '#52c41a',
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
						{ offset: 1, color: 'rgba(82, 196, 26, 0.05)' },
					]),
				},
			},
		],
	};

	chartInstance.value.setOption(option);
};

const updateChart = () => {
	if (!chartInstance.value || !props.data) return;

	// 生成模拟的每日数据（实际应从后端获取）
	const dates: string[] = [];
	const revenues: number[] = [];

	const { dateRange: range } = props.data;
	const days = range.days;
	const avgRevenue = props.data.avgRevenuePerDay;

	const startDate = dayjs(range.startDate);
	for (let i = 0; i < days; i++) {
		const currentDate = startDate.add(i, 'day');
		dates.push(currentDate.format('MM-DD'));
		// 添加一些随机波动使图表更真实
		const variance = (Math.random() - 0.5) * avgRevenue * 0.3;
		revenues.push(Math.max(0, avgRevenue + variance));
	}

	chartInstance.value.setOption({
		xAxis: {
			data: dates,
		},
		series: [
			{
				data: revenues,
			},
		],
	});
};

const handleResize = () => {
	chartInstance.value?.resize();
};

onMounted(() => {
	initChart();
	window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
	window.removeEventListener('resize', handleResize);
	chartInstance.value?.dispose();
});

watch(() => props.data, updateChart, { deep: true });
</script>

<style scoped lang="scss">
.revenue-chart {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.chart-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--admin-spacing-md);
}

.chart-title {
	margin: 0;
	font-size: var(--admin-font-size-lg);
	font-weight: var(--admin-font-weight-bold);
}

.chart-container {
	flex: 1;
	min-height: 300px;
	width: 100%;
}
</style>
