import { execute } from "@yarnpkg/shell";
import { PassThrough } from "stream";

const main = async () => {
  await setRegistry("http://localhost:4873");
};

const setRegistry = async (registry) => {
  const tempYarnConfig = await makeTemporaryConfig();

  if (registry.startsWith("http://localhost")) {
    await setLocalHTTPRegistry(tempYarnConfig, registry);
  }

  // console.log("tempYarnConfig is:", tempYarnConfig);

  // process.exitCode = await execute(`TMP_YARN_CONFIG=$(mktemp) ; cp $(yarn config get rcFilename) $TMP_YARN_CONFIG ; echo "$TMP_CONFIG"`, [
  //   registry
  // ]);
};

const setLocalHTTPRegistry = async (tempYarnConfig, registry) => {
  await captureExec(
    "yarn",
    [
      "config",
      "set",
      "npmScopes",
      "--json",
      JSON.stringify({
        madatdata: {
          npmRegistryServer: registry,
          npmPublishRegistry: registry,
          npmAuthIdent: "test:test",
        },
      }),
    ],
    { env: { ...process.env, YARN_RC_FILENAME: tempYarnConfig } }
  );

  await captureExec(
    "yarn",
    [
      "config",
      "set",
      "unsafeHttpWhitelist",
      "--json",
      JSON.stringify(["localhost"]),
    ],
    { env: { ...process.env, YARN_RC_FILENAME: tempYarnConfig } }
  );
};

const makeTemporaryConfig = async (
  tempYarnConfig = ".yarnrc-publish.tmp.yml"
) => {
  const {
    stdout: rimrafOut,
    stderr: rimrafErr,
    exitCode: rimrafExit,
  } = await captureExec(`yarn rimraf ${tempYarnConfig}`);

  console.table({ rimrafOut, rimrafErr, rimrafExit });

  const { stdout: curYarnConfig } = await captureExec(
    `yarn config get rcFilename`
  );

  console.log("yempYarnConfig:", tempYarnConfig);

  await captureExec(`cp $0 $1`, [curYarnConfig, tempYarnConfig]);

  return tempYarnConfig;
};

const captureExec = async (command, args, opts) => {
  if (!args) {
    args = [];
  }

  if (!opts) {
    opts = {};
  }

  const interleavedChunks = [];

  const stdoutChunks = [];
  const stdout = new PassThrough();
  stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk);
    interleavedChunks.push(chunk);
  });
  opts.stdout = stdout;

  const stderrChunks = [];
  const stderr = new PassThrough();
  stderr.on("data", (chunk) => {
    stderrChunks.push(chunk);
    interleavedChunks.push(chunk);
  });
  opts.stderr = stderr;

  const exitCode = await execute(command, args, opts);

  const buffered = {
    stdout: Buffer.concat(stdoutChunks).toString(),
    stderr: Buffer.concat(stdoutChunks).toString(),
    interleaved: Buffer.concat(interleavedChunks).toString(),
  };

  if (exitCode > 0) {
    console.error("Error in captureExec, exitCode = ", exitCode);
    console.log(buffered.interleaved);
    process.exit(exitCode);
  }

  return {
    exitCode,
    ...buffered,
  };
};

await main();

// process.on("exit", (code) => {

// })
