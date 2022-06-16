import { describe, it, expect } from "vitest";
import { makeClient } from "./client-pg";

describe("makeClient creates a pg client which", () => {
  it("gets bogus data from prototype", async () => {
    const client = makeClient({
      credential: null,
    });

    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

    // @ts-expect-error rowCount is missing (no WebBridgeResponse in client-pg)
    expect(result.response?.rowCount).toEqual(0);
  });
});
