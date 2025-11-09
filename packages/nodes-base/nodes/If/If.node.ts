import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { IfV1 } from './V1/IfV1.node';
import { IfV2 } from './V2/IfV2.node';

export class If extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: '条件判断',
			name: 'if',
			icon: 'fa:map-signs',
			iconColor: 'green',
			group: ['transform'],
			description: '将项目路由到不同的分支（真/假）',
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new IfV1(baseDescription),
			2: new IfV2(baseDescription),
			2.1: new IfV2(baseDescription),
			2.2: new IfV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
