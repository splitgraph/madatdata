import { compile } from "json-schema-to-typescript";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import allPlugins from "./all-plugin-schemas.json";

if (!import.meta.url.startsWith("file://")) {
  throw new Error("unexpected import.meta.url (doesn't start with file://)");
}

const thisSourceFileDir = path.dirname(new URL(import.meta.url).pathname);
const targetDir = path.join(thisSourceFileDir, "importers", "generated");

const generateTypes = async () => {
  for (let plugin of allPlugins.data.externalPlugins) {
    log("generateTypes:", plugin.pluginName);
    let pluginTargetDir = path.join(targetDir, plugin.pluginName);

    log("mkdir:", fdir(pluginTargetDir));
    await mkdir(pluginTargetDir, { recursive: true });

    let schemas = [
      [plugin.credentialsSchema, "CredentialsSchema"],
      [plugin.paramsSchema, "ParamsSchema"],
      [plugin.tableParamsSchema, "TableParamsSchema"],
    ];

    // let barrelFile = path.join(pluginTargetDir, "index.ts");
    // let barrelExports = [];

    for (let [schema, schemaName] of schemas) {
      let schemaOutFile = path.join(pluginTargetDir, `${schemaName}.ts`);

      let generatedTypescript = await compile(
        // @ts-ignore-error Some jsonschema issues, apparently with array items
        schema,
        plugin.pluginName
      );

      // barrelExports.push(`export * from "./${schemaName}";`);

      log("write schema:", fdir(schemaOutFile));
      await writeFile(schemaOutFile, generatedTypescript);
    }

    // log("write barrel:", fdir(barrelFile), "\n");
    // await writeFile(barrelFile, barrelExports.join("\n"));
  }
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
