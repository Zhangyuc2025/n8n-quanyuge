import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as row from './actions/row/Row.resource';
import {
	getConditionsForColumn,
	getDataTableColumns,
	getDataTables,
	tableSearch,
} from './common/methods';

export class DataTable implements INodeType {
	description: INodeTypeDescription = {
		displayName: '数据表',
		name: 'dataTable',
		icon: 'fa:table',
		iconColor: 'orange-red',
		group: ['input', 'transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: '在工作流执行中跨越表格永久保存数据',
		defaults: {
			name: '数据表',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				message: '选定的数据表没有列。',
				displayCondition:
					'={{ $parameter.dataTableId !== "" && $parameter?.columns?.mappingMode === "defineBelow" && !$parameter?.columns?.schema?.length }}',
				whenToDisplay: 'beforeExecution',
				location: 'ndv',
				type: 'info',
			},
		],
		properties: [
			{
				displayName: '资源',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '行',
						value: 'row',
					},
				],
				default: 'row',
			},
			...row.description,
		],
	};

	methods = {
		listSearch: {
			tableSearch,
		},
		loadOptions: {
			getDataTableColumns,
			getConditionsForColumn,
		},
		resourceMapping: {
			getDataTables,
		},
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
