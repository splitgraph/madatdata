import { useRouter } from "next/router";
import type { SearchDomain, SitePage } from "../../../../types";
import Link from "next/link";
import { BaseLayout } from "../../../../components/BaseLayout";

const MetricsForPageIndex = () => {
  const { domain, page } = useRouter().query as {
    domain: SearchDomain;
    page: SitePage;
  };

  return (
    <BaseLayout
      heading={
        <>
          Traffic for <code>{domain}</code> to page: <code>{page}</code>
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
          {
            href: `/metrics/${encodeURIComponent(
              domain
            )}/pages/${encodeURIComponent(page)}`,
            anchor: page,
          },
        ],
      }}
    >
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
    </BaseLayout>
  );
};

export default MetricsForPageIndex;
