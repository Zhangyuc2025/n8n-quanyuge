import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DateTimeV1 } from './V1/DateTimeV1.node';
import { DateTimeV2 } from './V2/DateTimeV2.node';

export class DateTime extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: '日期和时间',
			name: 'dateTime',
			icon: 'fa:clock',
			iconColor: 'green',
			group: ['transform'],
			defaultVersion: 2,
			description: '允许您操作日期和时间值',
			subtitle: '={{$parameter["action"]}}',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DateTimeV1(baseDescription),
			2: new DateTimeV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
