import { SplitPaneInputOutput } from "../debugging/SplitPaneInputOutput";

import { ConfigWidget } from "./ConfigWidget";

import { makeSeafowlHTTPContext } from "@madatdata/react";
import { usePersistedConfig } from "./usePersistedConfig";

export const createRealSeafowlDataContext = ({
  seafowlUrl,
  seafowlSecret,
}: {
  seafowlUrl?: string;
  seafowlSecret?: string;
}) => {
  const dataUrl = seafowlUrl
    ? new URL(seafowlUrl)
    : new URL("http://127.0.0.1:8080");
  return makeSeafowlHTTPContext({
    database: {
      dbname: "seafowl", // arbitrary
    },
    authenticatedCredential: seafowlSecret
      ? {
          token: seafowlSecret,
          anonymous: false,
        }
      : undefined,
    host: {
      // temporary hacky mess
      dataHost: dataUrl.host,
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: `${dataUrl.protocol}//${dataUrl.host}/q`,
        auth: "bogus",
      },
      postgres: {
        host: dataUrl.host, // NOTE: if behind cloudflare, won't be exposed
        port: 6432,
        ssl: false,
      },
    },
  });
};

export const DebugSeafowl = () => {
  const { config, loading } = usePersistedConfig();

  const { db: _db, client } = createRealSeafowlDataContext({
    seafowlUrl: config?.seafowlUrl,
    seafowlSecret: config?.seafowlSecret,
  });

  return (
    <>
      {!config?.seafowlUrl || loading ? (
        <div>Enter URL (and optionally secret), then refresh the page</div>
      ) : (
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
      )}
      <ConfigWidget />
    </>
  );
};
