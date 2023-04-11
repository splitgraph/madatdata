import { describe, it, expect, afterEach, vi } from "vitest";
import { makeSeafowlHTTPContext } from "./seafowl";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";
import type { Host } from "@madatdata/base-client";

// @ts-expect-error https://stackoverflow.com/a/70711231
const SEAFOWL_SECRET = import.meta.env.VITE_TEST_SEAFOWL_SECRET;

// Depending on whether SEAFOWL_SECRET is defined (might not be in CI), we expect
// serialized credentials to include different values
const expectAnonymous = !SEAFOWL_SECRET;
const expectToken = SEAFOWL_SECRET ?? "anonymous-token";

export const createDataContext = () => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "default",
    },
    authenticatedCredential: SEAFOWL_SECRET
      ? {
          token: SEAFOWL_SECRET,
          anonymous: false,
        }
      : undefined,
    host: {
      // temporary hacky mess
      dataHost: "127.0.0.1:8080",
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: "http://127.0.0.1:8080",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
  });
};

export const createRealDataContext = () => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "default",
    },
    authenticatedCredential: {
      // @ts-expect-error https://stackoverflow.com/a/70711231
      token: import.meta.env.VITE_TEST_SEAFOWL_SECRET,
      anonymous: false,
    },
    host: {
      // temporary hacky mess
      dataHost: "127.0.0.1:8080",
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: "http://127.0.0.1:8080",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
  });
};

