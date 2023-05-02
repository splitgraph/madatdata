import type {
  Database,
  Host,
  UnknownCredential,
  UnknownRowShape,
} from "@madatdata/base-client";

// todo: "streaming" just here for debug, should be deleted
export type BodyMode = "json" | "jsonl" | "streaming";

export interface WebBridgeResponse<RowShape extends UnknownRowShape> {
  command: string;
  fields: {
    columnID: number;
    dataTypeID: number;
    dataTypeModifier: number;
    dataTypeSize: number;
    format: string;
    formattedType: string;
    name: string;
    tableID: number;
  }[];
  rowCount: 1;
  rows: RowShape[];
  readable: () => ReadableStream<RowShape>;
  success: true;
  /** FIXME: optional to allow deleting it for inline snapshots */
  executionTime?: string;
  /** FIXME: optional to allow deleting it for inline snapshots */
  executionTimeHighRes?: string;
}

type BaseExecOptions = {
  bodyMode?: BodyMode;
};

type ExecOptions = BaseExecOptions & {
  rowMode?: "object" | "array" | undefined;
};

export type MakeFetchOptionsStrategyArgs = {
  credential: UnknownCredential;
  query: string;
  execOptions: ExecOptions;
};

// Return null to indicate that DB should construct fetch options itself
// Otherwise, return RequestInit to override that completely
// TODO: This is a hack.
type MakeFetchOptionsStrategy = ({
  credential,
  query,
  execOptions,
}: MakeFetchOptionsStrategyArgs) => RequestInit | null;

type TransformFetchOptionsStrategy = ({
  input,
  init,
}: {
  input: Parameters<typeof fetch>[0];
  init: Parameters<typeof fetch>[1];
}) => {
  input: Parameters<typeof fetch>[0];
  init: Parameters<typeof fetch>[1];
};

export type MakeQueryURLStrategyArgs = {
  database: Database;
  host: Host;
  query?: string;
};

type MakeQueryURLStrategy = ({
  database,
  host,
}: MakeQueryURLStrategyArgs) => Promise<string>;

type ParseFieldsFromResponseStrategy = <RowShape extends UnknownRowShape>({
  response,
}: {
  response: Response;
}) => Promise<WebBridgeResponse<RowShape>["fields"] | null>;

type ParseFieldsFromResponseBodyJSONStrategy = <
  RowShape extends UnknownRowShape
>({
  parsedJSONBody,
}: {
  parsedJSONBody: WebBridgeResponse<RowShape> | null;
}) => Promise<WebBridgeResponse<RowShape>["fields"] | null>;

export type HTTPStrategies = {
  makeFetchOptions: MakeFetchOptionsStrategy;
  makeQueryURL: MakeQueryURLStrategy;
  parseFieldsFromResponse: ParseFieldsFromResponseStrategy;
  parseFieldsFromResponseBodyJSON: ParseFieldsFromResponseBodyJSONStrategy;
  transformFetchOptions: TransformFetchOptionsStrategy;
};
