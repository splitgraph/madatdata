import { describe, it, expect, vi, beforeEach } from "vitest";
import { randSuffix } from "@madatdata/test-helpers/rand-suffix";
import type { Expect, Equal } from "@madatdata/test-helpers/type-test-utils";
import { makeDb } from "./db-splitgraph";
import { SplitgraphImportCSVPlugin } from "./plugins/importers/splitgraph-import-csv-plugin";
import { ExportQueryPlugin } from "./plugins/exporters/export-query-plugin";

import { shouldSkipIntegrationTests } from "@madatdata/test-helpers/env-config";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";
import { compose, graphql, rest, type DefaultBodyType } from "msw";

import { defaultHost } from "@madatdata/base-client";

import { faker } from "@faker-js/faker";

describe("importData", () => {
  it("returns false for unknown plugin", async () => {
    const examplePlugins = [
      {
        __name: "not-csv",
        importData: () =>
          Promise.resolve({ response: "import-ok", error: null, info: null }),
      },
      {
        __name: "export-csv", // NOTE: duplicate names intentional, they implement different interfaces
        exportData: () =>
          Promise.resolve({ response: "export-ok", error: null, info: null }),
      },
      {
        __name: "mongo",
        importData: ({ blah: _blah }: { blah: string }) =>
          Promise.resolve({ response: "import-ok", error: null, info: null }),
      },
    ] as const;
    const db = makeDb({
      plugins: examplePlugins,
    });

    // Make sure arguments narrow to the arguments in the "mongo" plugin from examplePlugins
    {
      true as Expect<
        Equal<Parameters<typeof db.importData>[1], { blah: string } | undefined>
      >;
    }

    await expect(async () =>
      // @ts-expect-error not a valid plugin
      db.importData("unknown-doesnotexist", {}, {}).catch((err) => {
        throw err;
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Plugin not found: unknown-doesnotexist"'
    );
  });
});

const createDb = () => {
  const transformRequestHeaders = vi.fn((headers) => ({
    ...headers,
    foobar: "fizzbuzz",
  }));

  return makeDb({
    authenticatedCredential: {
      apiKey: "xxx",
      apiSecret: "yyy",
      anonymous: false,
    },
    graphqlEndpoint: defaultHost.baseUrls.gql,
    transformRequestHeaders,

    // NOTE: exportQuery is not mocked yet
    plugins: [
      new SplitgraphImportCSVPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
        transformRequestHeaders,
      }),
    ],
  });
};

const fetchToken = async (
  db: ReturnType<typeof createDb> | ReturnType<typeof createRealDb>
) => {
  const { username } = claimsFromJWT((await db.fetchAccessToken())?.token);

  return { username };
};

// @ts-ignore-warning
const createRealDb = () => {
  const credential = {
    // @ts-expect-error https://stackoverflow.com/a/70711231
    apiKey: import.meta.env.VITE_TEST_DDN_API_KEY,
    // @ts-expect-error https://stackoverflow.com/a/70711231
    apiSecret: import.meta.env.VITE_TEST_DDN_API_SECRET,
  };

  return makeDb({
    authenticatedCredential: {
      apiKey: credential.apiKey,
      apiSecret: credential.apiSecret,
      anonymous: false,
    },
    plugins: [
      new SplitgraphImportCSVPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
      }),

      new ExportQueryPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
      }),
    ],
  });
};

// Useful when writing initial tests against real server (where anon is allowed)
// const _makeAnonymousDb = () => {
//   return makeDb({
//     plugins: {
//       csv: new SplitgraphImportCSVPlugin({
//         graphqlEndpoint: defaultHost.baseUrls.gql,
//       }),
//     },
//   });
// };

