/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_AI_BASE_URL: string
  readonly VITE_DEFAULT_AI_MODEL: string
  readonly VITE_DEFAULT_AI_PROVIDER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
