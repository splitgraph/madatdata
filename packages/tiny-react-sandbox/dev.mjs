/**
 * Adapted from:
 * * https://github.com/evanw/esbuild/issues/802#issuecomment-1116495659
 * * https://github.com/evanw/esbuild/issues/802#issuecomment-819578182
 */

import esbuild from "esbuild";
import { createServer, request } from "http";
import process from "process";

const clients = [];

esbuild
  .build({
    entryPoints: [
      "./pages/ast-debugger.tsx",
      "./pages/dsx.tsx",
      "./pages/ddn.tsx",
    ],
    bundle: true,
    outdir: "./www/dist",
    watch: {
      onRebuild(error, result) {
        clients.forEach((res) => res.write("data: update\n\n"));
        clients.length = 0;
        console.log(error ? error : "...");
      },
    },
  })
  .catch(() => process.exit(1));

esbuild.serve({ servedir: "./www", host: "localhost" }, {}).then(() => {
  createServer((req, res) => {
    const { url, method, headers } = req;
    if (req.url === "/esbuild")
      return clients.push(
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        })
      );
    const path = ~url.split("/").pop().indexOf(".") ? url : `/index.html`;
    // NOTE: SSE limited to 6 tabs; any additional tabs will appear not to load
    // @see: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
    req.pipe(
      request(
        { hostname: "127.0.0.1", port: 8000, path, method, headers },
        (prxRes) => {
          if (url.startsWith("/dist/")) {
            const jsReloadIIFE =
              ' (() => new EventSource("/esbuild").onmessage = () => location.reload())();';

            const newHeaders = {
              ...prxRes.headers,
              "content-length":
                parseInt(prxRes.headers["content-length"], 10) +
                jsReloadIIFE.length,
            };

            res.writeHead(prxRes.statusCode, newHeaders);
            res.write(jsReloadIIFE);
          } else {
            res.writeHead(prxRes.statusCode, prxRes.headers);
          }
          prxRes.pipe(res, { end: true });
        }
      ),
      { end: true }
    );
  }).listen(3000);

  setTimeout(() => {
    console.log("Listening on localhost:3000 ...");
    console.log(" http://localhost:3000/ast-debugger.html");
    console.log(" http://localhost:3000/dsx.html");
    console.log(" http://localhost:3000/ddn.html");
  });
});
