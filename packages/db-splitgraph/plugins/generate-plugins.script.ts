import { compile } from "json-schema-to-typescript";
import { generateName } from "json-schema-to-typescript/dist/src/utils";
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

  // Store set of used interface names to ensure global uniqueness so that we
  // can export * from generated files. However, note this may not work because
  // the intermediate types are also exported, and those will have collisions
  const usedInterfaceNames = new Set<string>();

  // Set of plugin class names (same comment as above applies, i.e. uniqueness is expected anyway)
  const usedPluginClassNames = new Set<string>();

  for (let plugin of allPlugins.externalPlugins) {
    log("generateTypes:", plugin.pluginName);
    let pluginTargetDir = path.join(targetDir, plugin.pluginName);

    log("mkdir:", fdir(pluginTargetDir));
    await mkdir(pluginTargetDir, { recursive: true });

    let schemas: [schema: any, schemaName: string, interfaceName: string][] = [
      [plugin.credentialsSchema, "CredentialsSchema"],
      [plugin.paramsSchema, "ParamsSchema"],
      [plugin.tableParamsSchema, "TableParamsSchema"],
    ].map(([schema, schemaName]) => [
      schema,
      schemaName,
      (() => {
        // Generate a name that's safe for interface type name and hasn't been used yet
        // We don't expect collisions, since pluginName is unique, but just in case
        const interfaceName = generateName(
          plugin.pluginName + schemaName,
          usedInterfaceNames
        );
        usedInterfaceNames.add(interfaceName);

        return interfaceName;
      })(),
    ]);

    for (let [schema, schemaName, interfaceName] of schemas) {
      let schemaOutFile = path.join(pluginTargetDir, `${schemaName}.ts`);
      log("interfaceName:", interfaceName);

      let generatedTypescript = await compile(schema, interfaceName, {
        strictIndexSignatures: true,
      });

      log("write schema:", fdir(schemaOutFile));
      await writeFile(schemaOutFile, generatedTypescript);
    }

    const [
      [_cs, _csn, credentialsSchemaInterfaceName],
      [_ps, _psn, paramsSchemaInterfaceName],
      [_tps, _tpsn, tableParamsSchemaInterfaceName],
    ] = schemas;

    // NOTE: Concatenate "Splitgraph" outside of generated name to ensure PascalCasing
    // (otherwise we get "SplitgraphairbyteGitHubImportPlugin" instead of "SplitgraphAirbyteGitHubImportPlugin")
    let pluginClassName =
      "Splitgraph" +
      generateName(plugin.pluginName + "ImportPlugin", usedPluginClassNames);
    let pluginOutFile = path.join(pluginTargetDir, "plugin.ts");

    log("create plugin: ", pluginClassName, "in", pluginOutFile);

    await writeFile(
      pluginOutFile,
      `/** Auto-generated plugin **/

import type { ${paramsSchemaInterfaceName} } from "./ParamsSchema";
import type { ${tableParamsSchemaInterfaceName} } from "./TableParamsSchema";
import type { ${credentialsSchemaInterfaceName} } from "./CredentialsSchema";
import { makeGeneratedImportPlugin } from "../../splitgraph-generated-import-plugin";

export const ${pluginClassName} = makeGeneratedImportPlugin<
  "${plugin.pluginName}",
  ${paramsSchemaInterfaceName},
  ${tableParamsSchemaInterfaceName},
  ${credentialsSchemaInterfaceName}
>("${plugin.pluginName}");

`
    );
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
