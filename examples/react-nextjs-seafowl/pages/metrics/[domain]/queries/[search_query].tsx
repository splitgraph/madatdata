import { useRouter } from "next/router";
import type { SearchDomain, SearchQuery } from "../../../../types";
import Link from "next/link";
import { Breadcrumbs } from "../../../../components/Breadcrumbs";

const MetricsForQueryIndex = () => {
  const { domain, search_query: query } = useRouter().query as {
    domain: SearchDomain;
    search_query: SearchQuery;
  };

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
          {
            href: `/metrics/${encodeURIComponent(
              domain
            )}/pages/${encodeURIComponent(query)}`,
            anchor: query,
          },
        ]}
      />
      <h2>
        Traffic to <code>{domain}</code> from query: <code>{query}</code>
      </h2>
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
    </div>
  );
};

export default MetricsForQueryIndex;
