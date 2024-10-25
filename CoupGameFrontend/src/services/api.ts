import axios from 'axios';
import { API_BASE_URL } from '@utils/constants';
import { getToken } from '@utils/auth';

const api = axios.create({
  baseURL: API_BASE_URL
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

