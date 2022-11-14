import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import { setupMswServerTestHooks } from "./msw-server-hooks";
import { rest } from "msw";

import { FetchInterceptor } from "@mswjs/interceptors/lib/interceptors/fetch";

/**
 * The "raw interceptor" (`FetchInterceptor`) intercepts global fetch, including
 * the "node native" (undici) fetch enabled by default in Node v18+.
 *
 * The upstream `msw` package does not currently provide an easy way to add
 * interceptors, and it does not enable the fetch interceptor by default in
 * the node environment. However, it does work. So until this is fixed upstream,
 * we patch it with Yarn patch to include this same FetchInterceptor, which we
 * test directly here as a smoke test to make sure `msw` could even be working
 */
describe("can use raw msw FetchInterceptor", () => {
  const resolver = vi.fn((req: any) => {
    console.log("got req: ", req);
  });

  const interceptor = new FetchInterceptor();
  interceptor.on("request", (...args) => {
    return resolver(...args);
  });

  beforeAll(() => {
    interceptor.apply();
  });

  beforeEach(() => {
    resolver.mockReset();
  });

  it("intercepts HTTP GET request", async () => {
    const response = await fetch("https://www.httpbin.org/headers");
    expect(resolver).toHaveBeenCalledOnce();
    expect(response).not.toBeNull();
  });

  afterAll(() => {
    interceptor.dispose();
  });
});

/**
 * Test that we can setup an msw "server", which will be using `FetchInterceptor`
 * because it's provided by our patched version of `msw` (see yarn patch)
 *
 * (Currently, this behavior is provided by our patch (managed with Yarn patch)
 * until the upstream package changes to instantiate FetchInterceptor by default)
 *
 * Note: We know that if the request is intercepted, it must be
 * using `FetchInterceptor`, because we are not including the `cross-fetch`
 * polyfill in our test environment, and so if the tests pass, they're passing
 * using the node "native" fetch, i.e. new global `fetch` provided by `undici`
 */
describe("setupMswServerTestHooks", () => {
  setupMswServerTestHooks();

  beforeEach(({ mswServer }) => {
    mswServer?.use(
      rest.get("http://www.httpbin.org/headers", (_req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
          })
        );
      })
    );
  });

  it("intercepts HTTP GET request", async () => {
    const response = await fetch("http://www.httpbin.org/headers");

    expect(response).toBeDefined();

    expect(await response.text()).toMatchInlineSnapshot(
      '"{\\"success\\":true}"'
    );
  });
});
