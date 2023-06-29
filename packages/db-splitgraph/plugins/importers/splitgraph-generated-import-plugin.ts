import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";

import {
  DeferredSplitgraphImportTask,
  SplitgraphImportPlugin,
} from "./splitgraph-base-import-plugin";
import type { SplitgraphDestOptions } from "./splitgraph-base-import-plugin";
import type { SplitgraphImportPluginOptions } from "./splitgraph-base-import-plugin";

import type { ExternalTableColumnInput } from "../../gql-client/unified-types";
import type { DeferredTaskPlugin } from "@madatdata/base-db/base-db";

export interface BaseGeneratedImportSourceOptions<
  PluginParamsSchema extends object
> {
  params: PluginParamsSchema;
  sync?: boolean;
}

export interface GeneratedImportSourceOptionsWithInlineCredentialData<
  PluginParamsSchema extends object,
  PluginCredentialsSchema extends object
> extends BaseGeneratedImportSourceOptions<PluginParamsSchema> {
  credentials: PluginCredentialsSchema;
}

export interface GeneratedImportSourceOptionsWithSavedCredentialId<
  PluginParamsSchema extends object
> extends BaseGeneratedImportSourceOptions<PluginParamsSchema> {
  credentialId: string;
}

export type GeneratedImportSourceOptions<
  PluginParamsSchema extends object,
  PluginCredentialsSchema extends object
> =
  | GeneratedImportSourceOptionsWithInlineCredentialData<
      PluginParamsSchema,
      PluginCredentialsSchema
    >
  | GeneratedImportSourceOptionsWithSavedCredentialId<PluginParamsSchema>;

export interface GeneratedImportDestOptions<TableParamsSchema extends object>
  extends SplitgraphDestOptions {
  tables?: {
    name: string;
    options: TableParamsSchema;
    /**
     * Array containing which columns to include in the ingestion. Set to an
     * empty array (`[]`) to default to including all columns.
     * */
    schema: ExternalTableColumnInput[];
  }[];
}

export function makeGeneratedImportPlugin<
  PluginName extends string,
  ParamsSchema extends object,
  TableParamsSchema extends object,
  CredentialsSchema extends object,
  ConcreteImportDestOptions extends GeneratedImportDestOptions<TableParamsSchema> = GeneratedImportDestOptions<TableParamsSchema>,
  ConcreteImportSourceOptions extends GeneratedImportSourceOptions<
    ParamsSchema,
    CredentialsSchema
  > = GeneratedImportSourceOptions<ParamsSchema, CredentialsSchema>
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
      Record<string, unknown>,
      Awaited<ReturnType<ImportPlugin<PluginName>["importData"]>>,
      ConcreteImportDestOptions,
      ConcreteImportSourceOptions
    >
    implements
      ImportPlugin<
        PluginName,
        ConcreteImportSourceOptions,
        ConcreteImportDestOptions
      >,
      DeferredTaskPlugin<PluginName, DeferredSplitgraphImportTask>,
      WithOptionsInterface<SplitgraphGeneratedImportPlugin>
  {
    public readonly __name = pluginName;
    public static __name = pluginName;

    protected makeLoadMutationVariables(
      sourceOptions: ConcreteImportSourceOptions,
      destOptions: ConcreteImportDestOptions
    ) {
      // NOTE: only need to return variables that aren't already defaulted e.g. from destOptions
      //       which is why we can skip namespace, repository, and pluginName
      return {
        params: JSON.stringify({
          ...sourceOptions.params,
        }),
        tables: destOptions.tables ?? [],
        credentialData:
          "credentials" in sourceOptions
            ? JSON.stringify(sourceOptions.credentials)
            : undefined,
        credentialId:
          "credentialId" in sourceOptions
            ? sourceOptions.credentialId
            : undefined,
        sync: "sync" in sourceOptions ? sourceOptions.sync : undefined,
      };
    }
  }

  return SplitgraphGeneratedImportPlugin;
}
