import { defineConfig, PluginContainer, PluginOption } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Example:
 *
 * ```ts
 * import { dataContext } from "sql:arbitrary-name-for-some-context";
 * ```
 */
function experimentalPlugin() {
  const virtualModulePrefix = "sql";

  let ctx: PluginContainer;

  return {
    name: "sql-plugin",
    resolveId(id) {
      if (id.startsWith(virtualModulePrefix)) {
        // https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention
        return "\0" + id;
      }
    },
    load(id) {
      if (id.startsWith("\0" + virtualModulePrefix)) {
        return `
const id = \`${escapeBacktick(id.slice(1))}\`;
export const dataContext = {
  id: id
};
`;
      }
    },
  } as unknown as PluginContainer as unknown as PluginOption;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), experimentalPlugin()],
});

// adapted from: https://gist.github.com/getify/3667624
function escapeBacktick(str) {
  return str.replace(/\\([\s\S])|(`)/g, "\\$1$2");
}
