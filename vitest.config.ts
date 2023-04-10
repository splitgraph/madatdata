import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      include: "packages/react/**.{ts,tsx}",
    }),
  ],
  resolve: {
    conditions: ["dev"],
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
