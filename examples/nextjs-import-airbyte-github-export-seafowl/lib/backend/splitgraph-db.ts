import { makeSplitgraphDb, makeSplitgraphHTTPContext } from "@madatdata/core";

// TODO: fix plugin exports
import { makeDefaultPluginList } from "@madatdata/db-splitgraph";
import { defaultSplitgraphHost } from "@madatdata/core";

const SPLITGRAPH_API_KEY = process.env.SPLITGRAPH_API_KEY;
const SPLITGRAPH_API_SECRET = process.env.SPLITGRAPH_API_SECRET;

// Throw top level error on missing keys because these are  _always_ required app to run
if (!SPLITGRAPH_API_KEY || !SPLITGRAPH_API_SECRET) {
  throw new Error(
    "Environment variable SPLITGRAPH_API_KEY or SPLITGRAPH_API_SECRET is not set." +
      " See env-vars.d.ts for instructions."
  );
}

const authenticatedCredential: Parameters<
  typeof makeSplitgraphDb
>[0]["authenticatedCredential"] = {
  apiKey: SPLITGRAPH_API_KEY,
  apiSecret: SPLITGRAPH_API_SECRET,
  anonymous: false,
};

// TODO: The access token can expire and silently fail?

export const makeAuthenticatedSplitgraphDb = () =>
  makeSplitgraphDb({
    authenticatedCredential,
    plugins: makeDefaultPluginList({
      graphqlEndpoint: defaultSplitgraphHost.baseUrls.gql,
      authenticatedCredential,
    }),
  });

export const makeAuthenticatedSplitgraphHTTPContext = () =>
  makeSplitgraphHTTPContext({
    authenticatedCredential,
    plugins: makeDefaultPluginList({
      graphqlEndpoint: defaultSplitgraphHost.baseUrls.gql,
      authenticatedCredential,
    }),
  });

// TODO: export this utility function from the library
export const claimsFromJWT = (jwt?: string) => {
  if (!jwt) {
    return {};
  }

  const [_header, claims, _signature] = jwt
    .split(".")
    .map(fromBase64)
    .slice(0, -1) // Signature is not parseable JSON
    .map((o) => JSON.parse(o));

  return claims;
};

const fromBase64 = (input: string) =>
  !!globalThis.Buffer ? Buffer.from(input, "base64").toString() : atob(input);
