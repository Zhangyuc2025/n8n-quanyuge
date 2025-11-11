/**
 * Admin notification composable
 * Wrapper for Ant Design Vue notification
 */

import { notification } from 'ant-design-vue';

export interface NotificationOptions {
	message: string;
	description?: string;
	duration?: number;
}

export interface UseAdminNotificationReturn {
	success: (options: NotificationOptions) => void;
	error: (options: NotificationOptions) => void;
	warning: (options: NotificationOptions) => void;
	info: (options: NotificationOptions) => void;
}

export function useAdminNotification(): UseAdminNotificationReturn {
	const success = ({ message, description, duration = 4.5 }: NotificationOptions): void => {
		notification.success({
			message,
			description,
			duration,
			placement: 'topRight',
		});
	};

	const error = ({ message, description, duration = 4.5 }: NotificationOptions): void => {
		notification.error({
			message,
			description,
			duration,
			placement: 'topRight',
		});
	};

	const warning = ({ message, description, duration = 4.5 }: NotificationOptions): void => {
		notification.warning({
			message,
			description,
			duration,
			placement: 'topRight',
		});
	};

	const info = ({ message, description, duration = 4.5 }: NotificationOptions): void => {
		notification.info({
			message,
			description,
			duration,
			placement: 'topRight',
		});
	};

	return {
		success,
		error,
		warning,
		info,
	};
}