// FIXME: most of this block is graphql client implementation details
describe("importData for SplitgraphImportCSVPlugin", () => {
  setupMswServerTestHooks();
  setupMemo();

  beforeEach((testCtx) => {
    const { mswServer, useKeyedMemo } = testCtx;

    const bodyMemo = useKeyedMemo!<string, null | DefaultBodyType>(
      "uploadedFile"
    );

    /** map of apiKey:apiSecret -> token */
    const accessTokenMemo = useKeyedMemo!<
      string,
      { apiKey: string; apiSecret: string; username: string; token: string }
    >("tokens");
    /** map of taskId -> { namespace } to know which to return in status mock */
    const ingestionTaskIdMemo = useKeyedMemo!<string, { namespace: string }>(
      "tasks"
    );

    mswServer?.use(
      graphql.query("FileURLs", (req, res, context) => {
        const reqId = bodyMemo.setWithRandomId(null);

        return res(
          // FIXME: msw handlers should be factored into a common place
          compose(
            context.data({
              fileUploadDownloadUrls: {
                download: `https://data.splitgraph.com:9000/fake-url-download?key=${reqId}`,
                upload: `https://data.splitgraph.com:9000/fake-url-upload?key=${reqId}`,
              },
            }),
            context.set(
              Object.fromEntries(
                Array.from(req.headers.entries()).map(([hk, hv]) => [
                  `TEST-ECHO-${hk}`,
                  hv,
                ])
              )
            )
          )
        );
      }),
      rest.put(
        "https://data.splitgraph.com:9000/fake-url-upload",
        (req, res, context) => {
          const reqKey = req.url.searchParams.get("key");

          if (reqKey) {
            // testMemo?.findMemo(parseInt(reqKey));
            bodyMemo?.set(reqKey, req.body?.toString());
          }

          return res(context.status(200));
        }
      ),
      rest.get(
        "https://data.splitgraph.com:9000/fake-url-download",
        (req, res, context) => {
          const reqKey = req.url.searchParams.get("key");
          if (reqKey) {
            const uploadedBody = bodyMemo?.get(reqKey);

            // @ts-expect-error Types a bit too wide
            return res(context.body(uploadedBody));
          }
        }
      ),
      rest.post<{ api_key: string; api_secret: string }>(
        "https://api.splitgraph.com/auth/access_token",
        (req, res, context) => {
          const apiKey = req.body.api_key;
          const apiSecret = req.body.api_secret;

          if (!apiKey || !apiSecret) {
            return res(context.status(401));
          }

          const tokenKey = `${apiKey}:${apiSecret}`;

          const fakeUsername = faker.internet.userName();
          const fakeToken = makeFakeJwt({ claims: { username: fakeUsername } });

          if (!accessTokenMemo.has(tokenKey)) {
            accessTokenMemo.set(tokenKey, {
              token: fakeToken,
              apiKey,
              apiSecret,
              username: fakeUsername,
            });
          }

          return res(
            context.json({
              access_token: fakeToken,
              success: true,
            })
          );
        }
      ),
      graphql.operation((req, res, context) => {
        const headerToken = req.headers
          .get("authorization")
          ?.split("Bearer ")[1];

        const matchingToken = Array.from(accessTokenMemo.entries()).find(
          ([_apiKeySecret, { token }]) => token === headerToken
        );

        if (!headerToken || !matchingToken) {
          return res(context.errors([{ message: "Invalid access token" }]));
        }

        // NOTE: Return void to continue to next resolver, "middleware style"
        return;
      }),
      graphql.mutation<
        {
          startExternalRepositoryLoad: {
            taskId: string;
          };
        },
        {
          // NOTE: Incomplete, only including variables used in body of handler
          namespace: string;
        }
      >("StartExternalRepositoryLoad", (req, res, context) => {
        let invalidUsername = namespaceNotUsername(req, res, context);
        if (invalidUsername) {
          return invalidUsername;
        }

        const token = req.headers.get("authorization")?.split("Bearer ")[1];
        const { username } = claimsFromJWT(token);

        if (username !== req.variables.namespace) {
          return res(
            compose(
              context.status(401),
              context.errors([{ message: "username does not equal namespace" }])
            )
          );
        }

        const taskId = faker.datatype.uuid();
        ingestionTaskIdMemo.set(taskId, { namespace: req.variables.namespace });

        return res(
          context.data({
            startExternalRepositoryLoad: {
              taskId,
            },
          })
        );
      }),
      graphql.query<
        { jobLogs: { url: string } },
        { taskId: string; namespace: string }
      >("JobLogsByTaskId", (req, res, context) => {
        let invalidUsername = namespaceNotUsername(req, res, context);
        if (invalidUsername) {
          return invalidUsername;
        }

        if (!ingestionTaskIdMemo.has(req.variables.taskId)) {
          return res(
            context.errors([
              {
                message: "taskId not found",
              },
            ])
          );
        }

        return res(
          context.data({
            jobLogs: {
              url:
                "https://data.splitgraph.com:9000/fake-logs-for-task?taskId=" +
                req.variables.taskId,
            },
          })
        );
      }),
      rest.get(
        "https://data.splitgraph.com:9000/fake-logs-for-task",
        (req, res, context) => {
          const taskId = req.url.searchParams.get("taskId");
          if (taskId) {
            return res(context.body(`logs for: ${taskId}`));
          }
        }
      ),
      graphql.query<
        {
          repositoryIngestionJobStatus: {
            nodes: {
              taskId: string;
              started: string;
              finished: string;
              isManual: boolean;
              // FIXME: it's really TaskStatus (needs export from splitgraph-import-csv-plugin)
              status: string;
            }[];
          };
        },
        {
          namespace: string;
          repository: string;
          taskId: string;
        }
      >("RepositoryIngestionJobStatus", (req, res, context) => {
        let invalidUsername = namespaceNotUsername(req, res, context);
        if (invalidUsername) {
          return invalidUsername;
        }

        return res(
          context.data({
            repositoryIngestionJobStatus: {
              nodes: Array.from(ingestionTaskIdMemo.entries())
                .filter(
                  ([_taskId, { namespace }]) =>
                    namespace === req.variables.namespace
                )
                .map(([taskId]) => ({
                  taskId,
                  started: "blah",
                  finished: "finito",
                  isManual: true,
                  status: "SUCCESS",
                })),
            },
          })
        );
      })
    );
  });

  it("transforms headers to add auth credential", async () => {
    const db = createDb();

    // NOTE: not fetching access token here, just want to check response headers
    const { info } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "irrelevant", namespace: "no matter", repository: "dunno" }
    );

    expect({
      "test-echo-foobar": info?.presigned?.headers.get("test-echo-foobar"),
      "test-echo-x-api-key": info?.presigned?.headers.get(
        "test-echo-x-api-key"
      ),
      "test-echo-x-api-secret": info?.presigned?.headers.get(
        "test-echo-x-api-secret"
      ),
    }).toMatchInlineSnapshot(`
      {
        "test-echo-foobar": "fizzbuzz",
        "test-echo-x-api-key": "xxx",
        "test-echo-x-api-secret": "yyy",
      }
    `);
  });

  it("transforms headers using _current_ value of authenticatedCredential", async () => {
    const db = createDb();
    // await db.fetchAccessToken();
    // NOTE: not fetching access token here, just want to check response headers

    const { info: oldCredInfo } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "irrelevant", namespace: "no matter", repository: "dunno" }
    );

    expect(oldCredInfo?.presigned?.headers.get("test-echo-x-api-key")).toEqual(
      "xxx"
    );
    expect(
      oldCredInfo?.presigned?.headers.get("test-echo-x-api-secret")
    ).toEqual("yyy");

    // Ensure it uses the new credential after updating it
    db.setAuthenticatedCredential({
      apiKey: "jjj",
      apiSecret: "ccc",
      anonymous: false,
    });

    const { info } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "irrelevant", namespace: "no matter", repository: "dunno" }
    );
    expect(info?.presigned?.headers.get("test-echo-x-api-key")).toEqual("jjj");
    expect(info?.presigned?.headers.get("test-echo-x-api-secret")).toEqual(
      "ccc"
    );
  });

  it("returns expected graphql response (will change during tdd)", async ({
    useKeyedMemo,
  }) => {
    const testMemo = useKeyedMemo!("uploadedFile");

    const db = createDb();
    const { username: namespace } = await fetchToken(db);

    const { response, error } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "irrelevant", namespace, repository: "dunno" }
    );

    expect({ response, error }).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "success": true,
        },
      }
    `);

    const download = `https://data.splitgraph.com:9000/fake-url-download?key=${testMemo?.lastKey}`;

    const resulting = await fetch(download).then((response) => response.text());

    expect(resulting).toMatchInlineSnapshot('"empty_csv"');
  });

  it("uploads a file and then serves it back from its keyed URL", async ({
    useKeyedMemo,
  }) => {
    const testMemo = useKeyedMemo!("uploadedFile");
    const db = createDb();
    const { username: namespace } = await fetchToken(db);

    const { info } = await db.importData(
      "csv",
      { data: Buffer.from(`name,candies\r\nBob,5\r\nAlice,6\r\nMallory,0`) },
      { tableName: "irrelevant", namespace, repository: "dunno" }
    );

    const download = `https://data.splitgraph.com:9000/fake-url-download?key=${testMemo?.lastKey}`;

    expect(info?.presignedDownloadURL).toEqual(download);

    const resulting = await fetch(download).then((response) => response.text());

    expect(resulting).toMatchInlineSnapshot(`
      "name,candies
      Bob,5
      Alice,6
      Mallory,0"
    `);
  });

  it("uploads successfully", async () => {
    const db = createDb();
    const { username: namespace } = await fetchToken(db);

    const { response, info } = await db.importData(
      "csv",
      { data: Buffer.from(`name,candies\r\nBob,5`) },
      { tableName: "irrelevant", namespace, repository: "dunno" }
    );

    expect((response as any)?.success).toEqual(true);

    expect(info?.jobStatus.status).toEqual("SUCCESS");
  });

  it("can fetch jobLog.url for taskId matching jobStatus.taskId", async () => {
    const db = createDb();
    const { username: namespace } = await fetchToken(db);

    const { info } = await db.importData(
      "csv",
      { data: Buffer.from(`name,candies\r\nBob,5`) },
      { tableName: "doesntmatter", namespace, repository: "onomatopoeia" }
    );

    const jobLogRaw = await fetch(info!.jobLog!.url).then((response) =>
      response.text()
    );
    expect(jobLogRaw).toMatchInlineSnapshot(
      `"logs for: ${info!.jobStatus.taskId}"`
    );
  });

  it("cannot fetch jobLog.url using a different username", async () => {
    const db = createDb();
    await fetchToken(db);

    const namespace = "something-unexpected";

    const { error } = await db.importData(
      "csv",
      { data: Buffer.from(`name,candies\r\nBob,5`) },
      { tableName: "doesntmatter", namespace, repository: "onomatopoeia" }
    );

    expect(error.response.errors).toMatchInlineSnapshot(`
      [
        {
          "message": "username does not equal namespace",
        },
      ]
    `);
  });

  it("returns error with bad access token", async () => {
    const db = createDb();
    const { username: namespace } = await fetchToken(db);

    db.setAuthenticatedCredential({ token: "bad-token", anonymous: false });

    const { error } = await db.importData(
      "csv",
      { data: Buffer.from(`name,candies\r\nBob,5`) },
      { tableName: "irrelevant", namespace, repository: "dunno" }
    );

    expect(error.response.errors).toMatchInlineSnapshot(`
      [
        {
          "message": "Invalid access token",
        },
      ]
    `);
  });
});

