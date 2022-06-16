import { describe, it, expect } from "vitest";
import { makeClient } from "./client-postgres";

// TODO: We're using the real DDN atm, which requires these env vars to exist,
// and also we don't yet have any method for loading credentials
const credential = {
  // @ts-expect-error https://stackoverflow.com/a/70711231
  apiKey: import.meta.env.VITE_TEST_DDN_API_KEY,
  // @ts-expect-error https://stackoverflow.com/a/70711231
  apiSecret: import.meta.env.VITE_TEST_DDN_API_SECRET,
};

const hasCredential = !!credential.apiKey && !!credential.apiSecret;

describe.skipIf(!hasCredential)("makeClient creates a pg client which", () => {
  it("selects 1 from ddn during integration testing", async () => {
    const client = makeClient({
      credential,
    });

    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

    expect(result.response).toBeTruthy();
    expect(Array.from(result.response!.rows).length).toEqual(1);
    expect(Array.from(result.response!.rows)[0]["?column?"]).toEqual(1);
  });
});
