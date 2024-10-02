import api from '../../services/api';
import { AUTH_START, AUTH_SUCCESS, AUTH_ERROR, LOGOUT, GET_PROFILE } from './actionTypes';

// Register User
export const register = (userData) => async (dispatch) => {
  try {
    const res = await api.post('/auth/register', userData);
    localStorage.setItem('token', res.data.token);
    dispatch({ type: AUTH_SUCCESS, payload: res.data });
  } catch (error) {
    const errorMsg =
      error.response && error.response.data ? error.response.data.message : 'Registration failed';
    dispatch({ type: AUTH_ERROR, payload: errorMsg });
  }
};

// Login User
export const login = (username, password) => async (dispatch) => {
  try {
    dispatch({ type: AUTH_START });
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    dispatch({ type: AUTH_SUCCESS, payload: res.data });
  } catch (error) {
    const errorMsg =
      error.response && error.response.data ? error.response.data.message : 'Login failed';
    dispatch({ type: AUTH_ERROR, payload: errorMsg });
  }
};

// Logout User
export const logout = () => (dispatch) => {
  localStorage.removeItem('token');
  dispatch({ type: LOGOUT });
};

// Get Profile
export const getProfile = () => async (dispatch) => {
  try {
    const res = await api.get('/auth/profile');
    dispatch({ type: GET_PROFILE, payload: res.data });
  } catch (error) {
    const errorMsg =
      error.response && error.response.data ? error.response.data.message : 'Failed to fetch profile';
    dispatch({ type: AUTH_ERROR, payload: errorMsg });
  }
};