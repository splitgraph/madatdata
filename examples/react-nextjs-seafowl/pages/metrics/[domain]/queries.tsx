import { useRouter } from "next/router";
import { useMetricsByQuery } from "../../../sql-queries";
import type { SearchDomain } from "../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../components/common";
import Link from "next/link";

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
      <h2>
        Queries for <code>{domain}</code>
      </h2>
      <ul>
        {rows.map(({ query, average_ctr, total_clicks, total_impressions }) => (
          <li key={query}>
            <Link
              href={`/metrics/${domain}/queries/${encodeURIComponent(query)}`}
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
