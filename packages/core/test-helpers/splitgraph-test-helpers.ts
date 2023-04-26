import { makeSplitgraphHTTPContext } from "../splitgraph";

export const createDataContext = (
  opts?: Parameters<typeof makeSplitgraphHTTPContext>[0]
) => {
  return makeSplitgraphHTTPContext({
    ...opts, // note: only top level keys are merged
  });
};

export const createRealDataContext = () => {
  const credential = {
    // @ts-expect-error https://stackoverflow.com/a/70711231
    apiKey: import.meta.env.VITE_TEST_DDN_API_KEY,
    // @ts-expect-error https://stackoverflow.com/a/70711231
    apiSecret: import.meta.env.VITE_TEST_DDN_API_SECRET,
  };
  return makeSplitgraphHTTPContext({
    authenticatedCredential: {
      apiKey: credential.apiKey,
      apiSecret: credential.apiSecret,
      anonymous: false,
    },
  });
};