// TODO: Make a mocked version of this test
describe.skipIf(shouldSkipIntegrationTests())("real export query", () => {
  it("exports a basic postgres query to parquet", async () => {
    const db = createRealDb();

    const { response, error, info } = await db.exportData(
      "exportQuery",
      {
        query: `SELECT a as int_val, string_agg(random()::text, '') as text_val
FROM generate_series(1, 5) a, generate_series(1, 50) b
GROUP BY a ORDER BY a;`,
        vdbId: "ddn",
      },
      {
        format: "parquet",
        filename: "random-series",
      }
    );

    expect(response).toBeDefined();
    expect(info).toBeDefined();

    expect(response?.output.url).toBeDefined();

    expect(() => new URL(response?.output.url!)).not.toThrow();

    expect({
      ...response,
      // filter out variable values from snapshot just by checking they exist
      taskId: response?.taskId ? "task-id-ok" : "error-in-task-id",
      started: response?.started ? "started-ok" : "error-in-started",
      finished: response?.finished ? "finished-ok" : "error-id",
      output: !!(response?.output as { url?: string })["url"]
        ? { url: "url-ok" }
        : { url: "error-in-url" },
    }).toMatchInlineSnapshot(`
      {
        "exportFormat": "parquet",
        "filename": "random-series.parquet",
        "finished": "finished-ok",
        "output": {
          "url": "url-ok",
        },
        "started": "started-ok",
        "status": "SUCCESS",
        "success": true,
        "taskId": "task-id-ok",
      }
    `);

    expect(error).toMatchInlineSnapshot("null");
  }, 30_000);
});

