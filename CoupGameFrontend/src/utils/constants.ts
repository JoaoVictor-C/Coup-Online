export const SIGNALR_HUB_URL = process.env.NODE_ENV === 'production'
  ? process.env.VITE_APP_SIGNALR_HUB_URL
  : 'http://localhost:5000/gameHub';

export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.VITE_APP_API_BASE_URL
  : 'http://localhost:5000/api';
