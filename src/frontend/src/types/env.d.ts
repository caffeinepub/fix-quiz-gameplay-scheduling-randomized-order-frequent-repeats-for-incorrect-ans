/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly VITE_CANISTER_ID_BACKEND?: string;
  readonly VITE_BACKEND_CANISTER_ID?: string;
  readonly VITE_TRANSLATION_API_URL?: string;
  readonly VITE_BUILD_TIMESTAMP?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_DEPLOYMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __ENV__?: {
    CANISTER_ID_BACKEND?: string;
  };
  __ENV_LOAD_STATUS__?: 'loading' | 'loaded' | 'missing' | 'error';
}
