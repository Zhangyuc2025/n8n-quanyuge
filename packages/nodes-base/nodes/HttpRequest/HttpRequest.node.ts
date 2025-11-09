import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { HttpRequestV1 } from './V1/HttpRequestV1.node';
import { HttpRequestV2 } from './V2/HttpRequestV2.node';
import { HttpRequestV3 } from './V3/HttpRequestV3.node';

export class HttpRequest extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP 请求',
			name: 'httpRequest',
			icon: { light: 'file:httprequest.svg', dark: 'file:httprequest.dark.svg' },
			group: ['output'],
			subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
			description: '发起 HTTP 请求并返回响应数据',
			defaultVersion: 4.3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new HttpRequestV1(baseDescription),
			2: new HttpRequestV2(baseDescription),
			3: new HttpRequestV3(baseDescription),
			4: new HttpRequestV3(baseDescription),
			4.1: new HttpRequestV3(baseDescription),
			4.2: new HttpRequestV3(baseDescription),
			4.3: new HttpRequestV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
