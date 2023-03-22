import { useRouter } from "next/router";
import type { SearchDomain, SearchQuery } from "../../../../types";
import Link from "next/link";
import { BaseLayout } from "../../../../components/BaseLayout";

const MetricsForQueryIndex = () => {
  const { domain, search_query: query } = useRouter().query as {
    domain: SearchDomain;
    search_query: SearchQuery;
  };

  return (
    <BaseLayout
      heading={
        <>
          Traffic to <code>{domain}</code> from query: <code>{query}</code>
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
          {
            href: `/metrics/${encodeURIComponent(
              domain
            )}/pages/${encodeURIComponent(query)}`,
            anchor: query,
          },
        ],
      }}
    >
      <ul>
        <li>
          <Link
            href={`/metrics/${encodeURIComponent(
              domain
            )}/queries/${encodeURIComponent(query)}/monthly`}
          >
            Metrics By Month for Query <code>{query}</code>
          </Link>
        </li>
      </ul>
    </BaseLayout>
  );
};

export default MetricsForQueryIndex;
