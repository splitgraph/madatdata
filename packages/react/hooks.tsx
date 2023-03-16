import {
  // useSyncExternalStore,
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import type {
  BaseDb,
  DataContext,
  ExecutionResultFromRowShape,
  ExecutionResultWithArrayShapedRows,
  ExecutionResultWithObjectShapedRows,
  QueryError,
  UnknownArrayShape,
  UnknownObjectShape,
  UnknownRowShape,
  makeSeafowlHTTPContext,
  makeSplitgraphHTTPContext,
  BasePlugin,
  PluginList,
} from "@madatdata/core";

import { makeAuthHeaders } from "@madatdata/core";

export { makeAuthHeaders };

type RealDataContext =
  | ReturnType<typeof makeSplitgraphHTTPContext | typeof makeSeafowlHTTPContext>
  | DataContext<BaseDb<PluginList<BasePlugin>, {}>, PluginList<BasePlugin>>;

const SqlContext = createContext<RealDataContext | null>(null);

export const SqlProvider = ({
  children,
  dataContext,
}: PropsWithChildren<{ dataContext: RealDataContext }>) => {
  return (
    <SqlContext.Provider value={dataContext}>{children}</SqlContext.Provider>
  );
};

const useSqlContext = () => useContext(SqlContext);

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

  const ctx = useSqlContext();

  if (!ctx) {
    return {
      loading: true,
      response: null,
      error: null,
    };
  }

  const client = ctx.client;

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
