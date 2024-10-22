export const SIGNALR_HUB_URL = process.env.NODE_ENV === 'production'
  ? process.env.VITE_APP_SIGNALR_HUB_URL
  : 'https://coup-online-941324057012.southamerica-east1.run.app/gamehub';

export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.VITE_APP_API_BASE_URL
  : https://coup-online-941324057012.southamerica-east1.run.app/api';
