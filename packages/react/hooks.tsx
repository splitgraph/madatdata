import {
  // useSyncExternalStore,
  createContext,
  type PropsWithChildren,
  useMemo,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import type {
  // Client,
  // DataContext,
  ExecutionResultFromRowShape,
  ExecutionResultWithArrayShapedRows,
  ExecutionResultWithObjectShapedRows,
  QueryError,
  UnknownArrayShape,
  UnknownObjectShape,
  UnknownRowShape,
} from "@madatdata/core";

import {
  makeSplitgraphHTTPContext,
  SplitgraphDataContext,
  makeAuthHeaders,
} from "@madatdata/core";

export { makeAuthHeaders };

// export const useSqlStore = () => {
//   const sqlStore = useSyncExternalStore(
//     () => () => {},
//     () => undefined
//   );
//   return sqlStore;
// };

export const makeDefaultAnonymousContext = () => {
  const defaultAnonymousContext = makeSplitgraphHTTPContext({
    credential: null,
  });

  return defaultAnonymousContext;
};

export const DSXContext = createContext<SplitgraphDataContext>(
  makeSplitgraphHTTPContext()
);

export const SqlProvider = ({
  children,
  options,
}: PropsWithChildren<{
  options: Parameters<typeof makeSplitgraphHTTPContext>[0];
}>) => {
  const stableContext = useMemo(() => makeSplitgraphHTTPContext(options), []);

  return (
    <DSXContext.Provider value={stableContext}>{children}</DSXContext.Provider>
  );
};

export const useDSXContext = () => useContext(DSXContext);

export const makeDataContext = () => {};

// export const DSXQuery = ({
//   children,
// }: {
//   children: ReturnType<typeof sql>;
// }) => {
//   return <>{children}</>;
// };

// export const sql = (
//   chunks: TemplateStringsArray,
//   ...variables: any[]
// ): string => {
//   return chunks.join("\n");
// };

export function useSql<RowShape extends UnknownArrayShape>(
  query: string,
  executeOptions: { rowMode: "array" }
): {
  loading: boolean;
  response: ExecutionResultWithArrayShapedRows<RowShape> | null;
  error: QueryError | null;
};

export function useSql<RowShape extends UnknownObjectShape>(
  query: string,
  executeOptions?: { rowMode: "object" }
): {
  loading: boolean;
  response: ExecutionResultWithObjectShapedRows<RowShape> | null;
  error: QueryError | null;
};

export function useSql<RowShape extends UnknownRowShape>(
  query: string,
  execOptions?: { rowMode?: "object" | "array" }
) {
  const [state, setState] = useState<{
    loading: boolean;
    response: ExecutionResultFromRowShape<RowShape> | null;
    error: QueryError | null;
  }>({
    loading: true,
    response: null,
    error: null,
  });

  const { client } = useDSXContext();

  useEffect(() => {
    if (!client) {
      return;
    }

    client
      .execute<RowShape>(query, {
        rowMode: execOptions?.rowMode ?? "object",
        ...execOptions,
      })
      .then((result) =>
        setState({
          loading: false,
          response: result.response,
          error: result.error,
        })
      );
  }, [query, execOptions?.rowMode]);

  return state;
}

export const HelloButton = () => {
  const [state, setState] = useState<"hello" | "goodbye">("hello");
  const toggle = useCallback(
    () => setState(state === "hello" ? "goodbye" : "hello"),
    [setState, state]
  );

  return <button onClick={toggle}>{state}</button>;
};
