import { defineConfig } from "vite";

import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  define: {
    "import.meta.env.VITE_TREE_SITTER_FILES_S3_URL": JSON.stringify(
      process.env.VITE_TREE_SITTER_FILES_S3_URL,
    ),
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "ts-curlconverter",
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {},
  },
});
