/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_DISPLAY_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
