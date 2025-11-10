import { NODES_BASE_DIR } from '@/constants';
import { safeJoinPath } from '@n8n/backend-common';
import { Get, RestController } from '@n8n/decorators';
import { access } from 'fs/promises';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';

export const NODE_HEADERS_PATH = safeJoinPath(NODES_BASE_DIR, 'dist/nodes/headers');

@RestController('/')
export class TranslationController {
	@Get('/node-translation-headers')
	async getNodeTranslationHeaders() {
		try {
			await access(`${NODE_HEADERS_PATH}.js`);
		} catch {
			return; // no headers available
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return require(NODE_HEADERS_PATH);
		} catch (error) {
			throw new InternalServerError('Failed to load headers file', error);
		}
	}
}
