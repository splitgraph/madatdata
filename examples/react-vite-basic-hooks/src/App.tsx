import {
  SqlProvider,
  useSql,
  makeSplitgraphHTTPContext,
} from "@madatdata/react";
import { useMemo } from "react";

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

const App = () => {
  const splitgraphDataContext = useMemo(
    () => makeSplitgraphHTTPContext({ credential: null }),
    []
  );

  return (
    <div className="App">
      <h1>Vite + React + Madatdata</h1>
      <SqlProvider dataContext={splitgraphDataContext}>
        <ExampleComponentUsingSQL />
      </SqlProvider>
    </div>
  );
};

export default App;
