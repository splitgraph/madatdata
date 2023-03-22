import type { SearchDomain, SearchQuery } from "../types";
import { useMonthlyReportForQuery } from "../sql-queries";

const ExampleComponentUsingSQL = () => {
  const { loading, error, response } = useMonthlyReportForQuery({
    domain: "seafowl.io" as SearchDomain,
    query: "seafowl" as SearchQuery,
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
