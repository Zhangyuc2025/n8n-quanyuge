import type { RemoteResourceOwner, StatusResourceOwner } from './resource-owner';

/**
 * Credential import/export is no longer supported in Source Control.
 * This interface is kept for backward compatibility and type safety.
 * It should not be used for new implementations.
 * @deprecated
 */
export interface ExportableCredential {
	id: string;
	name: string;
	type: string;
	data: Record<string, unknown>;
	ownedBy: RemoteResourceOwner | null;
}

/**
 * Credential import/export is no longer supported in Source Control.
 * This type is kept for backward compatibility and type safety.
 * It should not be used for new implementations.
 * @deprecated
 */
export type StatusExportableCredential = ExportableCredential & {
	filename: string;
	ownedBy?: StatusResourceOwner;
};
