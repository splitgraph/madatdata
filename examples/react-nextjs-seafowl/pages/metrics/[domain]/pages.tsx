import { useRouter } from "next/router";
import { useHighestClicksByPage } from "../../../sql-queries";
import type { SearchDomain } from "../../../types";
import {
  EmptyResult,
  LoadingSkeleton,
  SqlQueryError,
} from "../../../components/common";
import Link from "next/link";
import { BaseLayout } from "../../../components/BaseLayout";

const PagesForDomain = () => {
  const domain = useRouter().query.domain as SearchDomain;

  const { loading, error, response } = useHighestClicksByPage({
    domain,
  });

  return (
    <BaseLayout
      heading={
        <>
          Indexed pages on <code>{domain}</code>
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
            ({ page, average_ctr, total_clicks, total_impressions }) => (
              <li key={page}>
                <Link
                  href={`/metrics/${encodeURIComponent(
                    domain
                  )}/pages/${encodeURIComponent(page)}`}
                >
                  {page}
                </Link>{" "}
                ({total_clicks} clicks, {total_impressions} impressions,{" "}
                {(average_ctr * 100).toFixed(2)}% average CTR)
              </li>
            )
          )}
        </ul>
      )}
    </BaseLayout>
  );
};

export default PagesForDomain;
