export const SIGNALR_HUB_URL = import.meta.env.DEV
  ? import.meta.env.VITE_APP_SIGNALR_HUB_URL_DEVELOPMENT
  : import.meta.env.VITE_APP_SIGNALR_HUB_URL;

export const API_BASE_URL = import.meta.env.DEV
  ? import.meta.env.VITE_APP_API_BASE_URL_DEVELOPMENT
  : import.meta.env.VITE_APP_API_BASE_URL;
