import { writeFile as fsWriteFile } from 'fs/promises';
import getSystemFonts from 'get-system-fonts';
import gm from 'gm';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError, NodeConnectionTypes, deepCopy } from 'n8n-workflow';
import { parse as pathParse } from 'path';
import { file } from 'tmp-promise';

const nodeOperations: INodePropertyOptions[] = [
	{
		name: '模糊',
		value: 'blur',
		description: '为图像添加模糊效果，使其不那么清晰',
		action: '模糊图像',
	},
	{
		name: '边框',
		value: 'border',
		description: '为图像添加边框',
		action: '添加图像边框',
	},
	{
		name: '合成',
		value: 'composite',
		description: '在另一张图像上合成图像',
		action: '合成图像',
	},
	{
		name: '创建',
		value: 'create',
		description: '创建新图像',
		action: '创建图像',
	},
	{
		name: '裁剪',
		value: 'crop',
		description: '裁剪图像',
		action: '裁剪图像',
	},
	{
		name: '绘制',
		value: 'draw',
		description: '在图像上绘制',
		action: '绘制图像',
	},
	{
		name: '旋转',
		value: 'rotate',
		description: '旋转图像',
		action: '旋转图像',
	},
	{
		name: '调整大小',
		value: 'resize',
		description: '更改图像大小',
		action: '调整图像大小',
	},
	{
		name: '倾斜',
		value: 'shear',
		description: '沿 X 或 Y 轴倾斜图像',
		action: '倾斜图像',
	},
	{
		name: '文本',
		value: 'text',
		description: '为图像添加文本',
		action: '应用文本到图像',
	},
	{
		name: '透明',
		value: 'transparent',
		description: '使图像中的某个颜色透明',
		action: '添加透明度到图像',
	},
];

