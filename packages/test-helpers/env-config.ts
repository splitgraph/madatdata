const environmentHasCredential = () => {
  return (
    // @ts-expect-error https://stackoverflow.com/a/70711231
    !!import.meta.env.VITE_TEST_DDN_API_KEY &&
    // @ts-expect-error https://stackoverflow.com/a/70711231
    !!import.meta.env.VITE_TEST_DDN_API_SECRET
  );
};

const shouldIncludeIntegrationTests = () => {
  return (
    environmentHasCredential() &&
    // @ts-expect-error https://stackoverflow.com/a/70711231
    !!import.meta.env.VITE_TEST_INTEGRATION
  );
};

/**
 * Inspect environment for configuration indicating whether to run integration
 * tests against the real production DDN at Splitgraph.com.
 *
 * Specifically, return `true` (to _skip_ integration tests) in all cases,
 * except return `false` when all of the following variables are non-empty:
 *
 *  * `VITE_TEST_DDN_API_KEY`
 *  * `VITE_TEST_DDN_API_SECRET`
 *  * `VITE_TEST_INTEGRATION`
 *
 * This function should be used to mark integration tests, by assigning its
 * return value to the first argument of `describe.skipIf`, for example:
 *
 * ```ts
 * describe.skipIf(shouldSkipIntegrationTests())("real DDN", () => {
 *   it("does something successfully when a real client talks to it", async () => {
 *     const db = createRealDb();
 *     const { username: namespace } = await fetchToken(db);
 *
 *     // ...
 *
 *   // NOTE: the final positional argument (testTimeout) can be useful
 *   }, 10_000);
 * });
 * ```
 *
 * For integration testing in development, one typical workflow is to set these
 * variables in a file called `.env.integration.local`, to match the
 * `.gitignore` pattern of `.env*.local` for files with secrets or local config.
 *
 * Then, run Vitest in the "mode" matching the `*`, e.g. with `integration`:
 *
 * ```bash
 * yarn test --mode integration
 * ```
 *
 * This will source the environment variables in `.env.integration.local` (and
 * any other `.env.integration.*` files defined according to `dotenv` loading
 * order), thus running Vitest in integration mode.
 *
 * @returns true if environment does not expect integration tests to run
 */
export const shouldSkipIntegrationTests = () => {
  return !shouldIncludeIntegrationTests();
};
