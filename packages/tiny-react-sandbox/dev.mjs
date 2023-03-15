import esbuild from "esbuild";
import process from "process";
import path from "node:path";

const context = await esbuild
  .context({
    entryPoints: [
      "./pages/ast-debugger.tsx",
      "./pages/dsx.tsx",
      "./pages/ddn.tsx",
    ],
    bundle: true,
    external: ["crypto"],
    outdir: "./www/dist",
    // This plugin overrides the "crypto" module to export a (basically) empty shim,
    // which is okay as long as our code only accesses the module if window.crypto does not exist
    plugins: [
      {
        name: "hide-crypto",
        setup(build) {
          build.onResolve({ filter: /^crypto/ }, () => ({
            path: path.join(process.cwd(), "crypto-shim.mjs"),
          }));
        },
      },
    ],
  })
  .catch(() => {
    console.log("ERROR");
    process.exit(1);
  });

await context.rebuild();

await context.watch();

const serveResult = await context.serve({
  servedir: "./www",
  host: "localhost",
});

console.log(`Listening on http://${serveResult.host}:${serveResult.port}`);
console.log(" http://localhost:3000/ast-debugger.html");
console.log(" http://localhost:3000/dsx.html");
console.log(" http://localhost:3000/ddn.html");
