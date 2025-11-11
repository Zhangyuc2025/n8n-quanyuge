import { defineStore } from 'pinia';
import { adminApiClient } from '@n8n/shared';
import type { AdminAuthState, AdminCredentials } from '@/types/admin.types';

const SESSION_KEY = 'adminSession';
const SESSION_DURATION_HOURS = 8;
const REFRESH_THRESHOLD_MINUTES = 30;

export const useAdminAuthStore = defineStore('adminAuth', {
	state: (): AdminAuthState => ({
		admin: null,
		isAuthenticated: false,
		sessionExpiry: null,
	}),

	actions: {
		/**
		 * Initialize store from localStorage
		 */
		init(): void {
			this.loadSession();
			this.setupAutoRefresh();
		},

		/**
		 * Login with admin credentials
		 */
		async login(credentials: AdminCredentials): Promise<void> {
			try {
				const response = await adminApiClient.post('/platform-admin/login', {
					email: credentials.email,
					password: credentials.password,
				});

				// Response is automatically unwrapped by adminApiClient interceptor
				// Backend returns: {admin: {...}}
				const admin = response.data.admin || response.data;

				if (admin && admin.id && admin.email) {
					this.admin = admin;
					this.isAuthenticated = true;

					// Set session expiry
					const expiryTime = new Date();
					expiryTime.setHours(expiryTime.getHours() + SESSION_DURATION_HOURS);
					this.sessionExpiry = expiryTime;

					// Always save session to localStorage for auto-restore
					this.saveSession();
				} else {
					console.error('Invalid response structure:', {
						responseData: response.data,
						admin,
					});
					throw new Error('Invalid response from server');
				}
			} catch (error) {
				this.clearAuth();
				throw error;
			}
		},

		/**
		 * Load session from localStorage
		 */
		loadSession(): boolean {
			try {
				const storedSession = localStorage.getItem(SESSION_KEY);
				if (!storedSession) {
					return false;
				}

				const { admin, sessionExpiry } = JSON.parse(storedSession);
				const expiryDate = new Date(sessionExpiry);

				// Check if session has expired
				if (expiryDate < new Date()) {
					this.clearAuth();
					return false;
				}

				// Restore session
				this.admin = admin;
				this.isAuthenticated = true;
				this.sessionExpiry = expiryDate;

				return true;
			} catch (error) {
				console.error('Failed to load session:', error);
				this.clearAuth();
				return false;
			}
		},

		/**
		 * Save session to localStorage
		 */
		saveSession(): void {
			try {
				const sessionData = {
					admin: this.admin,
					sessionExpiry: this.sessionExpiry,
				};
				localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
			} catch (error) {
				console.error('Failed to save session:', error);
			}
		},

		/**
		 * Verify current session validity with backend
		 */
		async verifySession(): Promise<boolean> {
			// Try to load session from localStorage first
			if (!this.isAuthenticated) {
				const loaded = this.loadSession();
				if (!loaded) {
					return false;
				}
			}

			// Check if session is still valid
			if (!this.isSessionValid) {
				this.clearAuth();
				return false;
			}

			try {
				// Verify with backend (if endpoint exists)
				// await adminApiClient.get('/platform-admin/verify-session');
				return true;
			} catch (error) {
				console.error('Session verification failed:', error);
				this.clearAuth();
				return false;
			}
		},

		/**
		 * Refresh session (extend expiry time)
		 */
		async refreshSession(): Promise<void> {
			if (!this.isAuthenticated) {
				return;
			}

			try {
				// Call backend to refresh session (if endpoint exists)
				// const response = await adminApiClient.post('/platform-admin/refresh-session');

				// Extend session expiry
				const expiryTime = new Date();
				expiryTime.setHours(expiryTime.getHours() + SESSION_DURATION_HOURS);
				this.sessionExpiry = expiryTime;

				// Update localStorage
				this.saveSession();
			} catch (error) {
				console.error('Failed to refresh session:', error);
				// Don't clear auth on refresh failure, let it expire naturally
			}
		},

		/**
		 * Setup auto-refresh timer
		 */
		setupAutoRefresh(): void {
			// Check every 5 minutes
			setInterval(
				() => {
					if (!this.isAuthenticated || !this.sessionExpiry) {
						return;
					}

					const now = new Date();
					const expiry = new Date(this.sessionExpiry);
					const minutesUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60);

					// Refresh if less than threshold minutes remaining
					if (minutesUntilExpiry > 0 && minutesUntilExpiry < REFRESH_THRESHOLD_MINUTES) {
						this.refreshSession();
					} else if (minutesUntilExpiry <= 0) {
						// Session expired
						this.clearAuth();
					}
				},
				5 * 60 * 1000,
			); // 5 minutes
		},

		/**
		 * Logout and clear session
		 */
		async logout(): Promise<void> {
			try {
				// Call backend logout endpoint
				await adminApiClient.post('/platform-admin/logout');
			} catch (error) {
				console.error('Logout error:', error);
			} finally {
				this.clearAuth();
			}
		},

		/**
		 * Clear authentication state
		 */
		clearAuth(): void {
			this.admin = null;
			this.isAuthenticated = false;
			this.sessionExpiry = null;
			localStorage.removeItem(SESSION_KEY);
		},

		/**
		 * Handle API errors (401, 403, etc.)
		 */
		handleApiError(error: any): void {
			const status = error.response?.status;

			// Unauthorized - clear session
			if (status === 401) {
				this.clearAuth();
				// Redirect to login page will be handled by router guard
			}

			// Forbidden - user doesn't have admin permission
			if (status === 403) {
				this.clearAuth();
			}
		},
	},

	getters: {
		/**
		 * Get admin display name
		 */
		adminDisplayName(): string {
			if (!this.admin) return '';

			const { name, email } = this.admin;
			return name || email;
		},

		/**
		 * Check if session is still valid
		 */
		isSessionValid(): boolean {
			if (!this.isAuthenticated || !this.sessionExpiry) {
				return false;
			}
			return new Date(this.sessionExpiry) > new Date();
		},

		/**
		 * Get session time remaining (in minutes)
		 */
		sessionTimeRemaining(): number {
			if (!this.sessionExpiry) {
				return 0;
			}
			const now = new Date();
			const expiry = new Date(this.sessionExpiry);
			const minutes = (expiry.getTime() - now.getTime()) / (1000 * 60);
			return Math.max(0, Math.floor(minutes));
		},
	},
});
