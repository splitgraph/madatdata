import { SqlProvider, useSql } from "@madatdata/react/hooks-seafowl";

const ExampleComponentUsingSQL = () => {
  const { loading, error, response } = useSql<{
    total_impressions: number;
    total_clicks: number;
    page: string;
    average_ctr: number;
  }>(`SELECT page,
    SUM(impressions::double) AS total_impressions,
    SUM(clicks::double) AS total_clicks,
    SUM(clicks::double) / SUM(impressions::double) AS average_ctr
    FROM "miles/splitgraph-seafowl-search-console.performance_report_page"
    WHERE site_url = 'sc-domain:splitgraph.com'
    GROUP BY 1 ORDER BY 3 DESC
    LIMIT 100;`);

  return (
    <pre
      style={{ minWidth: "100%", minHeight: 500 }}
      data-testid={`result-pre-${
        loading ? "loading" : response ? "pass" : error ? "fail" : "unknown"
      }`}
    >
      {JSON.stringify({ loading, error, response }, null, 2)}
    </pre>
  );
};

export const SeafowlSampleQuery = () => {
  // Uses splitgraph.com by default (anon access supported for public data)
  return (
    <SqlProvider
      options={{
        database: {
          dbname: "seafowl", // arbitrary
        },
        authenticatedCredential: undefined,
        host: {
          // temporary hacky mess
          dataHost: "dimmadome-data-developers.fly.dev",
          apexDomain: "bogus",
          apiHost: "bogus",
          baseUrls: {
            gql: "bogus",
            sql: "https://dimmadome-data-developers.fly.dev/q",
            auth: "bogus",
          },
          postgres: {
            host: "dimmadome-data-developers.fly.dev",
            port: 6432,
            ssl: false,
          },
        },
      }}
    >
      <ExampleComponentUsingSQL />
    </SqlProvider>
  );
};
