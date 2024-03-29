import {
  BaseClient,
  type QueryError,
  type ClientOptions,
  type CredentialOptions,
  type ExecutionResultWithObjectShapedRows,
  type ExecutionResultWithArrayShapedRows,
  type UnknownArrayShape,
  type UnknownObjectShape,
  type CommonExecuteOptions,
  type ClientExecuteOptions,
} from "@madatdata/base-client";

import type {
  HTTPStrategies,
  BodyMode,
  WebBridgeResponse,
  MakeQueryURLStrategyArgs,
  MakeFetchOptionsStrategyArgs,
} from "./strategies/types";

export type HTTPClientOptions = {
  bodyMode?: BodyMode;
  strategies?: HTTPStrategies;
};

export interface HTTPClientBaseError extends QueryError {
  response?: Response;
}

export interface HTTPClientNetworkError extends HTTPClientBaseError {
  type: "network";
  name: DOMException["name"];
}

export interface HTTPClientResponseNotOkError extends HTTPClientBaseError {
  type: "response-not-ok";
}

export interface HTTPClientUnknownError extends HTTPClientBaseError {
  type: "unknown";
}

export type HTTPClientQueryError =
  | HTTPClientNetworkError
  | HTTPClientResponseNotOkError
  | HTTPClientUnknownError;

const TypeOfAny = (x: any) => typeof x;
type ValidType = Exclude<ReturnType<typeof TypeOfAny>, "function"> | "null";

type FieldTypesFromObjectRowShape<RowShape extends UnknownObjectShape> = {
  [k in keyof RowShape]: Set<ValidType>;
};

// RIDICULOUS HACK
const fieldsReducerForObjectRows = <RowShape extends UnknownObjectShape>(
  observedFields: FieldTypesFromObjectRowShape<RowShape>,
  row: RowShape
) => {
  const rowKeys = Object.keys(row) as (keyof RowShape)[];

  for (const rowKey of rowKeys) {
    if (!observedFields[rowKey]) {
      observedFields[rowKey] = new Set();
    }

    let fieldType = typeof row[rowKey];

    if (row[rowKey] === null) {
      observedFields[rowKey].add("null");
    } else if (fieldType === "function") {
      throw new Error("Got function type in value");
    } else {
      observedFields[rowKey].add(fieldType);
    }
  }

  if (rowKeys.length !== Object.keys(observedFields).length) {
    const missingFields = Object.keys(observedFields).filter(
      (seenField) => !rowKeys.includes(seenField)
    ) as (keyof RowShape)[];

    for (const missingField of missingFields) {
      observedFields[missingField].add("undefined");
    }
  }

  return observedFields;
};

// RIDICULOUS HACK
const fieldsFromObservedFields = <RowShape extends UnknownObjectShape>(
  observedFields: FieldTypesFromObjectRowShape<RowShape>
) => {
  const fields = Object.entries(observedFields).map(
    ([fieldKey, fieldTypes]) => {
      if (fieldTypes.size === 1) {
        return {
          name: fieldKey,
          columnID: fieldKey,
          format: Array.from(fieldTypes)[0],
          formattedType: `${Array.from(fieldTypes)[0]} (JSON)`,
        };
      }

      const fieldTypesArray = Array.from(fieldTypes);

      const nullishTypes = fieldTypesArray.filter(
        (fieldType) => fieldType === "null" || fieldType === "undefined"
      ) as ("null" | "undefined")[];

      if (nullishTypes.length === 0) {
        return {
          name: fieldKey,
          columnID: fieldKey,
          format: fieldTypesArray[0],
          formattedType: `${fieldTypesArray[0]} (JSON)`,
        };
      }

      return {
        name: fieldKey,
        columnID: fieldKey,
        format: fieldTypesArray.join(" | "),
        formattedType: fieldTypesArray.join(" | "),
      };
    }
  );

  return fields;
};

export class SqlHTTPClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions, HTTPStrategies> {
  private bodyMode: BodyMode;

  constructor(opts: ClientOptions<HTTPStrategies> & HTTPClientOptions) {
    super(opts);

    this.bodyMode = opts.bodyMode ?? "json";

    if (!opts.strategies) {
      throw "strategies parameter is required for SqlHTTPClient";
    }

    this.strategies = {
      makeFetchOptions: opts.strategies?.makeFetchOptions,
      makeQueryURL: opts.strategies?.makeQueryURL,
      parseFieldsFromResponse: opts.strategies?.parseFieldsFromResponse,
      parseFieldsFromResponseBodyJSON:
        opts.strategies?.parseFieldsFromResponseBodyJSON,
      transformFetchOptions: opts.strategies?.transformFetchOptions,
    };
  }

  private async makeQueryURL({ query }: Partial<MakeQueryURLStrategyArgs>) {
    return await this.strategies.makeQueryURL({
      query,
      host: this.host,
      database: this.database,
    });
  }

  private makeFetchOptions({
    query,
    execOptions,
  }: Pick<MakeFetchOptionsStrategyArgs, "query" | "execOptions">) {
    return this.strategies.makeFetchOptions({
      credential: this.credential,
      query,
      execOptions,
    });
  }

  static defaultExecOptions(
    inputExecOptions?: Partial<ClientExecuteOptions>
  ): ClientExecuteOptions {
    return {
      rowMode: "object",
      ...(inputExecOptions ?? {}),
    };
  }

