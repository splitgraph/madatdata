import type { AirbyteGithubParamsSchema } from "./generated/airbyte-github/ParamsSchema";
import type { AirbyteGithubTableParamsSchema } from "./generated/airbyte-github/TableParamsSchema";
import type { AirbyteGithubCredentialsSchema } from "./generated/airbyte-github/CredentialsSchema";

import { makeGeneratedImportPlugin } from "./splitgraph-generated-import-plugin";

// import type { ImportDestOptions } from "./base-import-plugin";
// import { SplitgraphImportCSVPlugin } from "./splitgraph-import-csv-plugin";

export const AirbyteGithubImportPlugin = makeGeneratedImportPlugin<
  "airbyte-github",
  AirbyteGithubParamsSchema,
  AirbyteGithubTableParamsSchema,
  AirbyteGithubCredentialsSchema
>("airbyte-github");

// const plugin = new AirbyteGithubImportPlugin({
//   graphqlEndpoint: "http://localhost:8080/v1alpha1/graphql",
//   transformRequestHeaders: (headers) => headers,
// });

// const xxx = plugin.__name;

// await plugin.importData({params: { }})

// await plugin.importData()

// plugin.importData()

// const csvplugin = new SplitgraphImportCSVPlugin({
//   graphqlEndpoint: "http://localhost:8080/v1alpha1/graphql",
//   transformRequestHeaders: (headers) => headers,
// });

// plugin.importData("")
