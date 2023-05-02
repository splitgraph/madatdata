const originalEmitWarning = process.emitWarning;

let suppressed = false;

/**
 * Don't emit the NODE_TLS_REJECT_UNAUTHORIZED warning on every request in
 * development, if INSECURE_TLS is set to "1"
 *
 * The process, and any child process it spawns, should call this function prior
 * to executing any other code.
 *
 * It is possible to preload a module with `node --require`, so the safest way to
 * execute this function first is to call it from a script passed to `--require`.
 *
 * Sometimes, like with Next.js, it is not sufficient to simply require the
 * function like a polyfill in `next.config.js`, because every spawned child
 * process does not execute `next.config.js` before continuing. With Vite, this
 * is not a problem as `vite.setup.ts` appears to run in every child process.
 *
 * Usage - with `node --require` directly:
 *
 * ```
 * node --require=./setup-insecure-tls.js
 *
 * # with yarn in package.json:
 * INSECURE_TLS=1 NODE_OPTIONS=\"${NODE_OPTIONS:-} --require=./suppress-insecure-tls-warning\" yarn vitest
 * ```
 *
 * Usage - with a wrapper script (which may itself be passed to `node --require`):
 *
 * ```
 * const
 * process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
 * suppress();
 * ```
 *
 * Adapted from: https://github.com/cypress-io/cypress/pull/5256/files
 */
function suppress() {
  if (suppressed) {
    return;
  }

  if (process.env.INSECURE_TLS !== "1") {
    console.error("FATAL: Not suppressing TLS warning, INSECURE_TLS != 1");
    process.exit(1);
  }

  // On first startup, NODE_ENV is undefined, so let that through (note: this
  // script should never even eval in prod env, since package.json needs to pass
  // node --require, which it only does for `yarn dev-proxied`)
  if (
    process.env.NODE_ENV &&
    process.env.NODE_ENV !== "development" &&
    process.env.NODE_ENV !== "test" &&
    process.env.NODE_ENV !== "integration"
  ) {
    console.error("FATAL: Not suppressing TLS warning, NODE_ENV=", NODE_ENV);
    process.exit(1);
  }

  // Uncomment to restore warning spam (note: prints once for every child process)
  // console.warn(
  //   `[pid=${process.pid}] Suppress NODE_TLS_REJECT_UNAUTHORIZED warning`
  // );

  suppressed = true;

  process.emitWarning = (warning, ...args) => {
    if (isNodeTlsRejectUnauthorizedWarning(warning)) {
      // node only emits the warning once _per process_, but many common packages
      // including vite, next.js, likely webpack, all launch multiple processes.
      // That's why we need to use `node --require` to call this code in each,
      // simply running as a global
      // https://github.com/nodejs/node/blob/v16.10.0/lib/_tls_wrap.js
      process.emitWarning = originalEmitWarning;

      return;
    }

    return originalEmitWarning.call(process, warning, ...args);
  };
}

const isNodeTlsRejectUnauthorizedWarning = (warning) => {
  return (
    typeof warning === "string" &&
    warning.includes("NODE_TLS_REJECT_UNAUTHORIZED")
  );
};

if (process.env.INSECURE_TLS === "1") {
  if (require.main) {
    console.log("INSECURE_TLS detected, suppress it");
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    suppress();
  } else {
    global.suppressInsecureTlsWarning = suppress;
  }
}
