import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SetV1 } from './v1/SetV1.node';
import { SetV2 } from './v2/SetV2.node';

export class Set extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: '设置',
			name: 'set',
			icon: 'fa:pen',
			group: ['input'],
			description: '添加或编辑输入项的字段，并可选择删除其他字段',
			defaultVersion: 3.4,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SetV1(baseDescription),
			2: new SetV1(baseDescription),
			3: new SetV2(baseDescription),
			3.1: new SetV2(baseDescription),
			3.2: new SetV2(baseDescription),
			3.3: new SetV2(baseDescription),
			3.4: new SetV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
