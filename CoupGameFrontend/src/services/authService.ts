import api from './api';
import { User } from '@utils/types';

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterResponse {
  message: string;
}

const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  register: async (username: string, email: string, password: string): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  getUser: async (token: string): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  verifyToken: async (token: string, userId: string): Promise<boolean> => {
    const response = await api.get(`/auth/verifyToken?token=${token}&userId=${userId}`);
    return response.data;
  }
};

export default authService;

