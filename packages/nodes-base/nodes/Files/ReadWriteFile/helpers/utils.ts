import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function errorMapper(
	this: IExecuteFunctions,
	error: Error,
	itemIndex: number,
	context?: IDataObject,
) {
	let message;
	let description;

	if (typeof error.message === 'string') {
		if (error.message.includes('Cannot create a string longer than')) {
			message = '文件太大';
			description =
				'您尝试读取的二进制文件超过 512MB，这是使用默认二进制数据模式的限制，请尝试使用文件系统二进制模式。更多信息请访问 <a href="https://docs.n8n.io/hosting/scaling/binary-data/" target="_blank">此处</a>';
		} else if (error.message.includes('EACCES') && context?.operation === 'read') {
			const path =
				((error as unknown as IDataObject).path as string) || (context?.filePath as string);
			message = `您没有访问 ${path} 的权限`;
			description = '请验证"文件选择器"中指定的路径是否正确，或根据需要更改文件权限';
		} else if (error.message.includes('EACCES') && context?.operation === 'write') {
			const path =
				((error as unknown as IDataObject).path as string) || (context?.filePath as string);
			message = `您没有写入文件 ${path} 的权限`;
			description = '请在"文件路径和名称"中指定另一个目标文件夹，或更改父文件夹的权限';
		}
	}

	return new NodeOperationError(this.getNode(), error, { itemIndex, message, description });
}

export function escapeSpecialCharacters(str: string) {
	// Escape parentheses
	str = str.replace(/[()]/g, '\\$&');

	return str;
}
