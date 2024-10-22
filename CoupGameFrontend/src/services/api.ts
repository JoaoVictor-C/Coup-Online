import axios from 'axios';
import { API_BASE_URL } from '@utils/constants';

const api = axios.create({
  baseURL: 'https://coup-online-941324057012.southamerica-east1.run.app/api'
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

