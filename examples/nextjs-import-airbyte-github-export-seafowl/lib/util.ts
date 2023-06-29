import { useRouter } from "next/router";
import type { ParsedUrlQuery } from "querystring";

export const useDebug = () => {
  const { query } = useRouter();

  return query.debug;
};

export const getQueryParamAsString = <T extends string = string>(
  query: ParsedUrlQuery,
  key: string
): T | null => {
  if (Array.isArray(query[key]) && query[key].length > 0) {
    throw new Error(`expected only one query param but got multiple: ${key}`);
  }

  if (!(key in query)) {
    return null;
  }

  return query[key] as T;
};

export const requireKeys = <T extends Record<string, unknown>>(
  obj: T,
  requiredKeys: (keyof T)[]
) => {
  const missingKeys = requiredKeys.filter(
    (requiredKey) => !(requiredKey in obj)
  );

  if (missingKeys.length > 0) {
    throw new Error("missing required keys: " + missingKeys.join(", "));
  }
};
