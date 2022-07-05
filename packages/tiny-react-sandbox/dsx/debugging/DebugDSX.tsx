import { SqlProvider, useSql } from "@madatdata/react";

const DSXQuery = () => {
  const { loading, error, response } = useSql<{ origin_airport: string }>(
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
        LIMIT ${"100"};`
  );

  return (
    <pre style={{ minWidth: "100%", minHeight: 500 }}>
      {JSON.stringify({ loading, error, response }, null, 2)}
    </pre>
  );
};

export const DebugDSX = () => {
  return (
    <SqlProvider options={{ credential: null }}>
      <DSXQuery />
    </SqlProvider>
  );
};
