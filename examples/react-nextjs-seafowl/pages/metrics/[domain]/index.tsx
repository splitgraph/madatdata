import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import type { ParsedUrlQuery } from "querystring";
import { Breadcrumbs } from "../../../components/Breadcrumbs";

const supportedDomains = ["seafowl.io"] as const;

const supportedMetrics = [
  { metric: "pages", makeAnchor: (domain: string) => `Pages on ${domain}` },
  {
    metric: "queries",
    makeAnchor: (domain: string) => `Queries for ${domain}`,
  },
] as const;

type MetricsDomainIndexPageProps = {
  domain: string;
  metrics: Readonly<
    {
      metric: typeof supportedMetrics[number]["metric"];
      anchor: string;
    }[]
  >;
};

interface MetricsDomainIndexParams extends ParsedUrlQuery {
  domain: typeof supportedDomains[number];
}

const MetricsForDomainIndexPage = ({
  domain,
  metrics,
}: MetricsDomainIndexPageProps) => {
  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { href: "/", anchor: "Home" },
          { href: "/metrics", anchor: "Metrics" },
          { href: `/metrics/${encodeURIComponent(domain)}`, anchor: domain },
        ]}
      />
      <h2>
        Metrics for <code>{domain}</code>
      </h2>

      <h3>Overall:</h3>
      <ul>
        <li key="weekly">
          <Link href={`/metrics/${encodeURIComponent(domain)}/weekly`}>
            Weekly
          </Link>
        </li>
      </ul>

      <h3>By Dimension:</h3>
      <ul>
        {metrics.map(({ metric, anchor }) => (
          <li key={domain}>
            <Link
              href={`/metrics/${encodeURIComponent(
                domain
              )}/${encodeURIComponent(metric)}`}
            >
              {anchor}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const getStaticProps: GetStaticProps<
  MetricsDomainIndexPageProps,
  MetricsDomainIndexParams
> = async ({ params }) => {
  return {
    props: {
      domain: params.domain,
      metrics: supportedMetrics.map(({ metric, makeAnchor }) => ({
        metric,
        anchor: makeAnchor(params.domain),
      })),
    },
  };
};

export const getStaticPaths: GetStaticPaths<{ domain: string }> = async () => {
  return {
    paths: supportedDomains.map((domain) => ({
      params: {
        domain: domain,
      },
    })),
    fallback: "blocking",
  };
};

export default MetricsForDomainIndexPage;
