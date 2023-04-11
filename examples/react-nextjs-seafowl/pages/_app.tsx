import { useMemo } from "react";
import type { AppProps } from "next/app";
import { SqlProvider, makeSeafowlHTTPContext } from "@madatdata/react";
import "../reset.css";

export default function SearchMetricsApp({ Component, pageProps }: AppProps) {
  const seafowlDataContext = useMemo(
    () =>
      makeSeafowlHTTPContext({
        database: {
          dbname: "default",
        },
        authenticatedCredential: undefined,
        host: {
          // temporary hacky mess
          dataHost: "demo.seafowl.cloud",
          apexDomain: "bogus",
          apiHost: "bogus",
          baseUrls: {
            gql: "bogus",
            sql: "https://demo.seafowl.cloud/q",
            auth: "bogus",
          },
          postgres: {
            host: "demo.seafowl.cloud",
            port: 6432,
            ssl: false,
          },
        },
      }),
    []
  );

  return (
    <SqlProvider dataContext={seafowlDataContext}>
      <Component {...pageProps} />
    </SqlProvider>
  );
}
