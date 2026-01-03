/**
 * Authentication utilities for DrishtiKosh
 * Handles JWT token storage and retrieval
 */

const TOKEN_KEY = 'drishtikosh_token';
const USER_ID_KEY = 'drishtikosh_user_id';

export const auth = {
    /**
     * Store authentication token and user ID
     */
    setToken(token: string, userId: string) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_ID_KEY, userId);
    },

    /**
     * Get stored authentication token
     */
    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user ID
     */
    getUserId(): string | null {
        return localStorage.getItem(USER_ID_KEY);
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    },

    /**
     * Clear authentication data (logout)
     */
    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        // Clear legacy localStorage keys
        localStorage.removeItem('userName');
        localStorage.removeItem('userType');
        localStorage.removeItem('userId');
    },

    /**
     * Get authorization header for API requests
     */
    getAuthHeader(): Record<string, string> {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};
