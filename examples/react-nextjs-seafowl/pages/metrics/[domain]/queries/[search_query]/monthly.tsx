import { useRouter } from "next/router";
import { useMonthlyReportForQuery } from "../../../../../sql-queries";
import type { SearchDomain, SearchQuery } from "../../../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../../../components/common";

const MonthlyReportsForSearchQuery = () => {
  const { domain, search_query: query } = useRouter().query as {
    domain: SearchDomain;
    search_query: SearchQuery;
  };

  const { loading, error, response } = useMonthlyReportForQuery({
    domain,
    query,
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
        Monthly Reports for <code>{domain}</code> traffic from query:{" "}
        <code>{query}</code>
      </h2>
      <ul>
        {rows.map(
          ({
            month,
            average_ctr,
            total_clicks,
            total_impressions,
            monthly_clicks_growth_pct,
          }) => (
            <li key={month}>
              <span>Month starting {month}</span>
              <ul>
                <li>
                  {total_clicks} total clicks
                  {typeof monthly_clicks_growth_pct !== "undefined" && (
                    <span>
                      {" "}
                      ({(monthly_clicks_growth_pct * 100).toFixed(2)}% growth
                      from previous month)
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

export default MonthlyReportsForSearchQuery;
