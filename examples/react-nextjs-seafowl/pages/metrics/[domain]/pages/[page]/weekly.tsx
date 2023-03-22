import { useRouter } from "next/router";
import { useWeeklyReportForPage } from "../../../../../sql-queries";
import type { SearchDomain, SitePage } from "../../../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../../../components/common";

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
    <div>
      <h2>
        Weekly Reports for <code>{domain}</code> traffic to page:{" "}
        <code>{page}</code>
      </h2>
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
    </div>
  );
};

export default WeeklyReportsForPage;