describe("makeSeafowlHTTPContext", () => {
  setupMswServerTestHooks();

  it("initializes as expected", () => {
    const ctx = createDataContext();

    expect(ctx.client).toBeTruthy();
    expect(ctx.db).toBeTruthy();

    expect(typeof ctx.db["authenticatedCredential"] === "undefined").toEqual(
      expectAnonymous
    );

    // NOTE: seafowlClient is expected to be undefined because we don't set it
    // in the constructor (since it depends on the instantiated class). Instead
    // we set it via a builder like withOptions (in other words, the instance
    // created via `new DbSeafowl()` cannot control a seafowlClient, and must create
    // a new instance from one of its builder methods to use a seafowlClient)
    //    (this is not necessarily a desirable state of affairs)
    expect({
      ...ctx,
      db: (({
        // @ts-expect-error Protected member, but it gets serialized and we want to remove it
        authenticatedCredential: _removeHardToSnapshotAuthenticatedCredential,
        ...dbCtx
      }: typeof ctx.db) => dbCtx)(ctx.db),
    }).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "bodyMode": "jsonl",
          "credential": {
            "anonymous": ${expectAnonymous},
            "token": "${expectToken}",
          },
          "database": {
            "dbname": "default",
          },
          "host": {
            "apexDomain": "bogus",
            "apiHost": "bogus",
            "baseUrls": {
              "auth": "bogus",
              "gql": "bogus",
              "sql": "http://127.0.0.1:8080",
            },
            "dataHost": "127.0.0.1:8080",
            "postgres": {
              "host": "127.0.0.1",
              "port": 6432,
              "ssl": false,
            },
          },
          "strategies": {
            "makeFetchOptions": [Function],
            "makeQueryURL": [Function],
          },
        },
        "db": {
          "database": {
            "dbname": "default",
          },
          "host": {
            "apexDomain": "bogus",
            "apiHost": "bogus",
            "baseUrls": {
              "auth": "bogus",
              "gql": "bogus",
              "sql": "http://127.0.0.1:8080",
            },
            "dataHost": "127.0.0.1:8080",
            "postgres": {
              "host": "127.0.0.1",
              "port": 6432,
              "ssl": false,
            },
          },
          "opts": {
            "authenticatedCredential": ${
              expectAnonymous
                ? "undefined"
                : `{
              "anonymous": ${expectAnonymous},
              "token": "${expectToken}",
            }`
            },
            "database": {
              "dbname": "default",
            },
            "host": {
              "apexDomain": "bogus",
              "apiHost": "bogus",
              "baseUrls": {
                "auth": "bogus",
                "gql": "bogus",
                "sql": "http://127.0.0.1:8080",
              },
              "dataHost": "127.0.0.1:8080",
              "postgres": {
                "host": "127.0.0.1",
                "port": 6432,
                "ssl": false,
              },
            },
            "plugins": [
              SeafowlImportFilePlugin {
                "__name": "csv",
                "opts": {
                  "seafowlClient": undefined,
                },
                "seafowlClient": undefined,
              },
            ],
          },
          "plugins": PluginRegistry {
            "hostContext": {},
            "plugins": [
              SeafowlImportFilePlugin {
                "__name": "csv",
                "opts": {
                  "seafowlClient": undefined,
                },
                "seafowlClient": undefined,
              },
            ],
          },
        },
      }
    `);
  });
});

// NOTE: kind of unsafe/misleading. We're only testing the strategy functions here,
// since e.g. SqlHttpClient.makeQueryURL is private, and we haven't yet bothered to
// mock the Seafowl HTTP API. So we're assuming that SqlClientHttpClient.makeQueryURL
// will pass parameters to the strategy function in the same way as we are doing here
describe("makeQueryURL", () => {
  const makeTestContext = ({ host, dbname }: { host: Host; dbname: string }) =>
    makeSeafowlHTTPContext({
      database: {
        dbname,
      },
      authenticatedCredential: undefined,
      host,
    });

  const hostFromUrl = (dataHost: string) => ({
    dataHost: dataHost,
    apexDomain: "bogus",
    apiHost: "bogus",
    baseUrls: {
      gql: "bogus",
      sql: "http://127.0.0.1:8080",
      auth: "bogus",
    },
    postgres: {
      host: "127.0.0.1",
      port: 6432,
      ssl: false,
    },
  });

  const makeMockedMakeQueryUrl = ({
    dataHost,
    dbname,
  }: {
    dataHost: string;
    dbname: string;
  }) => {
    const opts = { host: hostFromUrl(dataHost), dbname: dbname };

    const {
      db: {
        httpClientOptions: { strategies },
      },
    } = makeTestContext(opts);

    return {
      opts,
      makeQueryUrl: (query: string) => {
        return strategies?.makeQueryURL({
          host: opts.host,
          database: { dbname: opts.dbname },
          query: query,
        });
      },
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("constructs GET query URL for SELECT", async () => {
    const { makeQueryUrl } = makeMockedMakeQueryUrl({
      dataHost: "127.0.0.1:8080",
      dbname: "blahblah",
    });

    expect(await makeQueryUrl("SELECT 1")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q/e004ebd5b5532a4b85984a62f8ad48a81aa3460c1ca07701f386135d72cdecf5.csv"'
    );
  });

  it("assumes GET if no DDL but warns if no SELECT", async () => {
    const { makeQueryUrl } = makeMockedMakeQueryUrl({
      dataHost: "127.0.0.1:8080",
      dbname: "blahblah",
    });

    const mockedWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await makeQueryUrl("-- Just a comment")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q/86661ce809b75e52fe37ba823a305238ce392fb793eaa92d2f86cd74bddb2a50.csv"'
    );

    expect(mockedWarn).toHaveBeenLastCalledWith(
      "No SELECT in query, but assuming GET:",
      "-- Just a comment"
    );
  });

  // NOTE: We have a (very) hacky `guessMethodForQuery` that presumes GET for most queries
  // and specifically looks for DDL statements for POST queries. See db-seafowl.ts
  it("constructs POST query URL for DDL commands", async () => {
    const { makeQueryUrl } = makeMockedMakeQueryUrl({
      dataHost: "127.0.0.1:8080",
      dbname: "blahblah",
    });

    // NOTE: We assume it's a POST query because there is no hash in the URL
    expect(await makeQueryUrl("INSERT INTO blahblah")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("UPDATE something")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("DELETE xxx")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("delete xxx")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(
      await makeQueryUrl(`DELETE
        xxx`)
    ).toMatchInlineSnapshot('"http://127.0.0.1:8080/blahblah/q"');
    expect(await makeQueryUrl("ALTER a_table")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("VACUUM")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("CREATE")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("Drop table blah")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
  });
});

// NOTE: It's up to the backend to support rowMode array/object mode
// and at the moment seafowl is only object mode
describe.skipIf(shouldSkipSeafowlTests())("can query local seafowl", () => {
  it("select 1, 2 in (default) object mode in (default) jsonl body mode", async () => {
    const { client } = createDataContext();

    const res = await client.execute<[number, number]>("select 1, 2;", {
      rowMode: "object",
    });

    expect(res.response).toMatchInlineSnapshot(`
      {
        "readable": [Function],
        "rows": [
          {
            "Int64(1)": 1,
            "Int64(2)": 2,
          },
        ],
        "success": true,
      }
    `);
  });
});