describe.skipIf(shouldSkipIntegrationTests())("real DDN", () => {
  it("uploads with TableParamsSchema semicolon delimiter", async () => {
    const db = createRealDb();
    const { username: namespace } = await fetchToken(db);

    const { response, info } = await db.importData(
      "csv",
      { data: Buffer.from(`name;candies\r\nBob;5\r\nAlice;10`) },
      {
        tableName: `irrelevant-${randSuffix()}`,
        namespace,
        repository: "dunno",
        tableParams: {
          delimiter: ";",
        },
      }
    );

    expect((response as any)?.success).toEqual(true);

    expect(info?.jobStatus.status).toEqual("SUCCESS");

    expect(info?.jobLog?.url.includes(info.jobStatus.taskId)).toBe(true);
  }, 20_000);
});
describe("makeFakeJwt and claimsFromJwt", () => {
  it("produce agreeable output", () => {
    const jwt = makeFakeJwt();
    expect(claimsFromJWT(jwt)).toMatchInlineSnapshot(`
      {
        "grant": "access",
        "username": "default-username",
      }
    `);
  });

  it("allows overriding claims", () => {
    const jwt = makeFakeJwt({
      claims: { username: "foobar", fizzbuzz: "bazfoo" },
    });
    expect(claimsFromJWT(jwt)).toMatchInlineSnapshot(`
      {
        "fizzbuzz": "bazfoo",
        "grant": "access",
        "username": "foobar",
      }
    `);
  });
});

