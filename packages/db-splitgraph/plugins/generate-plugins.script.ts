import { compile } from "json-schema-to-typescript";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { request, gql } from "graphql-request";

if (!import.meta.url.startsWith("file://")) {
  throw new Error("unexpected import.meta.url (doesn't start with file://)");
}

const thisSourceFileDir = path.dirname(new URL(import.meta.url).pathname);
const targetDir = path.join(thisSourceFileDir, "importers", "generated");

const generateTypes = async () => {
  const allPlugins = await fetchSchemas();

  for (let plugin of allPlugins.externalPlugins) {
    log("generateTypes:", plugin.pluginName);
    let pluginTargetDir = path.join(targetDir, plugin.pluginName);

    log("mkdir:", fdir(pluginTargetDir));
    await mkdir(pluginTargetDir, { recursive: true });

    let schemas = [
      [plugin.credentialsSchema, "CredentialsSchema"],
      [plugin.paramsSchema, "ParamsSchema"],
      [plugin.tableParamsSchema, "TableParamsSchema"],
    ];

    for (let [schema, schemaName] of schemas) {
      let schemaOutFile = path.join(pluginTargetDir, `${schemaName}.ts`);

      let generatedTypescript = await compile(
        // @ts-ignore-error Some jsonschema issues, apparently with array items
        schema,
        plugin.pluginName
      );

      log("write schema:", fdir(schemaOutFile));
      await writeFile(schemaOutFile, generatedTypescript);
    }
  }
};

const fetchSchemas = async () => {
  const endpoint = `https://api.splitgraph.com/gql/cloud/unified/graphql`;
  const query = gql`
    fragment PluginBase on ExternalPlugin {
      pluginName
      name
      description
      supportsMount
      supportsSync
      supportsLoad
      marketingSlug
      canonicalDataSourceName
      paramsSchema
      credentialsSchema
      tableParamsSchema
    }

    fragment Plugin on ExternalPlugin {
      ...PluginBase
    }

    query GetAllPlugins {
      externalPlugins {
        ...Plugin
      }
    }
  `;

  return request(endpoint, query);
};

const run = async () => {
  await generateTypes();
};

const log = (...args: any[]) => console.log(...args);
const fdir = (longDir: string) => path.relative(process.cwd(), longDir);

run()
  .then(() => {
    console.log("Done");
  })
  .catch(console.error);
