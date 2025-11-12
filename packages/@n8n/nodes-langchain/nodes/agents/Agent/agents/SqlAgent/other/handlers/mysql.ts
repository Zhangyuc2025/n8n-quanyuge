import { DataSource } from '@n8n/typeorm';
import { ApplicationError, type IExecuteFunctions } from 'n8n-workflow';

// Note: This function has been disabled because the credentials system has been removed
export async function getMysqlDataSource(this: IExecuteFunctions): Promise<DataSource> {
	throw new ApplicationError(
		'MySQL data source is no longer supported - credentials system has been removed',
	);
}
