import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MergeV1 } from './v1/MergeV1.node';
import { MergeV2 } from './v2/MergeV2.node';
import { MergeV3 } from './v3/MergeV3.node';

export class Merge extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: '合并',
			name: 'merge',
			icon: 'file:merge.svg',
			group: ['transform'],
			subtitle: '={{$parameter["mode"]}}',
			description: '当来自两个流的数据都可用时合并它们',
			defaultVersion: 3.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MergeV1(baseDescription),
			2: new MergeV2(baseDescription),
			2.1: new MergeV2(baseDescription),
			3: new MergeV3(baseDescription),
			3.1: new MergeV3(baseDescription),
			3.2: new MergeV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
