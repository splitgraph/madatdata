import { makeSplitgraphHTTPContext } from "@madatdata/core/splitgraph";

export const makeDefaultAnonymousContext = () => {
  const defaultAnonymousContext = makeSplitgraphHTTPContext({
    credential: null,
  });

  return defaultAnonymousContext;
};
