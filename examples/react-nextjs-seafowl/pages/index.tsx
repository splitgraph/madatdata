import type { SearchDomain } from "../types";
import { useMetricsByQuery } from "../sql-queries";

const ExampleComponentUsingSQL = () => {
  const { loading, error, response } = useMetricsByQuery({
    domain: "seafowl.io" as SearchDomain,
  });
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

const SeafowlSampleQuery = () => {
  return <ExampleComponentUsingSQL />;
};

export default SeafowlSampleQuery;