  async execute<RowShape extends UnknownArrayShape>(
    query: string,
    executeOptions: { rowMode: "array" } & CommonExecuteOptions
  ): Promise<{
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: HTTPClientQueryError | null;
  }>;

  async execute<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions?: { rowMode: "object" } & CommonExecuteOptions
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: HTTPClientQueryError | null;
  }>;

  async execute(
    query: string,
    execOptions?: { rowMode?: "object" | "array" } & CommonExecuteOptions
  ) {
    const queryURL = await this.makeQueryURL({ query });
    const maybeFetchOptions = this.makeFetchOptions({
      query,
      execOptions: SqlHTTPClient.defaultExecOptions(execOptions),
    });

    // HACK: This comes down to not having a separate OptionalStrategies and RequiredStrategies,
    // and abusing the ReturnType of makeFetchOptions for null to indicate that it should
    // be handled by the default implementation (see db-seafowl::httpClientOptions)
    if (!maybeFetchOptions) {
      throw new Error(
        "maybeFetchOptions returned null, which is allowed by its type definition, " +
          "but there must be at least one maybeFetchOptions " +
          "passed by now that does not return null"
      );
    }

    if (execOptions?.abortSignal && !maybeFetchOptions.signal) {
      maybeFetchOptions.signal = execOptions.abortSignal;
    }

    // NOTE: Just renaming to drop the maybe. Same HACK as above applies.
    const fetchOptions = maybeFetchOptions;

    const accumulators: {
      observedFields: FieldTypesFromObjectRowShape<UnknownObjectShape>;
    } = {
      observedFields: {},
    };

    const { input: transformedQueryURL, init: transformedFetchOptions } =
      this.strategies.transformFetchOptions({
        input: queryURL,
        init: fetchOptions,
      });

    const { response, error } = await fetch(
      transformedQueryURL,
      transformedFetchOptions
    )
      .catch((err) =>
        Promise.reject({
          type: "network",
          // NOTE: Usually a DOMException, and thus has .name, but who knows?
          name: err.name ?? "unknown",
          // NOTE: Cannot spread DOMException properties (hence the explicit assignment of .name)
          ...err,
        })
      )
      .then(async (r) => {
        if (r.type === "error") {
          // note: very rare (usually fetch itself rejects promise)
          // see: https://developer.mozilla.org/en-US/docs/Web/API/Response/type
          return Promise.reject({ type: "unknown", response: r });
        }

        if (!r.ok) {
          return Promise.reject({ type: "response-not-ok", response: r });
        }

        const maybeFieldsFromResponse = await this.strategies
          .parseFieldsFromResponse({ response: r })
          .catch(() => null);

        // TODO: streaming jus there for debug, should be deleted
        // if (this.bodyMode === "streaming") {
        //   console.log("streaming body");
        //   this.bodyMode = "jsonl";

        //   // const responseReadableStream = r.body?.getReader();
        // }

        // FIXME: it would be nice to support streaming responses piped into a readable stream
        if (this.bodyMode === "jsonl") {
          const bigInMemoryJsonLinesResponseBody = (await r.text()).split("\n");
          const parsedLines = [];
          while (bigInMemoryJsonLinesResponseBody.length > 0) {
            const line = bigInMemoryJsonLinesResponseBody.shift();
            if (!line) {
              continue;
            }

            try {
              const parsedLine = JSON.parse(line);
              // RIDICULOUS HACK
              accumulators.observedFields = fieldsReducerForObjectRows(
                accumulators.observedFields,
                parsedLine
              );
              parsedLines.push(parsedLine);
            } catch (err) {
              console.warn(
                `Failed to parse row. Row:\n${line}Error:\n${err}\n`
              );
              return null;
            }
          }
          return {
            rows: parsedLines,
            fields: maybeFieldsFromResponse ?? undefined,
            success: true,
          };
        } else if (this.bodyMode === "json") {
          const responseJson = await r.json();

          const maybeFieldsFromResponseBody =
            await this.strategies.parseFieldsFromResponseBodyJSON({
              parsedJSONBody: responseJson,
            });

          return {
            ...responseJson,
            fields:
              maybeFieldsFromResponseBody ??
              maybeFieldsFromResponse ??
              undefined,
          };
        } else {
          throw "Unexpected bodyMode (should never happen, default is json)";
        }
      })
      .then((rJson) => {
        return execOptions?.rowMode === "array"
          ? {
              response: {
                readable: () => new ReadableStream<UnknownArrayShape>(),
                ...rJson,
              } as WebBridgeResponse<UnknownArrayShape>,
              error: null,
            }
          : {
              response: {
                readable: () => new ReadableStream<UnknownObjectShape>(),
                ...("fields" in rJson
                  ? {}
                  : {
                      // RIDICULOUS HACK
                      fields: fieldsFromObservedFields(
                        accumulators.observedFields
                      ),
                    }),
                ...rJson,
              } as WebBridgeResponse<UnknownObjectShape>,
              error: null,
            };
      })
      .catch((err) => ({
        response: null,
        error: {
          success: false,
          type: err.type || "unknown",
          ...err,
        } as HTTPClientQueryError,
      }));

    return {
      response,
      error,
    };
  }
}

// TODO: maybe move/copy to db-{splitgraph,seafowl,etc} - expect them to have it?
// pass in their own factory function here?
export const makeClient = (args: ClientOptions<HTTPStrategies>) => {
  const client = new SqlHTTPClient(args);
  return client;
};
