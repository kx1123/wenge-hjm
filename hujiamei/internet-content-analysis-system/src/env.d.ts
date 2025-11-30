/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QWEN_API_KEY?: string
  readonly VITE_AI_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

