import { defineConfig, PluginContainer, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import Inspect from "vite-plugin-inspect";

/**
 * Example:
 *
 * ```ts
 * import { dataContext } from "sql:arbitrary-name-for-some-context";
 * ```
 */
function experimentalPlugin() {
  const virtualModulePrefix = "sql";

  const resolveState: { count: number } = { count: 0 };
  let resolveCount: number = 0;

  const loadState: { count: number } = { count: 0 };
  let loadCount: number = 0;

  return {
    name: "sql-plugin",
    resolveId(id: string, ...resolveIdArgs: unknown[]) {
      if (id.startsWith(virtualModulePrefix)) {
        console.log("\nresolveIdArgs:", id, resolveIdArgs);
        console.log("GET resolveCount", resolveCount);
        console.log("GET resolveState", JSON.stringify(resolveState));
        resolveCount = resolveCount + 1;
        resolveState.count = resolveState.count + 1;

        // debugger;
        // https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention
        return "\0" + id;
      }
    },
    load(id: string, ...loadArgs: unknown[]) {
      if (id.startsWith("\0" + virtualModulePrefix)) {
        console.log("\nloadArgs:", id, loadArgs);
        console.log("GET loadCount", loadCount);
        console.log("GET loadState", JSON.stringify(loadState));
        loadCount = loadCount + 1;
        loadState.count = loadState.count + 1;

        // debugger;
        return `
console.log("here");
console.log(import.meta);
const id = \`${escapeBacktick(id.slice(1))}\`;
export const dataContext = {
  id: id,
  metaUrl: import.meta.url,
  importMeta: JSON.parse(JSON.stringify(import.meta, null, 2))
};

export const getDataContext = () => ({ ...dataContext });
`;
      }
    },
  } as unknown as PluginContainer as unknown as PluginOption;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [Inspect(), react(), experimentalPlugin()],
});

// adapted from: https://gist.github.com/getify/3667624
function escapeBacktick(str: string) {
  return str.replace(/\\([\s\S])|(`)/g, "\\$1$2");
}
