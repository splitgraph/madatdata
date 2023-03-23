import Link from "next/link";
import { BaseLayout } from "../../components/BaseLayout";

const MetricsIndexPage = () => {
  const domains = ["seafowl.io"] as const;

  return (
    <BaseLayout
      heading="Metrics By Domain"
      breadcrumbs={{
        crumbs: [
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
        ],
      }}
    >
      <ul>
        {domains.map((domain) => (
          <li key={domain}>
            <Link href={`/metrics/${encodeURIComponent(domain)}`}>
              {domain}
            </Link>
          </li>
        ))}
      </ul>
    </BaseLayout>
  );
};

export default MetricsIndexPage;
