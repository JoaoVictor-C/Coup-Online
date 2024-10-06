import axios from 'axios';

const API_BASE_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE_URL_DEVELOPMENT || 'http://localhost:8080/api'
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';


const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Adjust based on your auth implementation
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;