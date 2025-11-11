/**
 * Form validation utilities
 */

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function isStrongPassword(password: string): boolean {
	const minLength = password.length >= 8;
	const hasUppercase = /[A-Z]/.test(password);
	const hasLowercase = /[a-z]/.test(password);
	const hasNumber = /[0-9]/.test(password);

	return minLength && hasUppercase && hasLowercase && hasNumber;
}

/**
 * Validate required field
 */
export function isRequired(value: any): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === 'string') return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

/**
 * Validate API Key format (basic check)
 */
export function isValidApiKey(key: string): boolean {
	// At least 20 characters, alphanumeric and dashes
	return key.length >= 20 && /^[a-zA-Z0-9-_]+$/.test(key);
}
