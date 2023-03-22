import { useRouter } from "next/router";
import type { SearchDomain, SitePage } from "../../../../types";
import Link from "next/link";

const MetricsForPageIndex = () => {
  const { domain, page } = useRouter().query as {
    domain: SearchDomain;
    page: SitePage;
  };

  return (
    <div>
      <h2>
        Traffic for <code>{domain}</code> to page: <code>{page}</code>
      </h2>
      <ul>
        <li>
          <Link
            href={`/metrics/${encodeURIComponent(
              domain
            )}/pages/${encodeURIComponent(page)}/weekly`}
          >
            Metrics By Week for Page <code>{page}</code>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default MetricsForPageIndex;
