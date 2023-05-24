namespace NodeJS {
  interface ProcessEnv {
    /**
     * The API key of an existing Splitgraph account.
     *
     * This should be defined in `.env.local` (a git-ignored file) or in Vercel settings.
     *
     * Get credentials: https://www.splitgraph.com/connect
     */
    SPLITGRAPH_API_KEY: string;

    /**
     * The API secret of an existing Splitgraph account.
     *
     * This should be defined in `.env.local` (a git-ignored file) or in Vercel settings.
     *
     * Get credentials: https://www.splitgraph.com/connect
     */
    SPLITGRAPH_API_SECRET: string;

    /**
     * A GitHub personal access token that can be used for importing repositories.
     * It will be passed to the Airbyte connector that runs on Splitgraph servers
     * and ingests data from GitHub into Splitgraph.
     *
     * This should be defined in `.env.local` (a git-ignored file) or in Vercel settings.
     *
     * Create one here: https://github.com/settings/personal-access-tokens/new
     */
    GITHUB_PAT_SECRET: string;

    /**
     * Optional environment variable containing the address of a proxy instance
     * through which to forward requests from API routes. See next.config.js
     * for where it's setup.
     *
     * This is useful for debugging and development.
     */
    MITMPROXY_ADDRESS?: string;
  }
}
