import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
// import { shouldSkipIntegrationTests } from "@madatdata/test-helpers/env-config";
import {
  render,
  setupReactTestingLibrary,
} from "@madatdata/test-helpers/setup-react-testing-library";
import { rest } from "msw";

import { defaultHost } from "@madatdata/base-client/host";
import { HelloButton } from "./hooks";

describe("hooks", () => {
  setupMswServerTestHooks();
  setupReactTestingLibrary();

  beforeEach(({ mswServer }) => {
    mswServer?.use(
      rest.post(defaultHost.baseUrls.sql + "/ddn", (_req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            command: "SELECT",
            rowCount: 1,
            rows: [
              {
                "?column?": 1,
              },
            ],
            fields: [
              {
                name: "?column?",
                tableID: 0,
                columnID: 0,
                dataTypeID: 23,
                dataTypeSize: 4,
                dataTypeModifier: -1,
                format: "text",
                formattedType: "INT4",
              },
            ],
            executionTime: "128ms",
            executionTimeHighRes: "0s 128.383115ms",
          })
        );
      })
    );
  });

  it("renders the hello/goodbye button and toggles it on click", async () => {
    render(<HelloButton />);

    const helloButton = screen.getByRole("button", { name: "hello" });
    fireEvent.click(helloButton);
    await screen.findByText("goodbye");

    const goodbyeButton = screen.getByRole("button", { name: "goodbye" });
    fireEvent.click(goodbyeButton);
    await screen.findByText("hello");
  });
});
