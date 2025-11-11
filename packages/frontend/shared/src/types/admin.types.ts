/**
 * Admin panel shared types
 */

export interface PlatformAdmin {
	id: string;
	email: string;
	name: string;
	role: 'super_admin' | 'admin';
	isActive: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: 'ASC' | 'DESC';
	search?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface AdminTableColumn {
	key: string;
	title: string;
	dataIndex?: string;
	width?: number | string;
	align?: 'left' | 'center' | 'right';
	sortable?: boolean;
	filterable?: boolean;
	render?: (value: any, record: any, index: number) => any;
}

export interface ChartOptions {
	title?: string;
	xAxis?: any;
	yAxis?: any;
	series?: any[];
	legend?: any;
	tooltip?: any;
	grid?: any;
}
