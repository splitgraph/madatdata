import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

import { fileURLToPath } from "url";
import { join, dirname, relative, sep } from "path";

import type { PluginContainer, ResolveFn } from "vite";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      include: "packages/react/**.{ts,tsx}",
    }),
  ],
  resolve: {
    conditions: ["default"],
    // conditions: ["deau"],
    alias: [
      {
        find: /^@madatdata\/(?!test-helpers)(.*)$/,
        replacement: join(
          currentDirectoryPath,
          "packages",
          "$1",
          "build",
          "es2020-commonjs",
          "index.cjs"
          // "build",
          // "react-nextjs-basic-hooks/node_modules/@madatdata/$1"
          // "examples",
          // "react-nextjs-basic-hooks/node_modules/@madatdata/$1"
        ),
      },
    ],
  },
  test: {
    environment: "node",
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
