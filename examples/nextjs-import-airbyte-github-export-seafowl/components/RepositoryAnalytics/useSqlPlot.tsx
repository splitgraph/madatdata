import { useCallback, useEffect, useRef } from "react";

import { UnknownObjectShape, useSql } from "@madatdata/react";

import * as Plot from "@observablehq/plot";
import { useMemo } from "react";

/**
 * A hook that returns a render function for a Plot chart built from the
 * results of a SQL query. All of the generic parameters should be inferrable
 * based on the parameters passed to the `sqlParams` parameter.
 *
 * @returns A render function which returns a value that can be returned from a Component
 */
export const useSqlPlot = <
  RowShape extends UnknownObjectShape,
  SqlParams extends object,
  MappedRow extends UnknownObjectShape
>({
  sqlParams,
  mapRows,
  buildQuery,
  makePlotOptions,
  isRenderable,
}: {
  /**
   * The input parameters, an object that should match the first and only parameter
   * of the `buildQuery` callback
   * */
  sqlParams: SqlParams;
  /**
   * An optional function to map the rows returned by the SQL query to a different
   * row shape, which is most often useful for things like converting a string column
   * to a `Date` object.
   */
  mapRows?: (row: RowShape) => MappedRow;
  /**
   * A builder function that returns a SQL query given a set of parameters, which
   * will be the parameters passed as the `sqlParams` parameter.
   */
  buildQuery: (sqlParams: SqlParams) => string;
  /**
   * A function to call after receiving the result of the SQL query (and mapping
   * its rows if applicable), to create the options given to Observable {@link Plot.plot}
   */
  makePlotOptions: (rows: MappedRow[]) => Plot.PlotOptions;
  /**
   * A function to call to determine if the chart is renderable. This is helpful
   * during server side rendering, when Observable Plot doesn't typically work well,
   * and also when the response from the query is empty, for example because the `useSql`
   * hook executed before its parameters were set (this works around an inconvenience in
   * `useSql` where it does not take any parameters and so always executes on first render)
   */
  isRenderable?: (sqlParams: SqlParams) => boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>();

  const { response, error } = useSql<RowShape>(buildQuery(sqlParams));

  const mappedRows = useMemo(() => {
    return !response || error
      ? []
      : (response.rows ?? []).map(
          mapRows ?? ((r) => r as unknown as MappedRow)
        );
  }, [response, error]);

  const plotOptions = useMemo(() => makePlotOptions(mappedRows), [mappedRows]);

  useEffect(() => {
    if (mappedRows === undefined) {
      return;
    }

    const plot = Plot.plot(plotOptions);

    // There is a bug(?) in useSql where, since we can't give it dependencies, it
    // will re-run even with splitgraphNamespace and splitgraphRepository are undefined,
    // which results in an error querying Seafowl. So just don't render the chart in that case.
    if (!isRenderable || isRenderable(sqlParams)) {
      containerRef.current.append(plot);
    }

    return () => plot.remove();
  }, [mappedRows]);

  const renderPlot = useCallback(
    () => <div ref={containerRef} />,
    [containerRef]
  );

  return renderPlot;
};
