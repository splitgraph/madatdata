import { describe, it, expect, vi, beforeEach } from "vitest";
import { randSuffix } from "@madatdata/test-helpers/rand-suffix";
import type { Expect, Equal } from "@madatdata/test-helpers/type-test-utils";
import { makeDb } from "./db-splitgraph";
import { SplitgraphImportCSVPlugin } from "./plugins/importers/splitgraph-import-csv-plugin";
import { SplitgraphExportQueryToFilePlugin } from "./plugins/exporters/splitgraph-export-query-to-file-plugin";

import {
  shouldSkipExportFromSplitgraphToSeafowlIntegrationTests,
  shouldSkipIntegrationTests,
  shouldSkipIntegrationTestsForGitHubExternalDataSource,
} from "@madatdata/test-helpers/env-config";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";
import { compose, graphql, rest, type DefaultBodyType } from "msw";

import { defaultHost } from "@madatdata/base-client";

import { faker } from "@faker-js/faker";
import { SplitgraphAirbyteGithubImportPlugin } from "./plugins/importers/generated/airbyte-github/plugin";
import { SplitgraphExportToSeafowlPlugin } from "./plugins/exporters/splitgraph-export-to-seafowl-plugin";

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

    // NOTE: not all plugins are fully mocked
    plugins: [
      new SplitgraphImportCSVPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
        transformRequestHeaders,
      }),
      new SplitgraphAirbyteGithubImportPlugin({
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

      new SplitgraphAirbyteGithubImportPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
      }),

      new SplitgraphExportQueryToFilePlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
      }),

      new SplitgraphExportToSeafowlPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
      }),
    ],
  });
};

// @ts-expect-error https://stackoverflow.com/a/70711231
const GITHUB_PAT_SECRET = import.meta.env.VITE_TEST_GITHUB_PAT_SECRET;

describe.skipIf(shouldSkipIntegrationTestsForGitHubExternalDataSource())(
  "importData for AirbyeGitHubImportPlugin",
  () => {
    it("can use the plugin", async () => {
      const db = createRealDb();

      const { username: namespace } = await fetchToken(db);

      // NOTE: not actually asserting anything here atm, and these tests
      // should usually be skipped until we have a better way of integration
      // testing that doesn't require spam-ingesting GitHub repos into Splitgraph,
      // or at least has the capability to delete them afterward
      // SEE: packages/test-helpers/env-config.ts for hardcoded skip logic

      // For now this is just a way to manually check everything is working
      await db.importData(
        "airbyte-github",
        {
          credentials: {
            credentials: {
              personal_access_token: GITHUB_PAT_SECRET,
            },
          },
          params: {
            repository: "splitgraph/seafowl",
            start_date: "2021-06-01T00:00:00Z",
          },
        },
        {
          namespace: namespace,
          repository: "madatdata-test-github-ingestion",
          tables: [
            {
              name: "stargazers",
              options: {
                airbyte_cursor_field: ["starred_at"],
                airbyte_primary_key_field: [],
              },
              schema: [],
            },
          ],
        }
      );
    }, 60_000);
  }
);

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
  // NOTE: test assumes that the task hasn't completed by the time we send the first check
  it("deferred exports basic postgres query to parquet returns a taskId", async () => {
    const db = createRealDb();
    const {
      taskId,
      response,
      error: _e,
      info,
    } = await db.exportData(
      "export-query-to-file",
      // NOTE: Use a fairly big query (10,000 rows) so that it takes long enough to complete
      // that when we check it's status for the first time, we can expect it to still be pending
      // (with a low number of rows, this test sometimes failed since the task was complete when checking it)
      {
        query: `SELECT a as int_val, string_agg(random()::text, '') as text_val
FROM generate_series(1, 10000) a, generate_series(1, 50) b
GROUP BY a ORDER BY a;`,
        vdbId: "ddn",
      },
      {
        format: "parquet",
        filename: "random-series",
      },
      { defer: true }
    );

    expect(typeof taskId).toBe("string");
    expect(taskId?.length).toEqual(36);

    expect(taskId).toBeDefined();

    expect(response).toBeDefined();
    expect(info).toBeDefined();

    const startedTask = await db.pollDeferredTask("export-query-to-file", {
      taskId: taskId as string,
    });

    expect(startedTask.completed).toBe(false);
    expect(startedTask.error).toBeNull();
    expect(startedTask.response?.status).toBe("STARTED");
    expect(startedTask.response!.exportFormat).toBe("parquet");
  });

  it("exports a basic postgres query to parquet (and pollDeferredTask returns completed task)", async () => {
    const db = createRealDb();

    const { response, error, info } = await db.exportData(
      "export-query-to-file",
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

    // PIGGYBACK on this test to also test pollDeferredTask
    // This is kind of cheating: we didn't initialize it as a deferred task, but
    // we know that with the taskId, we can get the tatus of a deferred task. And
    // we want to test that pollDeferredTask returns completed: true when a task
    // has completed, and it's convenient to check that here since we know for
    // sure that this task has completed (since we didn't defer it and therefore waited for it)
    const shouldBeCompletedTask = await db.pollDeferredTask(
      "export-query-to-file",
      { taskId: response.taskId }
    );

    expect(shouldBeCompletedTask.completed).toBe(true);
    expect(shouldBeCompletedTask.error).toBeNull();
    expect(shouldBeCompletedTask.response?.exportFormat).toBe("parquet");

    const taskOutput = shouldBeCompletedTask.response?.output;

    expect(typeof taskOutput).toBe("object");
    expect("url" in (taskOutput as object)).toBe(true);
    expect(typeof (taskOutput as { url: string })["url"]).toBe("string");
  }, 30_000);
});

