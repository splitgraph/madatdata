import { useSql, SqlProvider, makeSeafowlHTTPContext } from "@madatdata/react";
import { useMemo } from "react";

/**
 * The fully qualified URL of a page indexed by Google
 *
 * Example: `https://seafowl.io/docs/getting-started/introduction`
 */
type SitePage = Brand<string, "URL of page (fully qualified)">;
/**
 * A UTC Datetime, of arbitrary position (i.e., could refer to a week or month)
 *
 * Example (week  starting 2022-08-15): `2022-08-15T00:00:00`
 * Example (month starting 2022-08-01): `2022-08-01T00:00:00`
 */
type UTCDatetime = Brand<string, "ISO UTC Datetime">;
/**
 * An actual search query sent to Google
 *
 * Example: `sql over http`
 */
type SearchQuery = Brand<string, "Google search query">;
/**
 * The domain used to index the search data in Google search console (often
 * the same account includes search data for multiple sites).
 *
 * Example: `seafowl.io`
 */
type SearchDomain = Brand<string, "Domain for search data (sc-domain)">;

/**
 * The top 100 pages on the given domain, sorted in descending order by number
 * of clicks from Google search results, and including various metrics (total
 * impressions, total clicks, and average CTR).
 *
 * Example:
 *
 * ```ts
 * const { loading, error, response } = useHighestClicksByPage({
    domain: "seafowl.io" as SearchDomain,
  });
  ```
 *
 */
export const useHighestClicksByPage = ({ domain }: { domain: SearchDomain }) =>
  useSql<{
    total_impressions: number;
    total_clicks: number;
    page: SitePage;
    average_ctr: number;
  }>(`SELECT page,
    SUM(impressions::double) AS total_impressions,
    SUM(clicks::double) AS total_clicks,
    SUM(clicks::double) / SUM(impressions::double) AS average_ctr
    FROM "miles/splitgraph-seafowl-search-console.performance_report_page"
    WHERE site_url = 'sc-domain:${domain}'
    GROUP BY 1 ORDER BY 3 DESC
    LIMIT 100;`);

/**
 * Various metrics (average CTR, total clicks, total impressions) for the
 * entire domain, grouped by week.
 *
 * Example:
 *
 * ```ts
 * const { loading, error, response } = useOverallMetricsByWeek({
    domain: "seafowl.io" as SearchDomain,
  });
  ```
 *
 */
export const useOverallMetricsByWeek = ({ domain }: { domain: SearchDomain }) =>
  useSql<{
    average_ctr: number;
    total_clicks: number;
    total_impressions: number;
    week: UTCDatetime;
  }>(`SELECT DATE_TRUNC('week', date) AS week,
    SUM(impressions::double) AS total_impressions,
    SUM(clicks::double) AS total_clicks,
    SUM(clicks::double) / SUM(impressions::double) AS average_ctr
    FROM "miles/splitgraph-seafowl-search-console.performance_report_page"
    WHERE site_url = 'sc-domain:${domain}'
    GROUP BY 1 ORDER BY 1 ASC;`);

/**
 * Weekly "report" for the given page and domain (each row is a report), where
 * the report contains various metrics (average CTR, total clicks, total
 * impressions) and, where applicable, the growth percentage in total clicks
 * since the previous week.
 *
 * Example:
 *
 * ```ts
 * const { loading, error, response } = useWeeklyReportForPage({
    domain: "seafowl.io" as SearchDomain,
    page: "https://seafowl.io/docs/getting-started/introduction" as SitePage,
  });
  ```
 *
 */
export const useWeeklyReportForPage = ({
  domain,
  page,
}: {
  domain: SearchDomain;
  page: SitePage;
}) =>
  useSql<{
    average_ctr: number;
    total_clicks: number;
    total_impressions: number;
    week: UTCDatetime;
    weekly_clicks_growth_pct: number | undefined;
  }>(`WITH weekly_report AS (
        SELECT DATE_TRUNC('week', date) AS week,
        SUM(impressions::double) AS total_impressions,
        SUM(clicks::double) AS total_clicks,
        SUM(clicks::double) / SUM(impressions::double) AS average_ctr
        FROM "miles/splitgraph-seafowl-search-console.performance_report_page"
        WHERE page = '${page}' AND site_url = 'sc-domain:${domain}'
        GROUP BY 1 ORDER BY 1 ASC
    )
    SELECT
        week,
        total_impressions,
        total_clicks,
        average_ctr,
        (total_clicks / LAG(total_clicks) OVER (ORDER BY week)) * 100 - 100
            AS weekly_clicks_growth_pct
    FROM weekly_report;`);

