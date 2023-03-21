/**
 * The fully qualified URL of a page indexed by Google
 *
 * Example: `https://seafowl.io/docs/getting-started/introduction`
 */
export type SitePage = Brand<string, "URL of page (fully qualified)">;

/**
 * A UTC Datetime, of arbitrary position (i.e., could refer to a week or month)
 *
 * Example (week  starting 2022-08-15): `2022-08-15T00:00:00`
 * Example (month starting 2022-08-01): `2022-08-01T00:00:00`
 */
export type UTCDatetime = Brand<string, "ISO UTC Datetime">;

/**
 * An actual search query sent to Google
 *
 * Example: `sql over http`
 */
export type SearchQuery = Brand<string, "Google search query">;

/**
 * The domain used to index the search data in Google search console (often
 * the same account includes search data for multiple sites).
 *
 * Example: `seafowl.io`
 */
export type SearchDomain = Brand<string, "Domain for search data (sc-domain)">;

/**
 * A utility for creating branded types.
 * Allows using nominal typing in TypeScript.
 * @see https://michalzalecki.com/nominal-typing-in-typescript/#approach-4-intersection-types-and-brands
 */
export type Brand<K, T> = K & { __brand: T };