const toBase64 = (input: string) =>
  !!globalThis.Buffer
    ? Buffer.from(input, "binary").toString("base64")
    : btoa(input);

export const fromBase64 = (input: string) =>
  !!globalThis.Buffer ? Buffer.from(input, "base64").toString() : atob(input);

const makeFakeJwt = (opts?: { claims?: Record<string, any> }) => {
  const claims = {
    grant: "access",
    username: "default-username",
    ...opts?.claims,
  };

  return [
    {
      alg: "RS256",
      typ: "JWT",
    },
    claims,
  ]
    .map((o) => JSON.stringify(o))
    .concat("fakeSignature")
    .map(toBase64)
    .join(".");
};

const claimsFromJWT = (jwt?: string) => {
  if (!jwt) {
    return {};
  }

  const [_header, claims, _signature] = jwt
    .split(".")
    .map(fromBase64)
    .slice(0, -1) // Signature is not parseable JSON
    .map((o) => JSON.parse(o));

  return claims;
};

const namespaceNotUsername: Parameters<
  typeof graphql.operation<any, { namespace: string }>
>[0] = (req, res, context) => {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  const { username } = claimsFromJWT(token);

  if (username !== req.variables.namespace) {
    return res(
      compose(
        context.status(401),
        context.errors([{ message: "username does not equal namespace" }])
      )
    );
  }
};
