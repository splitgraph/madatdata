import { useRouter } from "next/router";
import { useMetricsByQuery } from "../../../sql-queries";
import type { SearchDomain } from "../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../components/common";
import Link from "next/link";
import { Breadcrumbs } from "../../../components/Breadcrumbs";

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
    <div>
      <Breadcrumbs
        crumbs={[
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
          { href: `/metrics/${encodeURIComponent(domain)}`, anchor: domain },
          {
            href: `/metrics/${encodeURIComponent(domain)}/queries`,
            anchor: "Queries",
          },
        ]}
      />
      <h2>
        Queries for <code>{domain}</code>
      </h2>
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
    </div>
  );
};

export default QueriesForDomain;