const nodeOperationOptions: INodeProperties[] = [
	// ----------------------------------
	//         create
	// ----------------------------------
	{
		displayName: '背景颜色',
		name: 'backgroundColor',
		type: 'color',
		default: '#ffffff00',
		typeOptions: {
			showAlpha: true,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		description: '要创建的图像的背景颜色',
	},
	{
		displayName: '图像宽度',
		name: 'width',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		description: '要创建的图像的宽度',
	},
	{
		displayName: '图像高度',
		name: 'height',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		description: '要创建的图像的高度',
	},

	// ----------------------------------
	//         draw
	// ----------------------------------
	{
		displayName: '图元',
		name: 'primitive',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['draw'],
			},
		},
		options: [
			{
				name: '圆形',
				value: 'circle',
			},
			{
				name: '直线',
				value: 'line',
			},
			{
				name: '矩形',
				value: 'rectangle',
			},
		],
		default: 'rectangle',
		description: '要绘制的图元',
	},
	{
		displayName: '颜色',
		name: 'color',
		type: 'color',
		default: '#ff000000',
		typeOptions: {
			showAlpha: true,
		},
		displayOptions: {
			show: {
				operation: ['draw'],
			},
		},
		description: '要绘制的图元的颜色',
	},
	{
		displayName: '起始位置 X',
		name: 'startPositionX',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: '图元的 X（水平）起始位置',
	},
	{
		displayName: '起始位置 Y',
		name: 'startPositionY',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: '图元的 Y（垂直）起始位置',
	},
	{
		displayName: '结束位置 X',
		name: 'endPositionX',
		type: 'number',
		default: 250,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: '图元的 X（水平）结束位置',
	},
	{
		displayName: '结束位置 Y',
		name: 'endPositionY',
		type: 'number',
		default: 250,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['circle', 'line', 'rectangle'],
			},
		},
		description: '图元的 Y（垂直）结束位置',
	},
	{
		displayName: '圆角半径',
		name: 'cornerRadius',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['draw'],
				primitive: ['rectangle'],
			},
		},
		description: '创建圆角的半径',
	},

	// ----------------------------------
	//         text
	// ----------------------------------
	{
		displayName: '文本',
		name: 'text',
		typeOptions: {
			rows: 5,
		},
		type: 'string',
		default: '',
		placeholder: '要渲染的文本',
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: '要写在图像上的文本',
	},
	{
		displayName: '字体大小',
		name: 'fontSize',
		type: 'number',
		default: 18,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: '文本的大小',
	},
	{
		displayName: '字体颜色',
		name: 'fontColor',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: '文本的颜色',
	},
	{
		displayName: '位置 X',
		name: 'positionX',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: '文本的 X（水平）位置',
	},
	{
		displayName: '位置 Y',
		name: 'positionY',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: '文本的 Y（垂直）位置',
	},
	{
		displayName: '最大行长度',
		name: 'lineLength',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 80,
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		description: '在添加换行符之前一行中的最大字符数',
	},

	// ----------------------------------
	//         blur
	// ----------------------------------
	{
		displayName: '模糊',
		name: 'blur',
		type: 'number',
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
		default: 5,
		displayOptions: {
			show: {
				operation: ['blur'],
			},
		},
		description: '模糊的强度',
	},
	{
		displayName: 'Sigma',
		name: 'sigma',
		type: 'number',
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
		default: 2,
		displayOptions: {
			show: {
				operation: ['blur'],
			},
		},
		description: '模糊的 sigma 值',
	},

	// ----------------------------------
	//         border
	// ----------------------------------
	{
		displayName: '边框宽度',
		name: 'borderWidth',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				operation: ['border'],
			},
		},
		description: '边框的宽度',
	},
	{
		displayName: '边框高度',
		name: 'borderHeight',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				operation: ['border'],
			},
		},
		description: '边框的高度',
	},
	{
		displayName: '边框颜色',
		name: 'borderColor',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				operation: ['border'],
			},
		},
		description: '边框的颜色',
	},

	// ----------------------------------
	//         composite
	// ----------------------------------
	{
		displayName: '合成图像属性',
		name: 'dataPropertyNameComposite',
		type: 'string',
		default: '',
		placeholder: 'data2',
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		description: '包含要合成到属性名称中找到的图像上的图像数据的二进制属性名称',
	},
	{
		displayName: '操作符',
		name: 'operator',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		options: [
			{
				name: '加法',
				value: 'Add',
			},
			{
				name: '顶部覆盖',
				value: 'Atop',
			},
			{
				name: '凹凸贴图',
				value: 'Bumpmap',
			},
			{
				name: '复制',
				value: 'Copy',
			},
			{
				name: '复制黑色',
				value: 'CopyBlack',
			},
			{
				name: '复制蓝色',
				value: 'CopyBlue',
			},
			{
				name: '复制青色',
				value: 'CopyCyan',
			},
			{
				name: '复制绿色',
				value: 'CopyGreen',
			},
			{
				name: '复制品红',
				value: 'CopyMagenta',
			},
			{
				name: '复制不透明度',
				value: 'CopyOpacity',
			},
			{
				name: '复制红色',
				value: 'CopyRed',
			},
			{
				name: '复制黄色',
				value: 'CopyYellow',
			},
			{
				name: '差异',
				value: 'Difference',
			},
			{
				name: '除法',
				value: 'Divide',
			},
			{
				name: '内部',
				value: 'In',
			},
			{
				name: '减法',
				value: 'Minus',
			},
			{
				name: '乘法',
				value: 'Multiply',
			},
			{
				name: '外部',
				value: 'Out',
			},
			{
				name: '覆盖',
				value: 'Over',
			},
			{
				name: '加法',
				value: 'Plus',
			},
			{
				name: '减法',
				value: 'Subtract',
			},
			{
				name: '异或',
				value: 'Xor',
			},
		],
		default: 'Over',
		description: '用于组合图像的操作符',
	},
	{
		displayName: '位置 X',
		name: 'positionX',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		description: '合成图像的 X（水平）位置',
	},
	{
		displayName: '位置 Y',
		name: 'positionY',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['composite'],
			},
		},
		description: '合成图像的 Y（垂直）位置',
	},

	// ----------------------------------
	//         crop
	// ----------------------------------
	{
		displayName: '宽度',
		name: 'width',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: '裁剪宽度',
	},
	{
		displayName: '高度',
		name: 'height',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: '裁剪高度',
	},
	{
		displayName: '位置 X',
		name: 'positionX',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: '裁剪的 X（水平）起始位置',
	},
	{
		displayName: '位置 Y',
		name: 'positionY',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['crop'],
			},
		},
		description: '裁剪的 Y（垂直）起始位置',
	},

	// ----------------------------------
	//         resize
	// ----------------------------------
	{
		displayName: '宽度',
		name: 'width',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['resize'],
			},
		},
		description: '图像的新宽度',
	},
	{
		displayName: '高度',
		name: 'height',
		type: 'number',
		default: 500,
		displayOptions: {
			show: {
				operation: ['resize'],
			},
		},
		description: '图像的新高度',
	},
	{
		displayName: '选项',
		name: 'resizeOption',
		type: 'options',
		options: [
			{
				name: '忽略纵横比',
				value: 'ignoreAspectRatio',
				description: '忽略纵横比，精确调整到指定值',
			},
			{
				name: '最大区域',
				value: 'maximumArea',
				description: '指定值为最大区域',
			},
			{
				name: '最小区域',
				value: 'minimumArea',
				description: '指定值为最小区域',
			},
			{
				name: '仅当更大时',
				value: 'onlyIfLarger',
				description: '仅当图像大于宽度或高度时才调整大小',
			},
			{
				name: '仅当更小时',
				value: 'onlyIfSmaller',
				description: '仅当图像小于宽度或高度时才调整大小',
			},
			{
				name: '百分比',
				value: 'percent',
				description: '宽度和高度以百分比指定',
			},
		],
		default: 'maximumArea',
		displayOptions: {
			show: {
				operation: ['resize'],
			},
		},
		description: '如何调整图像大小',
	},

	// ----------------------------------
	//         rotate
	// ----------------------------------
	{
		displayName: '旋转',
		name: 'rotate',
		type: 'number',
		typeOptions: {
			minValue: -360,
			maxValue: 360,
		},
		default: 0,
		displayOptions: {
			show: {
				operation: ['rotate'],
			},
		},
		description: '图像应旋转的角度',
	},
	{
		displayName: '背景颜色',
		name: 'backgroundColor',
		type: 'color',
		default: '#ffffffff',
		typeOptions: {
			showAlpha: true,
		},
		displayOptions: {
			show: {
				operation: ['rotate'],
			},
		},
		description: '当图像旋转的角度不是 90 的倍数时用于背景的颜色',
	},

	// ----------------------------------
	//         shear
	// ----------------------------------
	{
		displayName: '角度 X',
		name: 'degreesX',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['shear'],
			},
		},
		description: 'X（水平）倾斜角度',
	},
	{
		displayName: '角度 Y',
		name: 'degreesY',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['shear'],
			},
		},
		description: 'Y（垂直）倾斜角度',
	},

	// ----------------------------------
	//         transparent
	// ----------------------------------
	{
		displayName: '颜色',
		name: 'color',
		type: 'color',
		default: '#ff0000',
		displayOptions: {
			show: {
				operation: ['transparent'],
			},
		},
		description: '要使其透明的颜色',
	},
];

