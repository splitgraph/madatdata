import { CommandLineAction } from "@rushstack/ts-command-line";
import chalk from "chalk";
import path from "path";

import { parseNative, type TSConfckParseNativeResult } from "tsconfck";

import { graphviz } from "@hpcc-js/wasm";

import { WalkBuilder, walkAsync, walk } from "walkjs";

import Graph from "graphology";
import renderGraphToSVG from "graphology-svg";
import xxx from "graphology-graphml";

// type TSConfckParseNativeResult;

export class CheckGlobPatternsAction extends CommandLineAction {
  persistentBrowserSessionId: string = "debugging";

  public constructor() {
    super({
      actionName: "check-glob-patterns",
      summary: "Static analysis step for validating cross-config glob patterns",
      documentation:
        "Run this script after changing glob patterns in any of" +
        "tsconfig.*json, wireit config, codegen config, test config, etc." +
        " - it will make sure that unavoidably non-DRY glob patterns match correctly",
    });
  }

  protected onDefineParameters(): void {
    // stub (abstract method required)
  }

  protected async onExecute(): Promise<void> {
    const projectConfig = await getProjectConfig();

    await checkGlobPatterns({
      projectConfig,
    });
  }
}

// TODO: async for now so that later it can get cdp uuid from another process
type RootMetadata = {
  rootFile: string;
  tsconfck: TSConfckParseNativeResult;
  confCache: Map<string, TSConfckParseNativeResult>;
};

export const getProjectConfig = async () => {
  const yarnConfig = getYarnEnvironmentVariables();

  if (!yarnConfig.PROJECT_CWD) {
    throw "Missing PROJECT_CWD variable. Make sure you're running this script with Yarn.";
  }

  const rootFiles = ["tsconfig.json", "tsconfig.build.json"];

  return {
    yarn: yarnConfig,
    ts: {
      roots: await Promise.all(
        rootFiles
          .map((rootFileBaseName) =>
            path.join(yarnConfig.PROJECT_CWD, rootFileBaseName)
          )
          .map((rootFile) =>
            (async () => {
              // a cache for each root, to use now and to return for use later
              // assume 1 root = 1 tsbuildconfig, so need unique cache for each
              const perRootCache = new Map<string, TSConfckParseNativeResult>();

              return {
                rootFile,
                tsconfck: await parseNative(rootFile, { cache: perRootCache }),
                confCache: perRootCache,
              } as RootMetadata;
            })()
          )
      ),
    },
  };
};

// interface TSLookupTable<ConcreteProjectConfig extends ProjectConfig> {
//   []
// }

// type TSLookupTable = Map<tsconfigFile: string>;

// const makeTSReferenceLookupTable = (projectConfig: ProjectConfig["ts"]["roots"]): Map<string, TSConfckParseNativeResult> {

// }

type ProjectConfig = Unpromise<ReturnType<typeof getProjectConfig>>;

type CheckGlobPatternsOpts = {
  projectConfig: ProjectConfig;
};

const checkGlobPatterns = async ({ projectConfig }: CheckGlobPatternsOpts) => {
  // console.log(JSON.stringify(projectConfig, null, 2));

  // console.log("Got project config or whatever");

  // await tryGraphvizWasm();

  // await walkReferences(projectConfig.ts.roots[1]);
  try {
    const dot = graphReferences(projectConfig.ts.roots[0]);
    const svg = await graphviz.layout(dot, "svg", "dot");
    console.log(svg);
  } catch (err) {
    console.error(err);
  }

  await Promise.resolve();
  // await new Promise((r) => setTimeout(() => r("cya"), 2000)).then(console.log);
};

const relPath = (
  absolutePath: string,
  { rootFile }: Pick<RootMetadata, "rootFile">
) => {
  const projectDir = process.env.PROJECT_CWD;
  if (!projectDir) {
    throw "normalizePath failed, missing PROJECT_CWD. script should be executed with yarn";
  }

  if (!absolutePath.startsWith(projectDir)) {
    throw `error normalizing path, <${absolutePath}> does not start with <${projectDir}>`;
  }

  return (
    absolutePath
      .replace(projectDir, "")
      // .replace(new RegExp(`/${rootFile}$`), "")
      .replace(/\/tsconfig\.json$/, "")
      .replace("/packages/", "@madatdata/")
  );
};

