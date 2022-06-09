import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [],
  resolve: {
    alias: [
      {
        find: "@madatdata/root",
        replacement: currentDirectoryPath,
      },
      {
        find: "@madatdata/client",
        replacement: join(currentDirectoryPath, "packages", "client"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest-setup.ts",
  },
});
