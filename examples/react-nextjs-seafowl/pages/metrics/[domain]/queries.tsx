import { useRouter } from "next/router";
import { useMetricsByQuery } from "../../../sql-queries";
import type { SearchDomain } from "../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../components/common";
import Link from "next/link";
import { BaseLayout } from "../../../components/BaseLayout";

const QueriesForDomain = () => {
  const domain = useRouter().query.domain as SearchDomain;

  const { loading, error, response } = useMetricsByQuery({
    domain,
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
          Queries for <code>{domain}</code>
        </>
      }
      breadcrumbs={{
        crumbs: [
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
          { href: `/metrics/${encodeURIComponent(domain)}`, anchor: domain },
          {
            href: `/metrics/${encodeURIComponent(domain)}/queries`,
            anchor: "Queries",
          },
        ],
      }}
    >
      <ul>
        {rows.map(({ query, average_ctr, total_clicks, total_impressions }) => (
          <li key={query}>
            <Link
              href={`/metrics/${encodeURIComponent(
                domain
              )}/queries/${encodeURIComponent(query)}`}
            >
              {query}
            </Link>{" "}
            ({total_clicks} clicks, {total_impressions} impressions,{" "}
            {(average_ctr * 100).toFixed(2)}% average CTR)
          </li>
        ))}
      </ul>
    </BaseLayout>
  );
};

export default QueriesForDomain;
