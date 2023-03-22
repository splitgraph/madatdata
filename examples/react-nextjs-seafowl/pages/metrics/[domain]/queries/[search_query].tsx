import { useRouter } from "next/router";
import type { SearchDomain, SearchQuery } from "../../../../types";
import Link from "next/link";

const MetricsForQueryIndex = () => {
  const { domain, search_query: query } = useRouter().query as {
    domain: SearchDomain;
    search_query: SearchQuery;
  };

  return (
    <div>
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
