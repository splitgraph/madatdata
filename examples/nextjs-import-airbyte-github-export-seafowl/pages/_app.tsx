import type { AppProps } from "next/app";
import { SqlProvider, makeSplitgraphHTTPContext } from "@madatdata/react";
import { useMemo } from "react";

import "../components/global-styles/reset.css";
import "../components/global-styles/theme.css";

export default function GitHubAnalyticsApp({ Component, pageProps }: AppProps) {
  const splitgraphDataContext = useMemo(
    () => makeSplitgraphHTTPContext({ credential: null }),
    []
  );

  return (
    <SqlProvider dataContext={splitgraphDataContext}>
      <Component {...pageProps} />
    </SqlProvider>
  );
}
