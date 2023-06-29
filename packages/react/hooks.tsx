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

export interface UseSqlBaseOptions {
  /**
   * Either a boolean, or a function that returns a boolean given a query,
   * which indicates whether or not the query should be executed. This can
   * be helpful for dynamically built queries that may not be ready to execute
   * immediately when the hook is rendered.
   *
   * For more precise control, you can also pass a function to the `query` parameter,
   * and return `null` from it to indicate that it's not ready to execute yet.
   */
  isReady?: boolean | ((query: string) => boolean);

  /**
   * An optional AbortSignal to use to abort the query. If not provided, the
   * hook will create its own AbortSignal to call on unmount, which is probably
   * desirable to avoid sending a query multiple times during development. To opt
   * out of this behavior, set it to `null`.
   */
  abortSignal?: AbortSignal | null;
}

export type UseSqlOptions<Overloads> = UseSqlBaseOptions & Overloads;

export function useSql<RowShape extends UnknownArrayShape>(
  query: string | null | (() => string | null),
  executeOptions: UseSqlOptions<{ rowMode: "array" }>
): {
  loading: boolean;
  response: ExecutionResultWithArrayShapedRows<RowShape> | null;
  error: QueryError | null;
};

export function useSql<RowShape extends UnknownObjectShape>(
  query: string | null | (() => string | null),
  executeOptions?: UseSqlOptions<{ rowMode: "object" }>
): {
  loading: boolean;
  response: ExecutionResultWithObjectShapedRows<RowShape> | null;
  error: QueryError | null;
};

export function useSql<RowShape extends UnknownRowShape>(
  /**
   * The query to execute, or a function that returns the query to execute. The
   * query should be of type `string`, or `null` to indicate that the query is
   * not ready to execute yet. This can be helpful for dynamically built queries,
   * and for avoiding the need to use the `isReady` parameter.
   */
  query: string | null | (() => string | null),
  execOptions?: UseSqlOptions<{ rowMode?: "object" | "array" }>
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

    const queryString = typeof query === "function" ? query() : query;

    if (!queryString) {
      return;
    }

    if (typeof execOptions?.isReady === "boolean" && !execOptions?.isReady) {
      return;
    }

    if (
      execOptions?.isReady &&
      typeof execOptions?.isReady === "function" &&
      !execOptions?.isReady(queryString)
    ) {
      return;
    }

    const defaultAbortController =
      execOptions?.abortSignal === null ? null : new AbortController();

    client
      .execute<RowShape>(queryString, {
        rowMode: execOptions?.rowMode ?? "object",
        abortSignal: execOptions?.abortSignal ?? defaultAbortController?.signal,
      })
      .then((result) =>
        setState({
          loading: false,
          response: result.response,
          error: result.error,
        })
      );

    return () => {
      if (execOptions?.abortSignal === null) {
        // User opted out of sending an abort signal
        return;
      } else if (execOptions?.abortSignal) {
        // User provided an abort signal, so don't abort it here
        return;
      } else if (defaultAbortController) {
        return defaultAbortController.abort();
      } else {
        console.log("Unexpected state: no abort controller available to abort");
      }
    };
  }, [
    query,
    execOptions?.rowMode,
    execOptions?.abortSignal,
    execOptions?.isReady,
  ]);

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