// @ts-expect-error https://stackoverflow.com/a/70711231
const SEAFOWL_DEST_SECRET = import.meta.env
  .VITE_TEST_SEAFOWL_EXPORT_DEST_SECRET;

// @ts-expect-error https://stackoverflow.com/a/70711231
const SEAFOWL_DEST_URL = import.meta.env.VITE_TEST_SEAFOWL_EXPORT_DEST_URL;

// @ts-expect-error https://stackoverflow.com/a/70711231
const SEAFOWL_DEST_DBNAME = import.meta.env
  .VITE_TEST_SEAFOWL_EXPORT_DEST_DBNAME;

describe.skipIf(shouldSkipExportFromSplitgraphToSeafowlIntegrationTests())(
  "export from splitgraph to seafowl",
  () => {
    it("defers an export to seafowl", async () => {
      const db = createRealDb();

      const { username: splitgraphUsername } = await fetchToken(db);

      expect(splitgraphUsername).toEqual(SEAFOWL_DEST_DBNAME);

      // Should be _only the base URL_, like: https://demo.seafowl.cloud
      expect(SEAFOWL_DEST_URL.endsWith("/")).toEqual(false);
      expect(SEAFOWL_DEST_URL.endsWith("/q")).toEqual(false);

      const destTableSuffix = randSuffix();
      const destTable = `random_series_${destTableSuffix}`;

      const res = await db.exportData(
        "export-to-seafowl",
        {
          queries: [
            {
              source: {
                query: `SELECT a as int_val, string_agg(random()::text, '') as text_val
            FROM generate_series(1, 5) a, generate_series(1, 50) b
            GROUP BY a ORDER BY a;`,
              },
              destination: {
                schema: "madatdata_testing",
                table: destTable,
              },
            },
          ],
        },
        {
          seafowlInstance: {
            selfHosted: {
              url: SEAFOWL_DEST_URL,
              dbname: SEAFOWL_DEST_DBNAME,
              secret: SEAFOWL_DEST_SECRET,
            },
          },
        },
        { defer: true }
      );

      expect({
        queries: res.taskIds.queries.map((_: string) => "some query id"),
        tables: res.taskIds.tables,
        vdbs: res.taskIds.vdbs,
      }).toMatchInlineSnapshot(`
        {
          "queries": [
            "some query id",
          ],
          "tables": [],
          "vdbs": [],
        }
      `);

      expect(res.taskIds.queries.length).toEqual(1);

      const taskId = res.taskIds.queries[0].jobId;

      const startedTask = await db.pollDeferredTask("export-to-seafowl", {
        taskId: taskId as string,
      });

      expect(startedTask.completed).toBe(false);
      expect(startedTask.error).toBeNull();
      expect(startedTask.info).not.toBeNull();
      expect(startedTask.info?.jobStatus).not.toBeNull();
      expect(startedTask.info?.jobStatus?.status).toBe(200);
      expect(startedTask.response?.status).toBe("STARTED");
      expect(startedTask.response?.exportFormat).toBe("sync");
      expect(typeof startedTask.response?.started).toBe("string");
      expect(startedTask.response?.finished).toBeNull();
    }, 20_000);

    it("exports a query to seafowl", async () => {
      const db = createRealDb();

      const { username: splitgraphUsername } = await fetchToken(db);

      expect(splitgraphUsername).toEqual(SEAFOWL_DEST_DBNAME);

      // Should be _only the base URL_, like: https://demo.seafowl.cloud
      expect(SEAFOWL_DEST_URL.endsWith("/")).toEqual(false);
      expect(SEAFOWL_DEST_URL.endsWith("/q")).toEqual(false);

      const destTableSuffix = randSuffix();
      const destTable = `random_series_${destTableSuffix}`;

      const queryToExport = `SELECT a as int_val, string_agg(random()::text, '') as text_val
      FROM generate_series(1, 5) a, generate_series(1, 50) b
      GROUP BY a ORDER BY a;`;

      const res = await db.exportData(
        "export-to-seafowl",
        {
          queries: [
            {
              source: {
                query: queryToExport,
              },
              destination: {
                schema: "madatdata_testing",
                table: destTable,
              },
            },
          ],
        },
        {
          seafowlInstance: {
            selfHosted: {
              url: SEAFOWL_DEST_URL,
              dbname: SEAFOWL_DEST_DBNAME,
              secret: SEAFOWL_DEST_SECRET,
            },
          },
        }
      );

      expect(
        (({ error, info }: typeof res) => ({
          error,
          info: {
            allFailed: info.allFailed,
            allPassed: info.allPassed,
            somePassed: info.somePassed,
            totalFailed: info.totalFailed,
            totalPassed: info.totalPassed,
          },
        }))(res)
      ).toMatchInlineSnapshot(`
        {
          "error": null,
          "info": {
            "allFailed": false,
            "allPassed": true,
            "somePassed": false,
            "totalFailed": 0,
            "totalPassed": 1,
          },
        }
      `);

      expect(res.response.passedJobs.queries.length).toEqual(1);
      expect(res.response.passedJobs.tables.length).toEqual(0);
      expect(res.response.passedJobs.vdbs.length).toEqual(0);

      expect(
        res.response.passedJobs.queries[0].result.response.exportFormat
      ).toEqual("sync");
      expect(res.response.passedJobs.queries[0].result.response.status).toEqual(
        "SUCCESS"
      );
      expect(
        res.response.passedJobs.queries[0].result.response.output.tables.length
      ).toEqual(1);

      const exportedTableTuple =
        res.response.passedJobs.queries[0].result.response.output.tables[0];

      const [
        exportedQuery,
        destDbname,
        destSchema,
        destTableName,
        ingestedParquetURL,
      ] = exportedTableTuple;

      expect(destTableName).toEqual(destTable);
      expect(destDbname).toEqual(SEAFOWL_DEST_DBNAME);

      expect({
        exportedQuery,
        destSchema,
      }).toMatchInlineSnapshot(`
        {
          "destSchema": "madatdata_testing",
          "exportedQuery": "SELECT a as int_val, string_agg(random()::text, '') as text_val
              FROM generate_series(1, 5) a, generate_series(1, 50) b
              GROUP BY a ORDER BY a",
        }
      `);

      expect(ingestedParquetURL.includes(".parquet")).toEqual(true);

      // PIGGYBACK on this test to also test pollDeferredTask case of a completd task
      const shouldBeCompletedTask = await db.pollDeferredTask(
        "export-to-seafowl",
        { taskId: res.response.passedJobs.queries[0].job.jobId as string }
      );

      expect(shouldBeCompletedTask.completed).toBe(true);
      expect(shouldBeCompletedTask.error).toBeNull();
      expect(shouldBeCompletedTask.info).not.toBeNull();
      expect(shouldBeCompletedTask.info?.jobStatus?.status).toBe(200);
      expect(shouldBeCompletedTask.response?.exportFormat).toBe("sync");
      expect(shouldBeCompletedTask.response?.status).toBe("SUCCESS");
      expect(typeof shouldBeCompletedTask.response?.started).toBe("string");
      expect(typeof shouldBeCompletedTask.response?.finished).toBe("string");

      const outputTable = (
        shouldBeCompletedTask.response?.output! as { tables: string[][] }
      )["tables"][0];

      const [
        inputQuery,
        outputDbName,
        outputSchema,
        outputTableName,
        intermediateParquetUrl,
      ] = outputTable;

      expect(inputQuery).toEqual(exportedQuery);
      expect(inputQuery).toMatchInlineSnapshot(`
        "SELECT a as int_val, string_agg(random()::text, '') as text_val
              FROM generate_series(1, 5) a, generate_series(1, 50) b
              GROUP BY a ORDER BY a"
      `);
      expect(outputDbName).toEqual(destDbname);
      expect(outputSchema).toEqual(destSchema);
      expect(outputTableName).toEqual(destTableName);
      expect(typeof intermediateParquetUrl).toBe("string");
      expect(intermediateParquetUrl.startsWith("https://")).toBe(true);
      expect(intermediateParquetUrl.includes(".parquet")).toBe(true);
    }, 60_000);
  }
);

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

    // PIGGYBACK on this test to also test pollDeferredTask (just like with export)
    // We wouldn't normally do this since we didn't defer the task and have already
    // awaited it, but since we know it's complete we can conveniently check the
    // test case of pollDeferredTask returning a completed task
    const shouldBeCompletedTask = await db.pollDeferredTask("csv", {
      // This is the hacky part, note that this didn't come from the return value
      taskId: info.jobStatus.taskId,
      namespace,
      repository: "dunno",
    });

    expect(shouldBeCompletedTask.completed).toBe(true);
    expect(shouldBeCompletedTask.error).toBeNull();
    expect(shouldBeCompletedTask.info?.jobStatus).not.toBeNull();
    expect(shouldBeCompletedTask.info?.jobLog).not.toBeNull();

    expect(shouldBeCompletedTask.response).not.toBeNull();
    expect(typeof shouldBeCompletedTask.response?.jobLog?.url).toEqual(
      "string"
    );
    expect(shouldBeCompletedTask.response?.jobStatus?.status).toEqual(
      "SUCCESS"
    );
    expect(shouldBeCompletedTask.response?.jobStatus?.taskId).toEqual(
      info.jobStatus.taskId
    );
    expect(shouldBeCompletedTask.response?.jobStatus?.isManual).toEqual(true);
    expect(typeof shouldBeCompletedTask.response?.jobStatus?.finished).toEqual(
      "string"
    );
    expect(typeof shouldBeCompletedTask.response?.jobStatus?.started).toEqual(
      "string"
    );
  }, 20_000);

  // NOTE: test assumes that the task hasn't completed by the time we send the first check
  it("upload starts a deferred task", async () => {
    const db = createRealDb();
    const { username: namespace } = await fetchToken(db);

    const { response, info, taskId } = await db.importData(
      "csv",
      { data: Buffer.from(`name;candies\r\nBob;5\r\nAlice;10`) },
      {
        tableName: `irrelevant-${randSuffix()}`,
        namespace,
        repository: "dunno",
        tableParams: {
          delimiter: ";",
        },
      },
      { defer: true }
    );

    expect(typeof taskId).toBe("string");
    expect(taskId?.length).toEqual(36);

    expect(taskId).toBeDefined();

    expect(response).toBeDefined();
    expect(info).toBeDefined();

    const startedTask = await db.pollDeferredTask("csv", {
      taskId: taskId as string,
      namespace,
      repository: "dunno",
    });

    expect(startedTask.completed).toBe(false);
    expect(startedTask.error).toBeNull();
    expect(startedTask.info).toBeNull();
    expect(startedTask.response?.jobStatus?.status).toBe("STARTED");
    expect(startedTask.response?.jobStatus?.finished).toBeNull();
    expect(startedTask.response?.jobStatus?.taskId).toEqual(taskId);
    expect(typeof startedTask.response?.jobStatus?.started).toEqual("string");
    expect(startedTask.response?.jobStatus?.finished).toBeNull();
    expect(startedTask.response?.jobStatus?.isManual).toEqual(true);
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
