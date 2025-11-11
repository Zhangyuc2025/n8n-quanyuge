/**
 * Data formatting utilities
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * Format date to localized string
 */
export function formatDate(date: Date | string | null, format = 'YYYY-MM-DD HH:mm:ss'): string {
	if (!date) return '-';
	return dayjs(date).format(format);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | null): string {
	if (!date) return '-';
	return dayjs(date).fromNow();
}

/**
 * Format currency (CNY)
 */
export function formatCurrency(amount: number | null | undefined, decimals = 2): string {
	if (amount === null || amount === undefined) return '¥0.00';
	return `¥${amount.toFixed(decimals)}`;
}

/**
 * Format number with thousand separator
 */
export function formatNumber(num: number | null | undefined, decimals = 0): string {
	if (num === null || num === undefined) return '0';
	return num.toLocaleString('zh-CN', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null | undefined): string {
	if (!bytes || bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));

	return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined, decimals = 2): string {
	if (value === null || value === undefined) return '0%';
	return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate string
 */
export function truncate(str: string | null | undefined, maxLength = 50): string {
	if (!str) return '-';
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength)}...`;
}

/**
 * Format boolean to text
 */
export function formatBoolean(
	value: boolean | null | undefined,
	trueText = '是',
	falseText = '否',
): string {
	if (value === null || value === undefined) return '-';
	return value ? trueText : falseText;
}
