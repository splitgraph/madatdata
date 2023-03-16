import { SqlProvider, useSql } from "@madatdata/react";

const ExampleComponentUsingSQL = () => {
  const { loading, error, response } = useSql<{
    origin_airport: string;
    destination_airport: string;
    origin_city: string;
    destination_city: string;
    passengers: number;
    seats: number;
    flights: number;
    distance: number;
    fly_month: string;
    origin_pop: number;
    destination_pop: number;
    id: number;
  }>(
    `SELECT
    "origin_airport",
    "destination_airport",
    "origin_city",
    "destination_city",
    "passengers",
    "seats",
    "flights",
    "distance",
    "fly_month",
    "origin_pop",
    "destination_pop",
    "id"
FROM
    "splitgraph/domestic_us_flights:latest"."flights"
LIMIT 100;`
  );

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
    <SqlProvider options={{ credential: null }}>
      <ExampleComponentUsingSQL />
    </SqlProvider>
  );
};
