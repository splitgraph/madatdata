import type { AppProps } from "next/app";
import "../components/global-styles/reset.css";
import "../components/global-styles/theme.css";

export default function GitHubAnalyticsApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
