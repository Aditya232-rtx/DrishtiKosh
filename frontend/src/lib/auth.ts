/**
 * Authentication utilities for DrishtiKosh
 * Handles JWT token storage and retrieval
 */

const TOKEN_KEY = 'drishtikosh_token';
const USER_ID_KEY = 'drishtikosh_user_id';
const USER_NAME_KEY = 'drishtikosh_user_name';
const USER_TYPE_KEY = 'drishtikosh_user_type';
const USER_ROLE_KEY = 'drishtikosh_user_role';

export const auth = {
    /**
     * Store authentication session
     */
    setSession(token: string, user: { id: string, name: string, type: string | null, role?: string }) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_ID_KEY, user.id);
        localStorage.setItem(USER_NAME_KEY, user.name);
        if (user.type) localStorage.setItem(USER_TYPE_KEY, user.type);
        if (user.role) localStorage.setItem(USER_ROLE_KEY, user.role);

        // Update legacy keys for compatibility with existing components
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userType', user.type || '');
        localStorage.setItem('userRole', user.role || 'student');
    },

    /**
     * Store authentication token and user ID (Legacy support)
     */
    setToken(token: string, userId: string) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_ID_KEY, userId);
        localStorage.setItem('userId', userId);
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
        return localStorage.getItem(USER_ID_KEY) || localStorage.getItem('userId');
    },

    /**
     * Get stored user name
     */
    getUserName(): string | null {
        return localStorage.getItem(USER_NAME_KEY) || localStorage.getItem('userName');
    },

    /**
     * Get stored user type/preference
     */
    getUserType(): string | null {
        return localStorage.getItem(USER_TYPE_KEY) || localStorage.getItem('userType');
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
