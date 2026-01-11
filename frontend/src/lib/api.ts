import axios from 'axios';
import { auth } from './auth';

const API_BASE_URL = 'http://localhost:8001';

const api = axios.create({
    baseURL: "http://localhost:8001",
    headers: {
        "Content-Type": "application/json",
    },
});

// Add auth token to all requests
api.interceptors.request.use(
    (config) => {
        const token = auth.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - logout
            auth.logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