const graphReferences = ({ confCache, rootFile, tsconfck }: RootMetadata) => {
  const graph = new Graph();

  for (const [tsconfigFilePath, tsconfck] of confCache.entries()) {
    // console.log(tsconfigFilePath);
    // continue;

    if (tsconfigFilePath !== tsconfck["tsconfigFile"]) {
      throw 'broken assumption: tsconfigFilePath !== tsconfg["tsconfigFile"]';
    }

    // const tsconfigRelPath = normalizePath(tsconfigFilePath, );

    graph.updateNode(tsconfigFilePath);

    if (tsconfck.referenced) {
      for (let reference of tsconfck.referenced) {
        graph.updateNode(reference.tsconfigFile);
        graph.addEdge(tsconfigFilePath, reference.tsconfigFile);
      }
    } else if (tsconfck.result.projectReferences) {
      // console.log(Object.keys(tsconfck.result));
      for (let { path } of tsconfck.result.projectReferences) {
        if (!confCache.has(path)) {
          // throw `error in ${tsconfigFilePath}: unknown reference: ${path}`;
          console.warn(`${tsconfigFilePath}: unknown reference: ${path}`);
          graph.updateEdge(tsconfigFilePath, path);
        } else {
          // console.log("referenced:", path);
          graph.addEdge(tsconfigFilePath, path);
        }
      }
    }
    // if (tsconfigFilePath !== tsconfck["tsconfigFile"]) {
    //   console.log("mismatch");
    // }
    // console.log(Object.keys(tsconfck).join("--"));

    // console.log(tsconfck["tsconfigFile"]);
    // if (!Object.keys(tsconfck).includes("referenced")) {
    //   console.log("resul:", tsconfck["referenced"]);

    //   console.log(tsconfck["result"]);
    // }

    // let confck = confCache.get(tsconfigFilePath);

    // if
  }

  const presumablyRootKey = Array.from(confCache.keys()).filter(
    (k) => !relPath(k, { rootFile })
  );
  if (!!presumablyRootKey) {
    try {
      graph.dropNode(presumablyRootKey);
    } catch (err) {
      console.warn("Failed to drop root node:", err);
    }
  }

  const exportedGraph = graph.export();

  // console.log(JSON.stringify(exportedGraph, null, 2));

  const dot = `
digraph tsconfig {
    fontname="Helvetica,Arial,sans-serif"
    node [fontname="Helvetica,Arial,sans-serif"]
    edge [fontname="Helvetica,Arial,sans-serif"]
    node [shape=box];

  ${exportedGraph.nodes
    .map(({ key }) => `"${key}" [label="${relPath(key, { rootFile })}"]`)
    .join("\n    ")}

  ${exportedGraph.edges
    .map((edge) => `"${edge.source}" -> "${edge.target}"`)
    .join("\n    ")}
}
  `;

  // console.log(dot);

  return dot;

  // for (let edge of exportedGraph.edges) {

  // }

  // renderGraphToSVG(graph, "./graph.svg", {}, () => console.log("done rnder"));
};

