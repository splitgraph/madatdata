import { gql } from "graphql-request";
import type { ExportPlugin } from "@madatdata/base-db/base-db";
import { SplitgraphExportPlugin } from "./splitgraph-base-export-plugin";
import type { WithOptionsInterface } from "@madatdata/base-db/plugin-bindings";
import type {
  SeafowlExportQuerySourceDestinationTupleInput,
  SeafowlExportTableSourceDestinationTupleInput,
  SeafowlExportVdbSourceDestinationTupleInput,
  SeafowlInstanceExportInput,
} from "../../gql-client/unified-types";
import type {
  StartExportToSeafowlJobMutation,
  StartExportToSeafowlJobMutationVariables,
} from "./splitgraph-export-to-seafowl-plugin.generated";

// TODO: manually expand these types so we can add more informative typedocs to them
type ExportToSeafowlSourceOptions = {
  tables?: ExpandRecursively<SeafowlExportTableSourceDestinationTupleInput>[];
  queries?: ExpandRecursively<SeafowlExportQuerySourceDestinationTupleInput>[];
  vdbs?: ExpandRecursively<SeafowlExportVdbSourceDestinationTupleInput>[];
};

type ExportToSeafowlDestOptions = {
  seafowlInstance?: ExpandRecursively<SeafowlInstanceExportInput>;
};

type JobResult = Awaited<
  ReturnType<(typeof SplitgraphExportPlugin)["prototype"]["waitForTask"]>
>;

export class SplitgraphExportToSeafowlPlugin
  extends SplitgraphExportPlugin<
    "export-to-seafowl",
    SplitgraphExportToSeafowlPlugin,
    ExportToSeafowlSourceOptions,
    ExportToSeafowlDestOptions,
    Record<string, unknown>,
    Awaited<ReturnType<ExportPlugin<"export-to-seafowl">["exportData"]>>
  >
  implements
    ExportPlugin<"export-to-seafowl">,
    WithOptionsInterface<SplitgraphExportToSeafowlPlugin>
{
  public readonly __name = "export-to-seafowl";
  public static readonly __name = "export-to-seafowl";

  async exportData(
    sourceOptions: ExportToSeafowlSourceOptions,
    destOptions: ExportToSeafowlDestOptions
  ) {
    const {
      response: startExportResponse,
      error: startExportError,
      info: startExportInfo,
    } = await this.startExport(sourceOptions, destOptions);

    // Bail out if error, or response missing, or any fields missing from response
    // Note that the fields might be empty lists, but we still expect them to be set
    if (
      startExportError ||
      !startExportResponse ||
      !startExportResponse.exportToSeafowl.queries ||
      !startExportResponse.exportToSeafowl.tables ||
      !startExportResponse.exportToSeafowl.vdbs
    ) {
      return {
        response: startExportResponse ?? null,
        error: startExportError ?? null,
        info: {
          ...startExportInfo,
        },
      };
    }

    const {
      queries: queryExportJobs,
      tables: tableExportJobs,
      vdbs: vdbExportJobs,
    } = startExportResponse.exportToSeafowl;

    const passedJobs: {
      queries: {
        job: (typeof queryExportJobs)[number];
        result: JobResult;
      }[];
      tables: {
        job: (typeof tableExportJobs)[number];
        result: JobResult;
      }[];
      vdbs: {
        job: (typeof vdbExportJobs)[number];
        result: JobResult;
      }[];
    } = {
      queries: [],
      tables: [],
      vdbs: [],
    };

    const failedJobs: typeof passedJobs = {
      queries: [],
      tables: [],
      vdbs: [],
    };

    const queryExportPromises = queryExportJobs.map((job) =>
      this.waitForTask(job.jobId).then((result) =>
        (result.response?.status === "SUCCESS"
          ? passedJobs
          : failedJobs
        ).queries.push({ job, result })
      )
    );
    const tableExportPromises = tableExportJobs.map((job) =>
      this.waitForTask(job.jobId).then((result) =>
        (result.response?.status === "SUCCESS"
          ? passedJobs
          : failedJobs
        ).tables.push({ job, result })
      )
    );
    const vdbExportPromises = vdbExportJobs.map((job) =>
      this.waitForTask(job.jobId).then((result) =>
        (result.response?.status === "SUCCESS"
          ? passedJobs
          : failedJobs
        ).vdbs.push({ job, result })
      )
    );

    const allPromises = [
      ...queryExportPromises,
      ...tableExportPromises,
      ...vdbExportPromises,
    ];

    await Promise.all(allPromises);

    const totalPassed =
      passedJobs.queries.length +
      passedJobs.tables.length +
      passedJobs.vdbs.length;
    const totalFailed =
      failedJobs.queries.length +
      failedJobs.tables.length +
      failedJobs.vdbs.length;

    return {
      response: {
        success: true, // FIXME: seems unnecessary, just here for consistency with other (export) plugins
        passedJobs,
      },
      error:
        totalFailed > 0
          ? {
              error: `${totalFailed} / ${
                totalFailed + totalPassed
              } jobs failed`,
              failedJobs,
            }
          : null,
      info: {
        allPassed: totalFailed === 0, // note: true also if no jobs were run
        somePassed: totalFailed > 0 && totalPassed > 0,
        allFailed: totalPassed === 0 && totalFailed > 0,
        totalPassed,
        totalFailed,
        startExportInfo,
      },
    };
  }

  protected async startExport(
    sourceOptions: ExportToSeafowlSourceOptions,
    destOptions: ExportToSeafowlDestOptions
  ) {
    return this.graphqlClient.send<
      StartExportToSeafowlJobMutation,
      StartExportToSeafowlJobMutationVariables
    >(
      gql`
        mutation StartExportToSeafowlJob(
          $queries: [SeafowlExportQuerySourceDestinationTupleInput!] = null
          $tables: [SeafowlExportTableSourceDestinationTupleInput!] = null
          $vdbs: [SeafowlExportVDBSourceDestinationTupleInput!] = null
          $seafowlInstance: SeafowlInstanceExportInput! = { selfHosted: null }
        ) {
          exportToSeafowl(
            queries: $queries
            tables: $tables
            vdbs: $vdbs
            seafowlInstance: $seafowlInstance
          ) {
            tables {
              jobId
              sourceVdbId
              sourceNamespace
              sourceRepository
              sourceTable
            }
            queries {
              jobId
              sourceVdbId
              sourceQuery
            }
            vdbs {
              jobId
              sourceVdbId
            }
          }
        }
      `,
      {
        queries: sourceOptions.queries ?? [],
        tables: sourceOptions.tables ?? [],
        vdbs: sourceOptions.vdbs ?? [],
        seafowlInstance: destOptions.seafowlInstance ?? { selfHosted: null },
      }
    );
  }
}

export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;
