import Link from "next/link";
import { Breadcrumbs } from "../../components/Breadcrumbs";

const MetricsIndexPage = () => {
  const domains = ["seafowl.io", "splitgraph.com"] as const;

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
        ]}
      />
      <h2>Domains:</h2>
      <ul>
        {domains.map((domain) => (
          <li key={domain}>
            <Link href={`/metrics/${encodeURIComponent(domain)}`}>
              {domain}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetricsIndexPage;