const walkReferences = async ({
  confCache,
  rootFile,
  tsconfck,
}: RootMetadata) => {
  // console.log("start walk");

  // console.log("walk tsconfck:", tsconfck);

  // console.log("Cached keys:", Array.from(confCache.keys()).join("\n    "));

  const sampleKey =
    "/Users/mjr/exp/madatdata/packages/react/tsconfig.build.json";
  console.log(sampleKey);

  const sampleConf = confCache.get(sampleKey);

  console.log(sampleConf);

  // debugger;

  return Promise.resolve(true);

  // debugger;

  try {
    await walkAsync(tsconfck, {
      graphMode: "infinite",
      callbacks: [
        {
          keyFilters: ["referenced", "references", "tsconfigFile"],
          nodeTypeFilters: ["array"],
          // filters: [(node) => !node.val || !node.val.tsConfigFile],
          // filters: [(node) => !!node.val],
          callback: async (node) => {
            const val = node.val as TSConfckParseNativeResult;

            // console.log("------");
            // console.table({ key: node.key, id: node.id });

            // const path = node.getPath(
            //   (node) => `(${Object.keys(node).join(",")})${node.key}`
            // );

            // if (!val.tsconfigFile) {
            //   return;
            // }

            // node.val
            console.log(val.map((vv) => Object.keys(vv).join(",")).join(";"));
            for (let ancestor of node.getAncestors()) {
              if (!Object.keys(ancestor.val).includes("tsconfigFile")) {
                continue;
              }

              let ancestorVal = ancestor.val as TSConfckParseNativeResult;

              // console.log("    ancestor:", Object.keys(ancestorVal));

              console.log("    ancestor:", ancestorVal.tsconfigFile);
            }

            // const path = node.getPath((node) =>
            //   node.parent?.key === "referenced"
            //     ? Object.keys(node.parent.val).join(",")
            //     : node.parent?.key === "references"
            //     ? "/references"
            //     : node.parent?.key === "tsconfigFile"
            //     ? "/" + `${node.parent.val}`
            //     : "/unknown"
            // );

            // console.log(path);
            // console.log("------");

            // if (val.tsconfigFile) {
            //   console.log("node:", val);
            // } else {
            //   console.log(Object.keys(val));
            // }

            // console.log("node:", val);
          },
        },
      ],
    });
  } catch (err) {
    console.error(err);
  }

  console.log("done walking");

  return Promise.resolve();
};

const tryGraphvizWasm = async () => {
  const dot = `
            digraph G {
                node [shape=rect];

                subgraph cluster_0 {
                    style=filled;
                    color=lightgrey;
                    node [style=filled,color=white];
                    a0 -> a1 -> a2 -> a3;
                    label = "Hello";
                }

                subgraph cluster_1 {
                    node [style=filled];
                    b0 -> b1 -> b2 -> b3;
                    label = "World";
                    color=blue
                }

                start -> a0;
                start -> b0;
                a1 -> b3;
                b2 -> a3;
                a3 -> a0;
                a3 -> end;
                b3 -> end;

                start [shape=Mdiamond];
                end [shape=Msquare];
            }
        `;

  const svg = await graphviz.layout(dot, "svg", "dot");

  console.log(svg);
};

/**
 * Return the values of all environment variables known to be set by Yarn
 * @see https://yarnpkg.com/advanced/lifecycle-scripts#environment-variables
 */
const getYarnEnvironmentVariables = (): YarnEnvironmentVariables => {
  return {
    INIT_CWD: process.env.INIT_CWD,
    PROJECT_CWD: process.env.PROJECT_CWD,
    npm_package_name: process.env.npm_package_name,
    npm_package_version: process.env.npm_package_version,
    npm_execpath: process.env.npm_execpath,
    npm_node_execpath: process.env.npm_node_execpath,
    npm_lifecycle_event: process.env.npm_lifecycle_event,
    npm_config_user_agent: process.env.npm_config_user_agent,
  };
};

interface YarnEnvironmentVariables {
  /**
   * `INIT_CWD` represents the directory from which the script has been
   * invoked. This isn't the same as the cwd, which for scripts is always
   * equal to the closest package root.
   */
  INIT_CWD: string;
  /**
   * `PROJECT_CWD` is the root of the project on the filesystem.
   * */
  PROJECT_CWD: string;
  /**
   * `npm_package_name` is the name of the package that lists the script
   * being executed.
   */
  npm_package_name: string;
  /**
   * `npm_package_version` is the version of the package that lists the
   * script being executed.
   */
  npm_package_version: string;
  /**
   * `npm_execpath` is the path to the Yarn binary.
   */
  npm_execpath: string;
  /**
   * `npm_node_execpath` is the path to the Node binary.
   */
  npm_node_execpath: string;
  /**
   * `npm_config_user_agent` is a string defining the Yarn version currently
   * in use.
   */
  npm_config_user_agent: string;
  /**
   * `npm_lifecycle_event` is the name of the script or lifecycle event, if
   * relevant.
   */
  npm_lifecycle_event?: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends YarnEnvironmentVariables {}
  }
}

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/** UTILITY: Expand object types recursively (do not use in production) */
type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;
