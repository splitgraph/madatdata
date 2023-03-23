import { useRouter } from "next/router";
import { useOverallMetricsByWeek } from "../../../sql-queries";
import type { SearchDomain } from "../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../components/common";
import { BaseLayout } from "../../../components/BaseLayout";

const WeeklyOverallReports = () => {
  const { domain } = useRouter().query as {
    domain: SearchDomain;
  };

  const { loading, error, response } = useOverallMetricsByWeek({
    domain,
  });

  return (
    <BaseLayout
      heading={
        <>
          Overall Weekly Reports for <code>{domain}</code>
        </>
      }
      breadcrumbs={{
        crumbs: [
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
          { href: `/metrics/${encodeURIComponent(domain)}`, anchor: domain },
          {
            href: `/metrics/${encodeURIComponent(domain)}/weekly`,
            anchor: "Weekly",
          },
        ],
      }}
    >
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <SqlQueryError error={error} />
      ) : !response.rows.length ? (
        <EmptyResult />
      ) : (
        <ul>
          {response.rows.map(
            ({ week, average_ctr, total_clicks, total_impressions }) => (
              <li key={week}>
                <span>Week starting {week}</span>
                <ul>
                  <li>{total_clicks} total clicks</li>
                  <li>{total_impressions} total impressions</li>
                  <li>{(average_ctr * 100).toFixed(2)} average CTR</li>
                </ul>
              </li>
            )
          )}
        </ul>
      )}
    </BaseLayout>
  );
};

export default WeeklyOverallReports;
