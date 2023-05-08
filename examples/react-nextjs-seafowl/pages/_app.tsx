import { useMemo } from "react";
import type { AppProps } from "next/app";
import { SqlProvider, makeSeafowlHTTPContext } from "@madatdata/react";
import "../reset.css";

export default function SearchMetricsApp({ Component, pageProps }: AppProps) {
  const seafowlDataContext = useMemo(
    () => makeSeafowlHTTPContext("https://demo.seafowl.cloud"),
    []
  );

  return (
    <SqlProvider dataContext={seafowlDataContext}>
      <Component {...pageProps} />
    </SqlProvider>
  );
}
