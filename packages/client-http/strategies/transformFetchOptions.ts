import type { HTTPStrategies } from "./types";

export const skipTransformFetchOptions: HTTPStrategies["transformFetchOptions"] =
  (opts) => opts;
