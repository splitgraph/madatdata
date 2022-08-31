import { bootstrap as bootstrapGlobalAgent } from "global-agent";
import { Agent, ProxyAgent, setGlobalDispatcher } from "undici";

const [nodeMajorVersion, _nodeMinorVersion, _nodePatchVersion] = process.version
  .split(".")
  .map((x) => parseInt(x[0] === "v" ? x.slice(1) : x));

// NOTE: `fetch` needs to be polyfilled in Node.
// The dependency is in the root of the mono-repo, and any package that relies
// on it is responsible for polyfilling it in its own bundle
// import "cross-fetch/polyfill";

console.log(
  `SET window.fetch<${window.fetch}> = globalThis.fetch<${globalThis.fetch}>`
);
window.fetch = globalThis.fetch;

// Optionally disable TLS verification and suppress its resultant warning spam
import "./suppress-insecure-tls-warning";

if (process.env.INSECURE_TLS === "1") {
  // NOTE: For Vite, it appears sufficient to call the code in this setup,
  // because it appears to execute on spawn of every child process.
  // Whereas with Next.js, child processes do not execute next.config.js, and
  // so in that case the code must be called from `node --require`
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  suppressInsecureTlsWarning();

  if (nodeMajorVersion >= 18 && !process.env.MITM) {
    console.log("Setup non-MITM insecure https Agent for undici (node native)");
    setGlobalDispatcher(
      new Agent({
        connect: { rejectUnauthorized: false, requestCert: false },
      })
    );
  }
}

// Optionally proxy outbound requests through proxy defined in MITM env var
// example: `INSECURE_TLS=1 MITM=http://127.0.0.1:7979 yarn vitest`
// Developer is responsible for operation of proxy, but we recommend `mitmproxy`
// NOTE: It's also posible to set `GLOBAL_AGENT_*` env variables directly,
// see: https://github.com/gajus/global-agent#environment-variables
if (process.env.MITM) {
  if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
    process.env["GLOBAL_AGENT_HTTP_PROXY"] = process.env.MITM;
  }

  bootstrapGlobalAgent();

  if (nodeMajorVersion >= 18) {
    const mitmProxyOpts: ConstructorParameters<typeof ProxyAgent>[0] = {
      uri: process.env.MITM,
      ...(process.env.INSECURE_TLS === "1"
        ? {
            connect: {
              rejectUnauthorized: false,
              requestCert: false,
            },
          }
        : {}),
    };

    setGlobalDispatcher(new ProxyAgent(mitmProxyOpts));
  }

  //   < 18  : use global agent to patch globally
  //  >= 18  : native fetch, powered by undici, set undici Agent as global dispatcher
  // if (nodeMajorVersion < 18) {
  //   if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
  //     process.env["GLOBAL_AGENT_HTTP_PROXY"] = process.env.MITM;
  //   }

  //   bootstrapGlobalAgent();
  // } else {
  //   const mitmProxyOpts: ConstructorParameters<typeof ProxyAgent>[0] = {
  //     uri: process.env.MITM,
  //     ...(process.env.INSECURE_TLS === "1"
  //       ? {
  //           connect: {
  //             rejectUnauthorized: false,
  //             requestCert: false,
  //           },
  //         }
  //       : {}),
  //   };

  //   setGlobalDispatcher(new ProxyAgent(mitmProxyOpts));
  // }
  // } else {
}

declare global {
  function suppressInsecureTlsWarning(): void;
}
