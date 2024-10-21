import api from './api';
import { User } from '@utils/types';

interface LoginResponse {
  token: string;
  user: User;
}

const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  register: async (username: string, email: string, password: string): Promise<void> => {
    await api.post('/auth/register', { username, email, password });
  },
  getUser: async (token: string): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export default authService;

