import { useRouter } from "next/router";
import { useHighestClicksByPage } from "../../../sql-queries";
import type { SearchDomain } from "../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../components/common";
import Link from "next/link";

const PagesForDomain = () => {
  const domain = useRouter().query.domain as SearchDomain;

  const { loading, error, response } = useHighestClicksByPage({
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
        Indexed pages on <code>{domain}</code>
      </h2>
      <ul>
        {rows.map(({ page, average_ctr, total_clicks, total_impressions }) => (
          <li key={page}>
            <Link href={`/metrics/${domain}/pages/${encodeURIComponent(page)}`}>
              {page}
            </Link>{" "}
            ({total_clicks} clicks, {total_impressions} impressions,{" "}
            {(average_ctr * 100).toFixed(2)}% average CTR)
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PagesForDomain;
