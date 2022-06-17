import * as React from "react";
import { SplitPaneInputOutput } from "../debugging/SplitPaneInputOutput";

import { AuthWidget } from "./AuthWidget";

import { makeClient } from "@madatdata/client-http/client-http";
import { usePersistedCredential } from "./usePersistedCredential";

const client = makeClient({});

export const DebugDDN = () => {
  const { credential, loading } = usePersistedCredential();

  React.useEffect(() => {
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
