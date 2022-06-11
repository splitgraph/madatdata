import * as React from "react";
import { SplitPaneInputOutput } from "../debugging/SplitPaneInputOutput";

import { makeClient } from "@madatdata/client/client";

const client = makeClient({
  credential: null,
});

export const DebugDDN = () => {
  return (
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
  );
};
