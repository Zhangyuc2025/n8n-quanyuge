import type { INodePropertyOptions } from 'n8n-workflow';

// Disable some charts that use different datasets for now
export const CHART_TYPE_OPTIONS: INodePropertyOptions[] = [
	{
		name: '柱状图',
		value: 'bar',
	},
	{
		name: '环形图',
		value: 'doughnut',
	},
	{
		name: '折线图',
		value: 'line',
	},
	{
		name: '饼图',
		value: 'pie',
	},
	{
		name: '极坐标图',
		value: 'polarArea',
	},
];

export const HORIZONTAL_CHARTS = ['bar', 'boxplot', 'violin'];
export const ITEM_STYLE_CHARTS = ['boxplot', 'horizontalBoxplot', 'violin', 'horizontalViolin'];
export const Fill_CHARTS = ['line'];
export const POINT_STYLE_CHARTS = ['line'];
