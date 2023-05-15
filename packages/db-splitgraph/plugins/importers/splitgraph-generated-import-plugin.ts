import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import type { ImportDestOptions } from "./base-import-plugin";

import { SplitgraphImportPlugin } from "./base-import-plugin";
import type { SplitgraphImportPluginOptions } from "./base-import-plugin";

interface GeneratedImportSourceOptions<PluginParamsSchema extends object> {
  params: PluginParamsSchema;
}

export function makeGeneratedImportPlugin<
  PluginName extends string,
  ParamsSchema extends object,
  TableParamsSchema extends object,
  CredentialsSchema extends object,
  ConcreteImportDestOptions extends ImportDestOptions<
    TableParamsSchema,
    CredentialsSchema
  > = ImportDestOptions<TableParamsSchema, CredentialsSchema>,
  ConcreteImportSourceOptions extends GeneratedImportSourceOptions<ParamsSchema> = GeneratedImportSourceOptions<ParamsSchema>
>(
  pluginName: PluginName
): new (opts: SplitgraphImportPluginOptions) => ImportPlugin<
  PluginName,
  ConcreteImportSourceOptions,
  ConcreteImportDestOptions
> &
  WithOptionsInterface<ImportPlugin<PluginName>> {
  class SplitgraphGeneratedImportPlugin
    extends SplitgraphImportPlugin<
      PluginName,
      ParamsSchema,
      TableParamsSchema,
      CredentialsSchema,
      SplitgraphGeneratedImportPlugin,
      ConcreteImportDestOptions,
      ConcreteImportSourceOptions
    >
    implements
      ImportPlugin<
        PluginName,
        ConcreteImportSourceOptions,
        ConcreteImportDestOptions
      >,
      WithOptionsInterface<SplitgraphGeneratedImportPlugin>
  {
    public readonly __name = pluginName;
    public static __name = pluginName;

    protected makeLoadMutationVariables(
      sourceOptions: ConcreteImportSourceOptions,
      destOptions: ConcreteImportDestOptions
    ) {
      return {
        params: JSON.stringify({
          ...sourceOptions.params,
        }),
        tables: [
          {
            name: destOptions.tableName,
            options: JSON.stringify({
              ...destOptions.tableParams,
            }),
            // TODO: allow user to specify schema in destOptions
            schema: [],
          },
        ],
        pluginName: "csv",
      };
    }
  }

  return SplitgraphGeneratedImportPlugin;
}
