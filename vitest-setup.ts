// NOTE: `fetch` needs to be polyfilled in Node.
// The dependency is in the root of the mono-repo, and any package that relies
// on it is responsible for polyfilling it in its own bundle
import "cross-fetch/polyfill";

// Optionally disable TLS verification and suppress its resultant warning spam
import "./suppress-insecure-tls-warning";
if (process.env.INSECURE_TLS === "1") {
  // NOTE: For Vite, it appears sufficient to call the code in this setup,
  // because it appears to execute on spawn of every child process.
  // Whereas with Next.js, child processes do not execute next.config.js, and
  // so in that case the code must be called from `node --require`
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  suppressInsecureTlsWarning();
}

declare global {
  function suppressInsecureTlsWarning(): void;
}
