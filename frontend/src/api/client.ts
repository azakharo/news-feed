import axios from 'axios';

const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string) || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add request/response interceptors for error handling
apiClient.interceptors.response.use(
  response => response,
  (error: unknown) => {
    // Global error handling
    console.error('API Error:', error);
    if (error instanceof Error) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error(String(error)));
  },
);
