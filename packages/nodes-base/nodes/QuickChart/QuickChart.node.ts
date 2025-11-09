import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	CHART_TYPE_OPTIONS,
	Fill_CHARTS,
	HORIZONTAL_CHARTS,
	ITEM_STYLE_CHARTS,
	POINT_STYLE_CHARTS,
} from './constants';
import type { IDataset } from './types';

export class QuickChart implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuickChart',
		name: 'quickChart',
		icon: 'file:quickChart.svg',
		group: ['output'],
		description: '通过 QuickChart 创建图表',
		version: 1,
		defaults: {
			name: 'QuickChart',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '图表类型',
				name: 'chartType',
				type: 'options',
				default: 'bar',
				options: CHART_TYPE_OPTIONS,
				description: '要创建的图表类型',
			},
			{
				displayName: '添加标签',
				name: 'labelsMode',
				type: 'options',
				options: [
					{
						name: '手动',
						value: 'manually',
					},
					{
						name: '从数组',
						value: 'array',
					},
				],
				default: 'manually',
			},
			{
				displayName: '标签',
				name: 'labelsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				required: true,
				description: '图表中使用的标签',
				placeholder: '添加标签',
				options: [
					{
						name: 'labelsValues',
						displayName: '标签',
						values: [
							{
								displayName: '标签',
								name: 'label',
								type: 'string',
								default: '',
							},
						],
					},
				],
				displayOptions: {
					show: {
						labelsMode: ['manually'],
					},
				},
			},
			{
				displayName: '标签数组',
				name: 'labelsArray',
				type: 'string',
				required: true,
				default: '',
				placeholder: '例如：["北京", "上海", "广州", "深圳"]',
				displayOptions: {
					show: {
						labelsMode: ['array'],
					},
				},
				description: '图表中使用的标签数组',
			},
			{
				displayName: '数据',
				name: 'data',
				type: 'json',
				default: '',
				description:
					'用于数据集的数据，文档和示例参见<a href="https://quickchart.io/documentation/chart-types/" target="_blank">这里</a>',
				placeholder: '例如：[60, 10, 12, 20]',
				required: true,
			},
			{
				displayName: '输出字段',
				name: 'output',
				type: 'string',
				default: 'data',
				required: true,
				description: '二进制数据将显示在右侧输出面板的二进制选项卡下',
				hint: '用于放置二进制文件数据的输出字段名称',
			},
			{
				displayName: '图表选项',
				name: 'chartOptions',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '背景颜色',
						name: 'backgroundColor',
						type: 'color',
						typeOptions: {
							showAlpha: true,
						},
						default: '',
						description: '图表的背景颜色',
					},
					{
						displayName: '设备像素比',
						name: 'devicePixelRatio',
						type: 'number',
						default: 2,
						typeOptions: {
							minValue: 1,
							maxValue: 2,
						},
						description: '图表的像素比',
					},
					{
						displayName: '格式',
						name: 'format',
						type: 'options',
						default: 'png',
						description: '生成图表的文件格式',
						options: [
							{
								name: 'PNG',
								value: 'png',
							},
							{
								name: 'PDF',
								value: 'pdf',
							},
							{
								name: 'SVG',
								value: 'svg',
							},
							{
								name: 'WebP',
								value: 'webp',
							},
						],
					},
					{
						displayName: '高度',
						name: 'height',
						type: 'number',
						default: 300,
						description: '图表的高度',
					},
					{
						displayName: '水平方向',
						name: 'horizontal',
						type: 'boolean',
						default: false,
						description: '是否使图表的 Y 轴水平放置',
						displayOptions: {
							show: {
								'/chartType': HORIZONTAL_CHARTS,
							},
						},
					},
					{
						displayName: '宽度',
						name: 'width',
						type: 'number',
						default: 500,
						description: '图表的宽度',
					},
				],
			},
			{
				displayName: '数据集选项',
				name: 'datasetOptions',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '背景颜色',
						name: 'backgroundColor',
						type: 'color',
						default: '',
						typeOptions: {
							showAlpha: true,
						},
						description: '用于数据集背景的颜色（折线图的区域、柱状图的填充等）',
					},
					{
						displayName: '边框颜色',
						name: 'borderColor',
						type: 'color',
						typeOptions: {
							showAlpha: true,
						},
						default: '',
						description: '用于数据集线条的颜色',
					},
					{
						displayName: '填充',
						name: 'fill',
						type: 'boolean',
						default: true,
						description: '是否填充数据集区域',
						displayOptions: {
							show: {
								'/chartType': Fill_CHARTS,
							},
						},
					},
					{
						displayName: '标签',
						name: 'label',
						type: 'string',
						default: '',
						description: '数据集的标签',
					},
					{
						displayName: '点样式',
						name: 'pointStyle',
						type: 'options',
						default: 'circle',
						description: '数据集点使用的样式',
						options: [
							{
								name: '圆形',
								value: 'circle',
							},
							{
								name: '十字',
								value: 'cross',
							},
							{
								name: '旋转十字',
								value: 'crossRot',
							},
							{
								name: '破折号',
								value: 'dash',
							},
							{
								name: '线条',
								value: 'line',
							},
							{
								name: '矩形',
								value: 'rect',
							},
							{
								name: '旋转矩形',
								value: 'rectRot',
							},
							{
								name: '圆角矩形',
								value: 'rectRounded',
							},
							{
								name: '星形',
								value: 'star',
							},
							{
								name: '三角形',
								value: 'triangle',
							},
						],
						displayOptions: {
							show: {
								'/chartType': POINT_STYLE_CHARTS,
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const datasets: IDataset[] = [];
		let chartType = '';

		const labels: string[] = [];
		const labelsMode = this.getNodeParameter('labelsMode', 0) as string;

		if (labelsMode === 'manually') {
			const labelsUi = this.getNodeParameter('labelsUi.labelsValues', 0, []) as IDataObject[];

			if (labelsUi.length) {
				for (const labelValue of labelsUi as [{ label: string[] | string }]) {
					if (Array.isArray(labelValue.label)) {
						labels?.push(...labelValue.label);
					} else {
						labels?.push(labelValue.label);
					}
				}
			}
		} else {
			const labelsArray = this.getNodeParameter('labelsArray', 0, '') as string;

			const errorMessage =
				'Labels Array is not a valid array, use valid JSON format, or specify it by expressions';

			if (Array.isArray(labelsArray)) {
				labels.push(...labelsArray);
			} else {
				const labelsArrayParsed = jsonParse<string[]>(labelsArray, {
					errorMessage,
				});
				if (!Array.isArray(labelsArrayParsed)) {
					throw new NodeOperationError(this.getNode(), errorMessage);
				}
				labels.push(...labelsArrayParsed);
			}
		}

		for (let i = 0; i < items.length; i++) {
			const data = this.getNodeParameter('data', i) as string;
			const datasetOptions = this.getNodeParameter('datasetOptions', i) as IDataObject;

			const backgroundColor = datasetOptions.backgroundColor as string;
			const borderColor = datasetOptions.borderColor as string | undefined;
			const fill = datasetOptions.fill as boolean | undefined;
			const label = (datasetOptions.label as string) || 'Chart';
			const pointStyle = datasetOptions.pointStyle as string | undefined;

			chartType = this.getNodeParameter('chartType', i) as string;

			if (HORIZONTAL_CHARTS.includes(chartType)) {
				const horizontal = this.getNodeParameter('chartOptions.horizontal', i, false) as boolean;
				if (horizontal) {
					chartType =
						'horizontal' + chartType[0].toUpperCase() + chartType.substring(1, chartType.length);
				}
			}

			// Boxplots and Violins are an addon that uses the name 'itemStyle'
			// instead of 'pointStyle'.
			let pointStyleName = 'pointStyle';
			if (ITEM_STYLE_CHARTS.includes(chartType)) {
				pointStyleName = 'itemStyle';
			}

			datasets.push({
				label,
				data,
				backgroundColor,
				borderColor,
				type: chartType,
				fill,
				[pointStyleName]: pointStyle,
			});
		}

		const output = this.getNodeParameter('output', 0) as string;
		const chartOptions = this.getNodeParameter('chartOptions', 0) as IDataObject;

		const chart = {
			type: chartType,
			data: {
				labels,
				datasets,
			},
		};

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://quickchart.io/chart',
			qs: {
				chart: JSON.stringify(chart),
				...chartOptions,
			},
			returnFullResponse: true,
			encoding: 'arraybuffer',
			json: false,
		};

		const response = (await this.helpers.httpRequest(options)) as IN8nHttpFullResponse;
		let mimeType = response.headers['content-type'] as string | undefined;
		mimeType = mimeType ? mimeType.split(';').find((value) => value.includes('/')) : undefined;

		return [
			[
				{
					binary: {
						[output]: await this.helpers.prepareBinaryData(
							response.body as Buffer,
							undefined,
							mimeType,
						),
					},
					json: { chart },
				},
			],
		];
	}
}
