import { useRouter } from "next/router";
import { useWeeklyReportForPage } from "../../../../../sql-queries";
import type { SearchDomain, SitePage } from "../../../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../../../components/common";
import { BaseLayout } from "../../../../../components/BaseLayout";

const WeeklyReportsForPage = () => {
  const { domain, page } = useRouter().query as {
    domain: SearchDomain;
    page: SitePage;
  };

  const { loading, error, response } = useWeeklyReportForPage({
    domain,
    page,
  });

  if (loading) {
    return <LoadingSkeleton />;
  } else if (error) {
    return <SqlQueryError error={error} />;
  } else if (!response.rows.length) {
    return <EmptyResult />;
  }

  const { rows } = response;

  return (
    <BaseLayout
      heading={
        <>
          {" "}
          Weekly Reports for <code>{domain}</code> traffic to page:{" "}
          <code>{page}</code>
        </>
      }
      breadcrumbs={{
        crumbs: [
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
          { href: `/metrics/${encodeURIComponent(domain)}`, anchor: domain },
          {
            href: `/metrics/${encodeURIComponent(domain)}/pages`,
            anchor: "Pages",
          },
          {
            href: `/metrics/${encodeURIComponent(
              domain
            )}/pages/${encodeURIComponent(page)}`,
            anchor: page,
          },
          {
            href: `/metrics/${encodeURIComponent(
              domain
            )}/pages/${encodeURIComponent(page)}/weekly`,
            anchor: "Weekly",
          },
        ],
      }}
    >
      <ul>
        {rows.map(
          ({
            week,
            average_ctr,
            total_clicks,
            total_impressions,
            weekly_clicks_growth_pct,
          }) => (
            <li key={week}>
              <span>Week starting {week}</span>
              <ul>
                <li>
                  {total_clicks} total clicks
                  {typeof weekly_clicks_growth_pct !== "undefined" && (
                    <span>
                      {" "}
                      ({(weekly_clicks_growth_pct * 100).toFixed(2)}% growth
                      from previous week)
                    </span>
                  )}
                </li>
                <li>{total_impressions} total impressions</li>
                <li>{(average_ctr * 100).toFixed(2)} average CTR</li>
              </ul>
            </li>
          )
        )}
      </ul>
    </BaseLayout>
  );
};

export default WeeklyReportsForPage;
