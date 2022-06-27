import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb } from "./db-splitgraph";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";
import { compose, graphql, rest, type DefaultBodyType } from "msw";

import { defaultHost } from "@madatdata/base-client/host";

describe("importData", () => {
  it("returns false for unknown plugin", async () => {
    const db = makeDb({});

    // @ts-expect-error not a key in SplitgraphPluginMap
    const importResult = await db.importData("unknown-doesnotexist", {}, {});
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
    plugins: {
      csv: new ImportCSVPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
        transformRequestHeaders,
      }),
    },
  });
};

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
    plugins: {
      csv: new ImportCSVPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
      }),
    },
  });
};

// Useful when writing initial tests against real server (where anon is allowed)
// const _makeAnonymousDb = () => {
//   return makeDb({
//     plugins: {
//       csv: new ImportCSVPlugin({
//         graphqlEndpoint: defaultHost.baseUrls.gql,
//       }),
//     },
//   });
// };

// FIXME: most of this block is graphql client implementation details
describe("importData for ImportCSVPlugin", () => {
  setupMswServerTestHooks();
  setupMemo();

  const namespace = "miles";

  beforeEach((testCtx) => {
    const {
      mswServer,
      useTestMemo,
      meta: { id: testId },
    } = testCtx;

    const bodyMemo = useTestMemo!<string, null | DefaultBodyType>();

    mswServer?.use(
      graphql.query("CSVURLs", (req, res, context) => {
        const reqId = bodyMemo.setWithRandomId(null);

        return res(
          // FIXME: msw handlers should be factored into a common place
          compose(
            context.data({
              csvUploadDownloadUrls: {
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

            // @ts-expect-error Types a bite too wide
            return res(context.body(uploadedBody));
          }
        }
      ),
      graphql.mutation("StartExternalRepositoryLoad", (req, res, context) => {
        return res(
          context.data({
            startExternalRepositoryLoad: {
              taskId: "fakeuuid-0bc2-4932-baca-39b000d8b111",
            },
          })
        );
      }),
      graphql.query<{ jobLogs: { url: string } }, { taskId: string }>(
        "JobLogsByTaskId",
        (req, res, context) => {
          return res(
            context.data({
              jobLogs: {
                url:
                  "https://data.splitgraph.com:9000/fake-logs-for-task" +
                  req.variables.taskId,
              },
            })
          );
        }
      ),
      graphql.query("RepositoryIngestionJobStatus", (req, res, context) => {
        return res(
          context.data({
            repositoryIngestionJobStatus: {
              nodes: [
                "fakeuuid-0bc2-4932-baca-39b000d8b111",
                "fake-prev-id",
              ].map((taskId) => ({
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
    const { info } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "irrelevant", namespace, repository: "dunno" }
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

    const { info: oldCredInfo } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "irrelevant", namespace, repository: "dunno" }
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
      { tableName: "irrelevant", namespace, repository: "dunno" }
    );
    expect(info?.presigned?.headers.get("test-echo-x-api-key")).toEqual("jjj");
    expect(info?.presigned?.headers.get("test-echo-x-api-secret")).toEqual(
      "ccc"
    );
  });

  it("returns expected graphql response (will change during tdd)", async ({
    useTestMemo,
  }) => {
    const testMemo = useTestMemo!();

    const db = createDb();

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
    useTestMemo,
  }) => {
    const testMemo = useTestMemo!();
    const db = createDb();

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
});

describe.skip("without msw", () => {
  const namespace = "miles";

  it("uploads", async () => {
    const db = createRealDb();
    await db.fetchAccessToken();

    const { response, error, info } = await db.importData(
      "csv",
      { data: Buffer.from(`name,candies\r\nBob,5`) },
      { tableName: "irrelevant", namespace, repository: "dunno" }
    );

    expect((response as any)?.success).toEqual(true);

    // expect({
    //   response,
    //   error,
    //   info: { jobStatus: info?.jobStatus, jobLog: info?.jobLog },
    // }).toMatchInlineSnapshot(`
    //   {
    //     "error": {
    //       "pending": false,
    //       "success": false,
    //     },
    //     "info": {
    //       "jobLog": {
    //         "url": "https://data.splitgraph.com:9000/ingestion-logs/miles/dunno/de80f38b-9db8-4f39-93a4-96380ca99206?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioclient%2F20220624%2Fus-east%2Fs3%2Faws4_request&X-Amz-Date=20220624T192911Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=e35abc98667d295c20671d95be8dd88616881a7309b224f2b98b57c993f7b752",
    //       },
    //       "jobStatus": {
    //         "finished": "2022-06-24T19:29:11.584484",
    //         "isManual": true,
    //         "started": "2022-06-24T19:29:11.45737",
    //         "status": "FAILURE",
    //         "taskId": "de80f38b-9db8-4f39-93a4-96380ca99206",
    //       },
    //     },
    //     "response": {
    //       "success": false,
    //     },
    //   }
    // `);

    // expect({ response, error, info }).toMatchInlineSnapshot();

    // expect(response instanceof Response).toBe(false);
    // expect((response as any)?.success).toBe(true);

    // console.log(await response?.text());
    console.error(error);

    // const info.uploadedto;

    // const download = `https://data.splitgraph.com:9000/fake-url-download?key=${testMemo?.lastKey}`;

    // const resulting = await fetch(download).then((response) => response.text());

    // expect(resulting).toMatchInlineSnapshot(`
    //   "name,candies
    //   Bob,5
    //   Alice,6
    //   Mallory,0"
    // `);
  }, 20_000);
});
