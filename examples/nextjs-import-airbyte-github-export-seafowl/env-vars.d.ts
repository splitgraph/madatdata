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

    /**
     * The namespace of the repository in Splitgraph where metadata is stored
     * containing the state of imported GitHub repositories, which should contain
     * the repository `SPLITGRAPH_GITHUB_ANALYTICS_META_REPOSITORY`.
     *
     * This should be defined in `.env.local`, since it's not checked into Git
     * and can vary between users. It should match the username associated with
     * the `SPLITGRAPH_API_KEY`
     *
     * Example:
     *
     * ```
     * miles/splitgraph-github-analytics.completed_repositories
     * ^^^^^
     * SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE=miles
     * ```
     */
    SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE: string;

    /**
     * The repository (no namespace) in Splitgraph where metadata is stored
     * containing the state of imported GitHub repositories, which should be a
     * repository contained inside `SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE`.
     *
     * This is defined by default in `.env` which is checked into Git.
     *
     * * Example:
     *
     * ```
     * miles/splitgraph-github-analytics.completed_repositories
     *       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
     *       SPLITGRAPH_GITHUB_ANALYTICS_META_REPOSITORY=splitgraph-github-analytics
     * ```
     */
    SPLITGRAPH_GITHUB_ANALYTICS_META_REPOSITORY: string;

    /**
     * The name of the table containing completed repositories, which are inserted
     * when the import/export is complete, and which can be queried to render the
     * sidebar containing previously imported github repositories.
     *
     * This is defined by default in `.env` which is checked into Git.
     *
     * Example:
     *
     * ```
     * miles/splitgraph-github-analytics.completed_repositories
     *                                   ^^^^^^^^^^^^^^^^^^^^^^
     *       SPLITGRAPH_GITHUB_ANALYTICS_META_COMPLETED_TABLE=completed_repositories
     * ```
     */
    SPLITGRAPH_GITHUB_ANALYTICS_META_COMPLETED_TABLE: string;
  }
}
