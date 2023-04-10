import { defineConfig, configDefaults } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname } from "path";
import react from "@vitejs/plugin-react";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      include: "packages/react/**.{ts,tsx}",
    }),
  ],
  resolve: {
    // conditions: ["dev"],
    // alias: [
    //   {
    //     find: "@madatdata/root",
    //     replacement: currentDirectoryPath,
    //   },
    // ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest-setup.ts",
    coverage: {
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        "vitest-setup.ts",
        "suppress-insecure-tls-warning.js",
        "./packages/db-splitgraph/plugins/importers/generated/*/*.ts",
      ],
    },
  },
});
