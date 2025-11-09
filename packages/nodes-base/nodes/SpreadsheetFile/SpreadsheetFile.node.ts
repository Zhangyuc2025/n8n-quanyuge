import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SpreadsheetFileV1 } from './v1/SpreadsheetFileV1.node';
import { SpreadsheetFileV2 } from './v2/SpreadsheetFileV2.node';

export class SpreadsheetFile extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			hidden: true,
			displayName: '电子表格文件',
			name: 'spreadsheetFile',
			icon: 'fa:table',
			group: ['transform'],
			description: '从电子表格文件（如 CSV、XLS、ODS 等）读取和写入数据',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SpreadsheetFileV1(baseDescription),
			2: new SpreadsheetFileV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
