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
  PluginList,
  BaseDb,
  DbOptions,
  Db,
  DataContext,
  DataContextOptions,
  ExecutionResultFromRowShape,
  ExecutionResultWithArrayShapedRows,
  ExecutionResultWithObjectShapedRows,
  QueryError,
  UnknownArrayShape,
  UnknownObjectShape,
  UnknownRowShape,
  ClientOptions,
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

// export const DSXContext = createContext<DataContext>(
//   makeSplitgraphHTTPContext()
// );

export const useSqlProvider = <
  ConcretePluginList extends PluginList,
  ConcretePluginHostContext extends object,
  ConcreteDb extends BaseDb<ConcretePluginList, ConcretePluginHostContext>,
  ConcreteDataContext extends DataContext<ConcreteDb>,
  MakeDataContextOptions extends DataContextOptions<
    ConcreteDb,
    ConcretePluginList
  >,
  MakeDataContext extends (opts?: MakeDataContextOptions) => ConcreteDataContext
>({
  makeDataContext,
  options,
}: {
  makeDataContext: MakeDataContext;
  options: MakeDataContextOptions;
}) => {
  const SqlContext = useMemo(
    () => createContext<ConcreteDataContext>(makeDataContext(options)),
    [makeDataContext, options]
  );

  const SqlProvider = useMemo(
    () =>
      ({
        children,
        makeDataContext,
      }: PropsWithChildren<{
        makeDataContext: MakeDataContext;
        options: Parameters<MakeDataContext>[0];
      }>) => {
        const stableContext = useMemo(() => makeDataContext(options), []);

        return (
          <SqlContext.Provider value={stableContext}>
            {children}
          </SqlContext.Provider>
        );
      },
    [SqlContext]
  );

  const useSqlContext = useMemo(() => () => useContext(SqlContext), []);

  function useSql<RowShape extends UnknownArrayShape>(
    query: string,
    executeOptions: { rowMode: "array" }
  ): {
    loading: boolean;
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: QueryError | null;
  };

  function useSql<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions?: { rowMode: "object" }
  ): {
    loading: boolean;
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: QueryError | null;
  };

  function useSql<RowShape extends UnknownRowShape>(
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

    const { client } = useSqlContext();

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

  return {
    SqlContext,
    SqlProvider,
    useSqlContext,
    useSql,
  };
};

export const HelloButton = () => {
  const [state, setState] = useState<"hello" | "goodbye">("hello");
  const toggle = useCallback(
    () => setState(state === "hello" ? "goodbye" : "hello"),
    [setState, state]
  );

  return <button onClick={toggle}>{state}</button>;
};
