import { useSql } from "@madatdata/react";
import type { SitePage, UTCDatetime, SearchQuery, SearchDomain } from "./types";

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
    FROM weekly_report
    ORDER BY 1 DESC;`);

/**
 * List of queries, ordered descending by total clicks, where each row is a
 * search query including various metrics (average CTR, total clicks, total
 * impressions) over all time for the given domain.
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
 * since the previous month. Most recent months appear first.
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
    FROM monthly_report
    ORDER BY 1 DESC;`);
