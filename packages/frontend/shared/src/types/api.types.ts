/**
 * API related types
 */

export interface ApiResponse<T = any> {
	data: T;
	message?: string;
	success?: boolean;
}

export interface ApiError {
	code: string;
	message: string;
	details?: any;
}

export interface RequestConfig {
	params?: Record<string, any>;
	headers?: Record<string, string>;
	timeout?: number;
}
