import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@utils/types';
import authService from '@services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  verifyToken: (token: string, userId: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isLoggedIn: false,
  verifyToken: async () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const fetchedUser = await authService.getUser(token);
          setUser(fetchedUser);
        } catch (error) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login(username, password);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.register(username, email, password);
      console.log(response);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const verifyToken = async (token: string, userId: string) => {
    const response = await authService.verifyToken(token, userId);
    console.log(response);
    if (!response) {
      logout();
    }
    return response;
  };

  const isLoggedIn = user !== null;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isLoggedIn, verifyToken }}>
      {children}
    </AuthContext.Provider>
  );
};
