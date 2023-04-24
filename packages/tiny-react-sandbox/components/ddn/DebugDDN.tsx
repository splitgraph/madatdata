import { useEffect } from "react";
import { SplitPaneInputOutput } from "../debugging/SplitPaneInputOutput";

import { AuthWidget } from "./AuthWidget";

import {
  skipParsingFieldsFromResponse,
  parseFieldsFromResponseBodyJSONFieldsKey,
  makeClient,
  type HTTPStrategies,
} from "@madatdata/client-http";
import { makeAuthHeaders } from "@madatdata/react";
import { usePersistedCredential } from "./usePersistedCredential";

const splitgraphClientOptions = {
  bodyMode: "json",
  strategies: {
    makeFetchOptions: ({ credential, query, execOptions }) => {
      console.log("got credential...:", credential);

      // HACKY: atm, splitgraph API does not accept "object" as valid param
      // so remove it from execOptions (hacky because ideal is `...execOptions`)
      const httpExecOptions =
        execOptions?.rowMode === "object"
          ? (({ rowMode, ...rest }) => rest)(execOptions)
          : execOptions;

      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...makeAuthHeaders(
            credential
          ) /* fixme: smell? prefer `this.credential`? */,
        },
        body: JSON.stringify({ sql: query, ...httpExecOptions }),
      };
    },
    makeQueryURL: async ({ host, database }) => {
      return Promise.resolve(host.baseUrls.sql + "/" + database.dbname);
    },
    parseFieldsFromResponse: skipParsingFieldsFromResponse,
    parseFieldsFromResponseBodyJSON: parseFieldsFromResponseBodyJSONFieldsKey,
  } as HTTPStrategies,
};

const client = makeClient({
  credential: null,
  ...splitgraphClientOptions,
});

export const DebugDDN = () => {
  const { credential, loading } = usePersistedCredential();

  useEffect(() => {
    if (!loading) {
      if (credential?.apiKey && credential?.apiSecret) {
        client.setCredential({
          apiKey: credential.apiKey!,
          apiSecret: credential.apiSecret!,
        });
      } else {
        client.setCredential(null);
      }
    }
  }, [credential, loading]);

  return (
    <>
      <SplitPaneInputOutput
        makeOutput={(inputValue) => {
          return inputValue;
        }}
        renderOutputToString={(output) => {
          try {
            return JSON.stringify(output, null, 2);
          } catch (err) {
            return (
              (typeof output === "object" || typeof output === "function"
                ? output
                : {}
              )?.toString?.() ?? `Unknown type [${typeof output}]`
            );
          }
        }}
        fetchOutput={async (inputValue) => {
          if (!inputValue) {
            return;
          }

          const result = await client.execute(inputValue);
          return result;
        }}
      />
      <AuthWidget />
    </>
  );
};
