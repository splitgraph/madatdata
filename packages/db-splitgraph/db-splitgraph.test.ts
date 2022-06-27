import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb } from "./db-splitgraph";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";
import { compose, graphql, rest, type DefaultBodyType } from "msw";

import { defaultHost } from "@madatdata/base-client/host";

import { faker } from "@faker-js/faker";

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
    const { mswServer, useKeyedMemo } = testCtx;

    const bodyMemo = useKeyedMemo!<string, null | DefaultBodyType>(
      "uploadedFile"
    );

    /** map of apiKey:apiSecret -> token */
    const accessTokenMemo = useKeyedMemo!<string, string>("tokens");
    /** map of taskId -> taskId (just identity right now) */
    const ingestionTaskIdMemo = useKeyedMemo!<string, string>("tasks");

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

          if (!accessTokenMemo.has(tokenKey)) {
            accessTokenMemo.set(tokenKey, makeFakeJwt());
          }

          return res(
            context.json({
              access_token: accessTokenMemo.get(tokenKey),
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
          ([_apiKeySecret, accessToken]) => {
            return accessToken === headerToken;
          }
        );

        if (!headerToken || !matchingToken) {
          return res(context.errors([{ message: "Invalid access token" }]));
        }

        // NOTE: Return void to continue to next resolver, "middleware style"
        return;
      }),
      graphql.mutation("StartExternalRepositoryLoad", (_req, res, context) => {
        const taskId = faker.datatype.uuid();
        ingestionTaskIdMemo.set(taskId, taskId);

        return res(
          context.data({
            startExternalRepositoryLoad: {
              taskId,
            },
          })
        );
      }),
      graphql.query<{ jobLogs: { url: string } }, { taskId: string }>(
        "JobLogsByTaskId",
        (req, res, context) => {
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
        }
      ),
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
              // FIXME: it's really TaskStatus (needs export from import-csv-plugin)
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
        return res(
          context.data({
            repositoryIngestionJobStatus: {
              nodes: [req.variables.taskId, "fake-prev-id"].map((taskId) => ({
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
    // await db.fetchAccessToken();
    // NOTE: not fetching access token here, just want to check response headers

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
    useKeyedMemo,
  }) => {
    const testMemo = useKeyedMemo!("uploadedFile");

    const db = createDb();
    await db.fetchAccessToken();

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
    await db.fetchAccessToken();

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
    await db.fetchAccessToken();

    const namespace = "miles";

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
    await db.fetchAccessToken();
    const namespace = "anything";

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

  it("returns error with bad access token", async () => {
    const db = createDb();
    await db.fetchAccessToken();

    db.setAuthenticatedCredential({ token: "bad-token", anonymous: false });

    const namespace = "miles";

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

const toBase64 = (input: string) =>
  Buffer.from(input, "binary").toString("base64");

const makeFakeJwt = () => {
  return [
    {
      alg: "RS256",
      typ: "JWT",
    },
    {
      nbf: faker.date.recent(1),
      email_verified: true,
      email: faker.internet.email(),
      iat: 1656361766,
      exp: 1656365366,
      user_id: "126f8ef3-db1f-4e09-8bcb-3caa9294293e",
      is_admin: true,
      grant: "access",
      username: "miles",
    },
  ]
    .map((o) => JSON.stringify(o))
    .concat("fakeSignature")
    .map(toBase64)
    .join(".");
};