/**
 * Arbitrary (unsorted) list of queries, where each row is a search query
 * including various metrics (average CTR, total clicks, total impressions)
 * over all time for the given domain.
 *
 * Example:
 *
 * ```ts
 * const { loading, error, response } = useMetricsByQuery({
    domain: "seafowl.io" as SearchDomain,
  });
  ```
 *
 */
export const useMetricsByQuery = ({ domain }: { domain: SearchDomain }) =>
  useSql<{
    average_ctr: number;
    query: SearchQuery;
    total_clicks: number;
    total_impressions: number;
  }>(`SELECT query,
    SUM(impressions::double) AS total_impressions,
    SUM(clicks::double) AS total_clicks,
    SUM(clicks::double) / SUM(impressions::double) AS average_ctr
    FROM "miles/splitgraph-seafowl-search-console.performance_report_query"
    WHERE site_url = 'sc-domain:${domain}'
    GROUP BY 1 ORDER BY 3 DESC
    LIMIT 100;`);

/**
 * Monthly "report" for the given search query and domain (each row is a report), where
 * the report contains various metrics (average CTR, total clicks, total
 * impressions) and, where applicable, the growth percentage in total clicks
 * since the previous month.
 *
 * Example:
 *
 * ```ts
 * const { loading, error, response } = useMonthlyReportForQuery({
    domain: "seafowl.io" as SearchDomain,
    query: "seafowl" as SearchQuery,
  });
  ```
 *
 */
export const useMonthlyReportForQuery = ({
  domain,
  query,
}: {
  domain: SearchDomain;
  query: SearchQuery;
}) =>
  useSql<{
    average_ctr: number;
    month: UTCDatetime;
    total_clicks: number;
    total_impressions: number;
    monthly_clicks_growth_pct: number | undefined;
  }>(`WITH monthly_report AS (
        SELECT DATE_TRUNC('month', date) AS month,
        SUM(impressions::double) AS total_impressions,
        SUM(clicks::double) AS total_clicks,
        SUM(clicks::double) / SUM(impressions::double) AS average_ctr
        FROM "miles/splitgraph-seafowl-search-console.performance_report_query"
        WHERE query = '${query}' AND site_url = 'sc-domain:${domain}'
        GROUP BY 1 ORDER BY 1 ASC
    )
    SELECT
        month,
        total_impressions,
        total_clicks,
        average_ctr,
        (total_clicks / LAG(total_clicks) OVER (ORDER BY month)) * 100 - 100
            AS monthly_clicks_growth_pct
    FROM monthly_report;`);

const ExampleComponentUsingSQL = () => {
  const { loading, error, response } = useMetricsByQuery({
    domain: "seafowl.io" as SearchDomain,
  });
  return (
    <pre
      style={{ minWidth: "100%", minHeight: 500 }}
      data-testid={`result-pre-${
        loading ? "loading" : response ? "pass" : error ? "fail" : "unknown"
      }`}
    >
      {JSON.stringify({ loading, error, response }, null, 2)}
    </pre>
  );
};

const SeafowlSampleQuery = () => {
  const seafowlDataContext = useMemo(
    () =>
      makeSeafowlHTTPContext({
        database: {
          dbname: "seafowl", // arbitrary
        },
        authenticatedCredential: undefined,
        host: {
          // temporary hacky mess
          dataHost: "demo.seafowl.cloud",
          apexDomain: "bogus",
          apiHost: "bogus",
          baseUrls: {
            gql: "bogus",
            sql: "https://demo.seafowl.cloud/q",
            auth: "bogus",
          },
          postgres: {
            host: "demo.seafowl.cloud",
            port: 6432,
            ssl: false,
          },
        },
      }),
    []
  );

  // Uses splitgraph.com by default (anon access supported for public data)
  return (
    <SqlProvider dataContext={seafowlDataContext}>
      <ExampleComponentUsingSQL />
    </SqlProvider>
  );
};

export default SeafowlSampleQuery;

/**
 * A utility for creating branded types.
 * Allows using nominal typing in TypeScript.
 * @see https://michalzalecki.com/nominal-typing-in-typescript/#approach-4-intersection-types-and-brands
 */
export type Brand<K, T> = K & { __brand: T };
