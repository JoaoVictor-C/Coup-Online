declare namespace NodeJS {
    interface ProcessEnv {
      readonly VITE_APP_API_BASE_URL: string;
      readonly VITE_APP_SIGNALR_HUB_URL: string;
    }
  }