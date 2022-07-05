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
  Client,
  ExecutionResultFromRowShape,
  ExecutionResultWithArrayShapedRows,
  ExecutionResultWithObjectShapedRows,
  QueryError,
  UnknownArrayShape,
  UnknownObjectShape,
  UnknownRowShape,
} from "@madatdata/base-client";

import { makeClient } from "@madatdata/client-http/client-http";

// export const useSqlStore = () => {
//   const sqlStore = useSyncExternalStore(
//     () => () => {},
//     () => undefined
//   );
//   return sqlStore;
// };

const DSXContext = createContext<{ client: Client | null }>({ client: null });

export const SqlProvider = ({
  children,
  clientOptions,
}: PropsWithChildren<{ clientOptions: Parameters<typeof makeClient>[0] }>) => {
  const stableClient = useMemo(() => makeClient(clientOptions), []);

  return (
    <DSXContext.Provider
      value={{
        client: stableClient,
      }}
    >
      {children}
    </DSXContext.Provider>
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
