import Link from "next/link";

const MetricsIndexPage = () => {
  const domains = ["seafowl.io"] as const;

  return (
    <div>
      <h2>Domains:</h2>
      <ul>
        {domains.map((domain) => (
          <li key={domain}>
            <Link href={`/metrics/${domain}`}>{domain}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetricsIndexPage;
