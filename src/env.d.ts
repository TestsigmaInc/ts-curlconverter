/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TREE_SITTER_PATH: string;
  readonly VITE_TREE_SITTER_BASH_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