export class EditImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: '编辑图像',
		name: 'editImage',
		icon: 'fa:image',
		iconColor: 'purple',
		group: ['transform'],
		version: 1,
		description: '编辑图像，如模糊、调整大小或添加边框和文本',
		defaults: {
			name: '编辑图像',
			color: '#553399',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: '操作',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '获取信息',
						value: 'information',
						description: '返回图像信息，如分辨率',
					},
					{
						name: '多步骤',
						value: 'multiStep',
						description: '执行多个操作',
					},
					...nodeOperations,
				].sort((a, b) => {
					if (a.name.toLowerCase() < b.name.toLowerCase()) {
						return -1;
					}
					if (a.name.toLowerCase() > b.name.toLowerCase()) {
						return 1;
					}
					return 0;
				}),
				default: 'border',
			},
			{
				displayName: '属性名称',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: '可以找到图像数据的二进制属性名称',
			},

			// ----------------------------------
			//         multiStep
			// ----------------------------------
			{
				displayName: '操作',
				name: 'operations',
				placeholder: '添加操作',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						operation: ['multiStep'],
					},
				},
				description: '要执行的操作',
				default: {},
				options: [
					{
						name: 'operations',
						displayName: '操作',
						values: [
							{
								displayName: '操作',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								options: nodeOperations,
								default: '',
							},
							...nodeOperationOptions,
							{
								displayName: '字体名称或 ID',
								name: 'font',
								type: 'options',
								displayOptions: {
									show: {
										operation: ['text'],
									},
								},
								typeOptions: {
									loadOptionsMethod: 'getFonts',
								},
								default: '',
								description:
									'要使用的字体。默认为 Arial。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID。',
							},
						],
					},
				],
			},

			...nodeOperationOptions,
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: {
					hide: {
						operation: ['information'],
					},
				},
				options: [
					{
						displayName: '文件名',
						name: 'fileName',
						type: 'string',
						default: '',
						description: '在二进制数据中设置的文件名',
					},
					{
						displayName: '字体名称或 ID',
						name: 'font',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': ['text'],
							},
						},
						typeOptions: {
							loadOptionsMethod: 'getFonts',
						},
						default: '',
						description:
							'要使用的字体。默认为 Arial。从列表中选择，或使用<a href="https://docs.n8n.io/code/expressions/">表达式</a>指定 ID。',
					},
					{
						displayName: '格式',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'bmp',
								value: 'bmp',
							},
							{
								name: 'gif',
								value: 'gif',
							},
							{
								name: 'jpeg',
								value: 'jpeg',
							},
							{
								name: 'png',
								value: 'png',
							},
							{
								name: 'tiff',
								value: 'tiff',
							},
							{
								name: 'WebP',
								value: 'webp',
							},
						],
						default: 'jpeg',
						description: '设置输出图像格式',
					},
					{
						displayName: '质量',
						name: 'quality',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						default: 100,
						displayOptions: {
							show: {
								format: ['jpeg', 'png', 'tiff'],
							},
						},
						description: '设置 jpeg|png|tiff 压缩级别，范围从 0 到 100（最佳）',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getFonts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const files = await getSystemFonts();
				const returnData: INodePropertyOptions[] = [];

				files.forEach((entry: string) => {
					const pathParts = pathParse(entry);
					if (!pathParts.ext) {
						return;
					}

					returnData.push({
						name: pathParts.name,
						value: entry,
					});
				});

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				item = items[itemIndex];

				const operation = this.getNodeParameter('operation', itemIndex);
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);

				const options = this.getNodeParameter('options', itemIndex, {});

				const cleanupFunctions: Array<() => void> = [];

				let gmInstance: gm.State;

				const requiredOperationParameters: {
					[key: string]: string[];
				} = {
					blur: ['blur', 'sigma'],
					border: ['borderColor', 'borderWidth', 'borderHeight'],
					create: ['backgroundColor', 'height', 'width'],
					crop: ['height', 'positionX', 'positionY', 'width'],
					composite: ['dataPropertyNameComposite', 'operator', 'positionX', 'positionY'],
					draw: [
						'color',
						'cornerRadius',
						'endPositionX',
						'endPositionY',
						'primitive',
						'startPositionX',
						'startPositionY',
					],
					information: [],
					resize: ['height', 'resizeOption', 'width'],
					rotate: ['backgroundColor', 'rotate'],
					shear: ['degreesX', 'degreesY'],
					text: ['font', 'fontColor', 'fontSize', 'lineLength', 'positionX', 'positionY', 'text'],
					transparent: ['color'],
				};

				let operations: IDataObject[] = [];
				if (operation === 'multiStep') {
					// Operation parameters are already in the correct format
					const operationsData = this.getNodeParameter('operations', itemIndex, {
						operations: [],
					}) as IDataObject;
					operations = operationsData.operations as IDataObject[];
				} else {
					// Operation parameters have to first get collected
					const operationParameters: IDataObject = {};
					requiredOperationParameters[operation].forEach((parameterName) => {
						try {
							operationParameters[parameterName] = this.getNodeParameter(parameterName, itemIndex);
						} catch (error) {}
					});

					operations = [
						{
							operation,
							...operationParameters,
						},
					];
				}

				if (operations[0].operation !== 'create') {
					// "create" generates a new image so does not require any incoming data.
					this.helpers.assertBinaryData(itemIndex, dataPropertyName);
					const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
						itemIndex,
						dataPropertyName,
					);
					gmInstance = gm(binaryDataBuffer);
					gmInstance = gmInstance.background('transparent');
				}

				const newItem: INodeExecutionData = {
					json: item.json,
					binary: {},
					pairedItem: {
						item: itemIndex,
					},
				};

				if (operation === 'information') {
					// Just return the information
					const imageData = await new Promise<IDataObject>((resolve, reject) => {
						gmInstance = gmInstance.identify((error, data) => {
							if (error) {
								reject(error);
								return;
							}
							resolve(data as unknown as IDataObject);
						});
					});

					newItem.json = imageData;
				}

				for (let i = 0; i < operations.length; i++) {
					const operationData = operations[i];
					if (operationData.operation === 'blur') {
						gmInstance = gmInstance!.blur(
							operationData.blur as number,
							operationData.sigma as number,
						);
					} else if (operationData.operation === 'border') {
						gmInstance = gmInstance!
							.borderColor(operationData.borderColor as string)
							.border(operationData.borderWidth as number, operationData.borderHeight as number);
					} else if (operationData.operation === 'composite') {
						const positionX = operationData.positionX as number;
						const positionY = operationData.positionY as number;
						const operator = operationData.operator as string;

						const geometryString =
							(positionX >= 0 ? '+' : '') + positionX + (positionY >= 0 ? '+' : '') + positionY;

						const binaryPropertyName = operationData.dataPropertyNameComposite as string;
						this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
							itemIndex,
							binaryPropertyName,
						);

						const { path, cleanup } = await file();
						cleanupFunctions.push(cleanup);
						await fsWriteFile(path, binaryDataBuffer);

						if (operations[0].operation === 'create') {
							// It seems like if the image gets created newly we have to create a new gm instance
							// else it fails for some reason
							gmInstance = gm(gmInstance!.stream('png'))
								.compose(operator)
								.geometry(geometryString)
								.composite(path);
						} else {
							gmInstance = gmInstance!.compose(operator).geometry(geometryString).composite(path);
						}

						if (operations.length !== i + 1) {
							// If there are other operations after the current one create a new gm instance
							// because else things do get messed up
							gmInstance = gm(gmInstance.stream());
						}
					} else if (operationData.operation === 'create') {
						gmInstance = gm(
							operationData.width as number,
							operationData.height as number,
							operationData.backgroundColor as string,
						);
						if (!options.format) {
							options.format = 'png';
						}
					} else if (operationData.operation === 'crop') {
						gmInstance = gmInstance!.crop(
							operationData.width as number,
							operationData.height as number,
							operationData.positionX as number,
							operationData.positionY as number,
						);
					} else if (operationData.operation === 'draw') {
						gmInstance = gmInstance!.fill(operationData.color as string);

						if (operationData.primitive === 'line') {
							gmInstance = gmInstance.drawLine(
								operationData.startPositionX as number,
								operationData.startPositionY as number,
								operationData.endPositionX as number,
								operationData.endPositionY as number,
							);
						} else if (operationData.primitive === 'circle') {
							gmInstance = gmInstance.drawCircle(
								operationData.startPositionX as number,
								operationData.startPositionY as number,
								operationData.endPositionX as number,
								operationData.endPositionY as number,
							);
						} else if (operationData.primitive === 'rectangle') {
							gmInstance = gmInstance.drawRectangle(
								operationData.startPositionX as number,
								operationData.startPositionY as number,
								operationData.endPositionX as number,
								operationData.endPositionY as number,
								(operationData.cornerRadius as number) || undefined,
							);
						}
					} else if (operationData.operation === 'resize') {
						const resizeOption = operationData.resizeOption as string;

						// By default use "maximumArea"
						let option: gm.ResizeOption = '@';
						if (resizeOption === 'ignoreAspectRatio') {
							option = '!';
						} else if (resizeOption === 'minimumArea') {
							option = '^';
						} else if (resizeOption === 'onlyIfSmaller') {
							option = '<';
						} else if (resizeOption === 'onlyIfLarger') {
							option = '>';
						} else if (resizeOption === 'percent') {
							option = '%';
						}

						gmInstance = gmInstance!.resize(
							operationData.width as number,
							operationData.height as number,
							option,
						);
					} else if (operationData.operation === 'rotate') {
						gmInstance = gmInstance!.rotate(
							operationData.backgroundColor as string,
							operationData.rotate as number,
						);
					} else if (operationData.operation === 'shear') {
						gmInstance = gmInstance!.shear(
							operationData.degreesX as number,
							operationData.degreesY as number,
						);
					} else if (operationData.operation === 'text') {
						// Split the text in multiple lines
						const lines: string[] = [];
						let currentLine = '';
						(operationData.text as string).split('\n').forEach((textLine: string) => {
							textLine.split(' ').forEach((textPart: string) => {
								if (
									currentLine.length + textPart.length + 1 >
									(operationData.lineLength as number)
								) {
									lines.push(currentLine.trim());
									currentLine = `${textPart} `;
									return;
								}
								currentLine += `${textPart} `;
							});

							lines.push(currentLine.trim());
							currentLine = '';
						});

						// Combine the lines to a single string
						const renderText = lines.join('\n');

						let font = (options.font || operationData.font) as string | undefined;
						if (!font) {
							const fonts = await getSystemFonts();
							font = fonts.find((_font) => _font.includes('Arial.'));
						}

						if (!font) {
							throw new NodeOperationError(
								this.getNode(),
								'未找到默认字体。请从选项中选择一个字体。',
							);
						}

						gmInstance = gmInstance!
							.fill(operationData.fontColor as string)
							.fontSize(operationData.fontSize as number)
							.font(font)
							.drawText(
								operationData.positionX as number,
								operationData.positionY as number,
								renderText,
							);
					} else if (operationData.operation === 'transparent') {
						gmInstance = gmInstance!.transparent(operationData.color as string);
					}
				}

				if (item.binary !== undefined && newItem.binary) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, item.binary);
					// Make a deep copy of the binary data we change
					if (newItem.binary[dataPropertyName]) {
						newItem.binary[dataPropertyName] = deepCopy(newItem.binary[dataPropertyName]);
					}
				}

				if (newItem.binary![dataPropertyName] === undefined) {
					newItem.binary![dataPropertyName] = {
						data: '',
						mimeType: '',
					};
				}

				if (options.quality !== undefined) {
					gmInstance = gmInstance!.quality(options.quality as number);
				}

				if (options.format !== undefined) {
					gmInstance = gmInstance!.setFormat(options.format as string);
					newItem.binary![dataPropertyName].fileExtension = options.format as string;
					newItem.binary![dataPropertyName].mimeType = `image/${options.format}`;
					const fileName = newItem.binary![dataPropertyName].fileName;
					if (fileName?.includes('.')) {
						newItem.binary![dataPropertyName].fileName =
							fileName.split('.').slice(0, -1).join('.') + '.' + options.format;
					}
				}

				if (options.fileName !== undefined) {
					newItem.binary![dataPropertyName].fileName = options.fileName as string;
				}

				returnData.push(
					await new Promise<INodeExecutionData>((resolve, reject) => {
						gmInstance.toBuffer(async (error: Error | null, buffer: Buffer) => {
							cleanupFunctions.forEach(async (cleanup) => cleanup());

							if (error) {
								return reject(error);
							}

							const binaryData = await this.helpers.prepareBinaryData(Buffer.from(buffer));
							newItem.binary![dataPropertyName] = {
								...newItem.binary![dataPropertyName],
								...binaryData,
							};

							return resolve(newItem);
						});
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
