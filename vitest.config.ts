import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import react from "@vitejs/plugin-react";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      include: "packages/react/**.{ts,tsx}",
    }),
  ],
  resolve: {
    alias: [
      {
        find: "@madatdata/root",
        replacement: currentDirectoryPath,
      },
      {
        find: "@madatdata/client-http",
        replacement: join(currentDirectoryPath, "packages", "client-http"),
      },
      {
        find: "@madatdata/db-splitgraph",
        replacement: join(currentDirectoryPath, "packages", "db-splitgraph"),
      },
      {
        find: "@madatdata/core",
        replacement: join(currentDirectoryPath, "packages", "core"),
      },
      {
        find: "@madatdata/react",
        replacement: join(currentDirectoryPath, "packages", "react"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest-setup.ts",
  },
});
