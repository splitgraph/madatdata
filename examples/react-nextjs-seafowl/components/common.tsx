export const DebugBlock = ({ children }: PropsWithChildren<{}>) => {
  return <pre style={{ minWidth: "100%", minHeight: 500 }}>{children}</pre>;
};

export const LoadingSkeleton = () => {
  return <div>Loading...</div>;
};

export const QueryErrorPage = ({ error }: { error: QueryError }) => {
  return (
    <div>
      Error: <DebugBlock>{JSON.stringify({ error })}</DebugBlock>
    </div>
  );
};

export const EmptyResult = () => {
  return <div>No queries found for domain</div>;
};
